import { Response } from 'express';
import { pool } from '../db/pool';
import { AuthRequest } from '../middleware/auth';
import { generateSaleNumber } from '../utils/generateNumbers';
import { findOrCreateErpCustomer } from '../services/customerLink';
import {
  findBestAutomaticPromotion,
  applyPromotionUsage,
  applyPromoCode,
  applyPromoCodeUsage,
} from '../services/promotionEngine';

type CartItemInput = { variantId: string; quantity: number };

export async function checkout(req: AuthRequest, res: Response): Promise<void> {
  if (!req.customer) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const items: CartItemInput[] = Array.isArray(req.body?.items) ? req.body.items : [];
  const notes = typeof req.body?.notes === 'string' ? req.body.notes : null;
  const promoCodeInput = typeof req.body?.promoCode === 'string' ? req.body.promoCode.trim() : null;

  if (items.length === 0) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }
  for (const item of items) {
    if (!item.variantId || !item.quantity || item.quantity < 1) {
      res.status(400).json({ error: 'Invalid cart item' });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const websiteCustomerRes = await client.query(
      `SELECT name, email, phone FROM website_customers WHERE id = $1`,
      [req.customer.id]
    );
    const websiteCustomer = websiteCustomerRes.rows[0];
    if (!websiteCustomer) throw new Error('Account not found');

    const customerId = await findOrCreateErpCustomer(client, websiteCustomer);

    // Sale number: MAX-sequence per month, same scheme as the ERP's POS checkout.
    const prefix = `SALE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
    const seqRes = await client.query<{ next_seq: string }>(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(sale_number, '-', 3) AS INTEGER)), 0) + 1 AS next_seq
       FROM sales WHERE sale_number LIKE $1`,
      [`${prefix}%`]
    );
    const saleNumber = generateSaleNumber(parseInt(seqRes.rows[0].next_seq, 10));

    let subtotal = 0;
    const itemDetails: Array<{
      variantId: string;
      productName: string;
      variantInfo: string;
      quantity: number;
      unitPrice: number;
      itemSubtotal: number;
    }> = [];

    for (const item of items) {
      const varRes = await client.query(
        `SELECT pv.*, p.name AS product_name, p.selling_price AS product_selling_price, p.type AS product_type
         FROM product_variants pv JOIN products p ON p.id = pv.product_id
         WHERE pv.id = $1`,
        [item.variantId]
      );
      const variant = varRes.rows[0];
      if (!variant) throw new Error('One of the items in your cart no longer exists');
      if (variant.product_type !== 'sale' && variant.product_type !== 'both') {
        throw new Error(`"${variant.product_name}" is not available for sale`);
      }

      const price = parseFloat(variant.selling_price ?? variant.product_selling_price ?? '0');
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      itemDetails.push({
        variantId: item.variantId,
        productName: variant.product_name,
        variantInfo: [variant.size, variant.color].filter(Boolean).join(' / '),
        quantity: item.quantity,
        unitPrice: price,
        itemSubtotal,
      });
    }

    // Best currently-active automatic promotion (scope pos/both), auto-picked
    // since there's no staff at a register to choose one — plus an optional
    // customer-entered promo code, applied additively (both rules mirror the
    // ERP's POS checkout).
    const autoPromotion = await findBestAutomaticPromotion(
      client,
      'pos',
      subtotal,
      itemDetails.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity }))
    );
    const promoCode = promoCodeInput
      ? await applyPromoCode(client, promoCodeInput, 'pos', subtotal)
      : null;

    const discountAmount = (autoPromotion?.discount ?? 0) + (promoCode?.discount ?? 0);
    const totalAmount = Math.max(0, subtotal - discountAmount);

    // No real payment gateway yet — the order is recorded as paid in full
    // immediately (payment_method='card'), status='pending' (awaiting
    // fulfillment/pickup, distinct from an in-store POS sale which is
    // 'completed' the moment goods are handed over).
    const saleRes = await client.query(
      `INSERT INTO sales (
         sale_number, customer_id, subtotal, discount_amount, tax_amount,
         total_amount, amount_paid, change_amount, payment_method, status, notes, created_by
       ) VALUES ($1,$2,$3,$4,0,$5,$5,0,'card','pending',$6,NULL)
       RETURNING *`,
      [saleNumber, customerId, subtotal, discountAmount, totalAmount, notes]
    );
    const sale = saleRes.rows[0];

    for (const item of itemDetails) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_variant_id, product_name, variant_info, quantity, unit_price, discount, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7)`,
        [
          sale.id,
          item.variantId,
          item.productName,
          item.variantInfo,
          item.quantity,
          item.unitPrice,
          item.itemSubtotal,
        ]
      );

      // Guarded stock decrement — identical predicate to the ERP's POS checkout:
      // only sell from the portion not already carved out for rental.
      const stockRes = await client.query(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2 AND (stock_quantity - available_for_rent) >= $1
         RETURNING id`,
        [item.quantity, item.variantId]
      );
      if (stockRes.rowCount === 0) {
        throw new Error(`Insufficient stock for "${item.productName}"`);
      }

      await client.query(
        `INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, reference_id, reference_type, created_by)
         VALUES ($1, 'out', $2, 'Website order', $3, 'sale', NULL)`,
        [item.variantId, item.quantity, sale.id]
      );
    }

    if (autoPromotion) {
      await applyPromotionUsage(client, autoPromotion, { saleId: sale.id });
    }
    if (promoCode) {
      await applyPromoCodeUsage(client, promoCode, { saleId: sale.id });
    }

    await client.query(
      `INSERT INTO payments (sale_id, amount, payment_method, payment_type, created_by)
       VALUES ($1, $2, 'card', 'full', NULL)`,
      [sale.id, totalAmount]
    );

    await client.query('COMMIT');
    res.status(201).json({
      sale,
      items: itemDetails,
      appliedPromotion: autoPromotion ? { name: autoPromotion.name, discount: autoPromotion.discount } : null,
      appliedPromoCode: promoCode ? { code: promoCode.code, discount: promoCode.discount } : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Checkout failed';
    res.status(400).json({ error: message });
  } finally {
    client.release();
  }
}
