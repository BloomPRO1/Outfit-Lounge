import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateSaleNumber } from '../utils/generateSKU';
import { generatePOSInvoicePDF } from '../services/pdfInvoiceService';

export async function checkout(req: AuthRequest, res: Response): Promise<void> {
  const {
    customerId,
    items,
    discountAmount = 0,
    taxRate = 0,
    paymentMethod = 'cash',
    amountPaid,
    notes,
    promotionId,
    promoCode,
  } = req.body;

  if (!items?.length) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Generate sale number using MAX sequence for current month so that
    // deleting sales never causes duplicate number collisions.
    const prefix = `SALE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
    const seqRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(sale_number, '-', 3) AS INTEGER)), 0) + 1 AS next_seq
       FROM sales WHERE sale_number LIKE $1`,
      [`${prefix}%`],
    );
    const seq = parseInt(seqRes.rows[0].next_seq);
    const saleNumber = generateSaleNumber(seq);

    // Calculate totals
    let subtotal = 0;
    const itemDetails: any[] = [];

    for (const item of items) {
      const varRes = await client.query(`
        SELECT pv.*, p.name as product_name
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id = $1
      `, [item.variantId]);

      if (!varRes.rows[0]) throw new Error(`Product variant ${item.variantId} not found`);
      const variant = varRes.rows[0];

      const price = item.unitPrice || variant.selling_price || 0;
      const itemDiscount = item.discount || 0;
      const itemSubtotal = (price - itemDiscount) * item.quantity;
      subtotal += itemSubtotal;

      itemDetails.push({
        variantId: item.variantId,
        productName: variant.product_name,
        variantInfo: [variant.size, variant.color].filter(Boolean).join(' / '),
        quantity: item.quantity,
        unitPrice: price,
        discount: itemDiscount,
        itemSubtotal,
        stockQty: variant.stock_quantity,
      });
    }

    // ── Promotion resolution ────────────────────────────────────────────────
    let promotionDiscount = 0;
    let resolvedPromotionId: string | null = null;

    if (promotionId) {
      const promoRes = await client.query(`
        SELECT * FROM promotions
        WHERE id = $1
          AND is_active = true
          AND CURRENT_DATE BETWEEN start_date AND end_date
          AND (scope = 'pos' OR scope = 'both')
          AND (max_usage_count IS NULL OR usage_count < max_usage_count)
        FOR UPDATE
      `, [promotionId]);

      if (!promoRes.rows[0]) throw new Error('Selected promotion is no longer valid.');
      const promo = promoRes.rows[0];

      if (promo.min_order_amount && subtotal < promo.min_order_amount) {
        throw new Error(`Order subtotal must be at least LKR ${promo.min_order_amount} for this promotion.`);
      }

      if (promo.type === 'percentage') {
        promotionDiscount = subtotal * (parseFloat(promo.percentage_value) / 100);
      } else if (promo.type === 'flat_amount') {
        promotionDiscount = Math.min(parseFloat(promo.flat_amount_value), subtotal);
      } else if (promo.type === 'buy_x_get_y') {
        const totalQty = itemDetails.reduce((s: number, i: any) => s + i.quantity, 0);
        if (totalQty >= promo.buy_quantity) {
          const cheapestPrice = Math.min(...itemDetails.map((i: any) => i.unitPrice - i.discount));
          promotionDiscount = promo.get_quantity * cheapestPrice;
        }
      } else if (promo.type === 'free_item') {
        const fvRes = await client.query(
          `SELECT selling_price FROM product_variants WHERE id = $1`,
          [promo.free_variant_id]
        );
        if (fvRes.rows[0]) {
          promotionDiscount = parseFloat(fvRes.rows[0].selling_price || '0');
        }
      }

      promotionDiscount = Math.max(0, Math.min(promotionDiscount, subtotal));
      resolvedPromotionId = promotionId;

      await client.query(
        `UPDATE promotions SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
        [promotionId]
      );
      await client.query(`
        UPDATE promotions SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND max_usage_count IS NOT NULL AND usage_count >= max_usage_count
      `, [promotionId]);
    }

    // ── Promo Code resolution ───────────────────────────────────────────────
    let promoCodeDiscount = 0;
    let resolvedPromoCodeId: string | null = null;

    if (promoCode) {
      const codeRes = await client.query(`
        SELECT * FROM promotion_codes
        WHERE UPPER(code) = UPPER($1)
          AND is_active = true
          AND (scope = 'pos' OR scope = 'both')
        FOR UPDATE
      `, [promoCode]);

      if (!codeRes.rows[0]) throw new Error('Invalid or inactive promotion code.');
      const pc = codeRes.rows[0];

      if (pc.discount_type === 'percentage') {
        promoCodeDiscount = subtotal * (parseFloat(pc.discount_value) / 100);
      } else if (pc.discount_type === 'flat_amount') {
        promoCodeDiscount = Math.min(parseFloat(pc.discount_value), subtotal);
      }

      promoCodeDiscount = Math.max(0, promoCodeDiscount);
      resolvedPromoCodeId = pc.id;

      await client.query(
        `UPDATE promotion_codes SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
        [pc.id]
      );
    }

    const totalDiscountAmount = discountAmount + promotionDiscount + promoCodeDiscount;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal - totalDiscountAmount + taxAmount;
    const changeAmount = Math.max(0, (amountPaid || totalAmount) - totalAmount);

    const saleRes = await client.query(`
      INSERT INTO sales (
        sale_number, customer_id, subtotal, discount_amount, tax_amount,
        total_amount, amount_paid, change_amount, payment_method, notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      saleNumber, customerId || null, subtotal, totalDiscountAmount, taxAmount,
      totalAmount, amountPaid || totalAmount, changeAmount,
      paymentMethod, notes || null, req.user?.id,
    ]);

    const sale = saleRes.rows[0];

    // Insert sale items and update stock
    for (const item of itemDetails) {
      await client.query(`
        INSERT INTO sale_items (sale_id, product_variant_id, product_name, variant_info, quantity, unit_price, discount, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [sale.id, item.variantId, item.productName, item.variantInfo, item.quantity, item.unitPrice, item.discount, item.itemSubtotal]);

      // Reduce stock — only from the "for sale" portion
      const stockRes = await client.query(`
        UPDATE product_variants
        SET stock_quantity = stock_quantity - $1,
            updated_at = NOW()
        WHERE id = $2 AND (stock_quantity - available_for_rent) >= $1
        RETURNING id
      `, [item.quantity, item.variantId]);
      if (stockRes.rowCount === 0) {
        throw new Error(`Insufficient sale stock for "${item.productName}". Some units may be reserved for rentals.`);
      }

      // Record inventory movement
      await client.query(`
        INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, reference_id, reference_type, created_by)
        VALUES ($1, 'out', $2, 'POS Sale', $3, 'sale', $4)
      `, [item.variantId, item.quantity, sale.id, req.user?.id]);
    }

    // Record payment
    await client.query(`
      INSERT INTO payments (sale_id, amount, payment_method, payment_type, created_by)
      VALUES ($1, $2, $3, 'full', $4)
    `, [sale.id, amountPaid || totalAmount, paymentMethod, req.user?.id]);

    // Record promotion usage
    if (resolvedPromotionId && promotionDiscount > 0) {
      await client.query(`
        INSERT INTO promotion_usages (promotion_id, sale_id, discount_amount, used_by)
        VALUES ($1, $2, $3, $4)
      `, [resolvedPromotionId, sale.id, promotionDiscount, req.user?.id]);
    }

    // Record promo code usage
    if (resolvedPromoCodeId && promoCodeDiscount > 0) {
      await client.query(`
        INSERT INTO promotion_code_usages (promotion_code_id, sale_id, discount_amount, used_by)
        VALUES ($1, $2, $3, $4)
      `, [resolvedPromoCodeId, sale.id, promoCodeDiscount, req.user?.id]);
    }

    await client.query('COMMIT');

    // Pre-generate and persist the PDF so it's ready for future WhatsApp sharing
    generatePOSInvoicePDF(sale.id).catch(err =>
      console.error('[PDF pre-gen] Failed for sale', sale.id, err)
    );

    // Fetch customer contact details for receipt (used by frontend for WhatsApp/SMS)
    let customerPhone: string | null = null;
    let customerWhatsapp: string | null = null;
    if (customerId) {
      const cRes = await db.query(
        `SELECT phone, whatsapp FROM customers WHERE id = $1`, [customerId]
      );
      customerPhone = cRes.rows[0]?.phone || null;
      customerWhatsapp = cRes.rows[0]?.whatsapp || null;
    }

    res.status(201).json({
      sale,
      items: itemDetails,
      receipt: {
        saleId: sale.id,
        customerId: customerId || null,
        customerPhone,
        customerWhatsapp,
        saleNumber,
        items: itemDetails,
        subtotal,
        discountAmount: totalDiscountAmount,
        promotionDiscount,
        promotionId: resolvedPromotionId,
        taxAmount,
        totalAmount,
        amountPaid: amountPaid || totalAmount,
        changeAmount,
        paymentMethod,
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function getSales(req: Request, res: Response): Promise<void> {
  const { fromDate, toDate } = req.query;
  let whereClause = 'WHERE s.status != \'cancelled\'';
  const params: any[] = [];
  let pi = 1;

  if (fromDate) {
    whereClause += ` AND DATE(s.created_at) >= $${pi++}`;
    params.push(fromDate);
  }
  if (toDate) {
    whereClause += ` AND DATE(s.created_at) <= $${pi++}`;
    params.push(toDate);
  }

  const result = await db.query(`
    SELECT s.*,
           c.name as customer_name,
           u.name as cashier_name,
           COUNT(si.id) as item_count
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN users u ON u.id = s.created_by
    LEFT JOIN sale_items si ON si.sale_id = s.id
    ${whereClause}
    GROUP BY s.id, c.name, u.name
    ORDER BY s.created_at DESC
    LIMIT 50
  `, params);

  res.json(result.rows);
}

export async function getSaleById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const saleRes = await db.query(`
    SELECT s.*, c.name as customer_name, u.name as cashier_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN users u ON u.id = s.created_by
    WHERE s.id = $1
  `, [id]);

  if (!saleRes.rows[0]) {
    res.status(404).json({ error: 'Sale not found' });
    return;
  }

  const itemsRes = await db.query(`
    SELECT si.*, p.name as product_name, pv.size, pv.color, pv.sku as variant_sku,
           pi.url as product_image
    FROM sale_items si
    JOIN product_variants pv ON pv.id = si.product_variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
    WHERE si.sale_id = $1
  `, [id]);

  res.json({ ...saleRes.rows[0], items: itemsRes.rows });
}
