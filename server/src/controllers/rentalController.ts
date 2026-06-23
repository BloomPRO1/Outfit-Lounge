import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { generateBookingNumber } from '../utils/generateSKU';
import {
  sendSmsAndWhatsapp,
  buildBookingConfirmationMessage,
  buildReadyForPickupMessage,
  buildPickedUpMessage,
  buildReturnReminderMessage,
} from '../services/notificationService';

export async function getRentals(req: Request, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);
  const { status, customerId, search, fromDate, toDate } = req.query;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let pi = 1;

  if (status) {
    const statuses = (status as string).split(',');
    whereClause += ` AND r.status = ANY($${pi++})`;
    params.push(statuses);
  }
  if (customerId) {
    whereClause += ` AND r.customer_id = $${pi++}`;
    params.push(customerId);
  }
  if (search) {
    whereClause += ` AND (r.booking_number ILIKE $${pi} OR c.name ILIKE $${pi} OR c.phone ILIKE $${pi})`;
    params.push(`%${search}%`);
    pi++;
  }
  if (fromDate) {
    whereClause += ` AND r.rental_start_date >= $${pi++}`;
    params.push(fromDate);
  }
  if (toDate) {
    whereClause += ` AND r.rental_start_date <= $${pi++}`;
    params.push(toDate);
  }

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM rentals r JOIN customers c ON c.id = r.customer_id ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);

  const dataRes = await db.query(`
    SELECT r.*,
           c.name as customer_name, c.phone as customer_phone,
           COUNT(ri.id) as item_count,
           u.name as created_by_name
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    LEFT JOIN rental_items ri ON ri.rental_id = r.id
    LEFT JOIN users u ON u.id = r.created_by
    ${whereClause}
    GROUP BY r.id, c.name, c.phone, u.name
    ORDER BY r.created_at DESC
    LIMIT $${pi} OFFSET $${pi + 1}
  `, [...params, limit, offset]);

  res.json(paginatedResponse(dataRes.rows, total, { page, limit, offset }));
}

export async function getRentalById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const rentalRes = await db.query(`
    SELECT r.*, c.name as customer_name, c.phone as customer_phone,
           c.whatsapp as customer_whatsapp, c.email as customer_email,
           u.name as created_by_name
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    LEFT JOIN users u ON u.id = r.created_by
    WHERE r.id = $1
  `, [id]);

  if (!rentalRes.rows[0]) {
    res.status(404).json({ error: 'Rental not found' });
    return;
  }

  const itemsRes = await db.query(`
    SELECT ri.*,
           p.name as product_name, p.sku as product_sku,
           p.selling_price as product_selling_price,
           p.type as product_type,
           pv.size, pv.color, pv.material, pv.sku as variant_sku,
           CASE WHEN pi.id IS NOT NULL THEN '/api/products/' || p.id::text || '/image' ELSE NULL END as product_image
    FROM rental_items ri
    JOIN product_variants pv ON pv.id = ri.product_variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
    WHERE ri.rental_id = $1
  `, [id]);

  const paymentsRes = await db.query(`
    SELECT p.*, u.name as recorded_by
    FROM payments p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.rental_id = $1
    ORDER BY p.created_at DESC
  `, [id]);

  const finesRes = await db.query(
    `SELECT * FROM fine_transactions WHERE rental_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  const notifRes = await db.query(
    `SELECT * FROM notification_logs WHERE rental_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  // Auto-complete: if rental is stuck in 'returned' and all fines + balance are settled, upgrade
  let rental = rentalRes.rows[0];
  if (rental.status === 'returned') {
    const unpaidFines = finesRes.rows.filter((f: any) => !f.is_paid).length;
    const paidTowardRentalRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE rental_id = $1 AND payment_type IN ('advance', 'balance', 'rental')`,
      [id]
    );
    const paidTowardRental = parseFloat(paidTowardRentalRes.rows[0].paid);
    const netCost = parseFloat(rental.total_rental_cost) - parseFloat(rental.discount_amount || '0');
    const balanceCleared = paidTowardRental >= netCost - 0.005;
    if (unpaidFines === 0 && balanceCleared) {
      await db.query(
        `UPDATE rentals SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      rental = { ...rental, status: 'completed' };
    }
  }

  res.json({
    ...rental,
    items: itemsRes.rows,
    payments: paymentsRes.rows,
    fines: finesRes.rows,
    notifications: notifRes.rows,
  });
}

export async function createRental(req: AuthRequest, res: Response): Promise<void> {
  const {
    customerId, rentalStartDate, eventDate, rentalEndDate,
    items, advancePayment,
    discountAmount, notes, eventType, paymentMethod,
    promotionId, promoCode,
    securityType, securityDeposit, securityIdNumber,
  } = req.body;

  if (!customerId || !rentalStartDate || !eventDate || !rentalEndDate || !items?.length) {
    res.status(400).json({ error: 'Customer, pickup date, event date, return date, and at least one item are required' });
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Generate booking number
    const countRes = await client.query(`SELECT COUNT(*) FROM rentals`);
    const seq = parseInt(countRes.rows[0].count) + 1;
    const bookingNumber = generateBookingNumber(seq);

    // Calculate total rental cost: event_date → return_date (pickup date is NOT used for billing)
    const eventDateObj = new Date(eventDate);
    const endDate = new Date(rentalEndDate);
    const days = Math.max(1, Math.ceil((endDate.getTime() - eventDateObj.getTime()) / (1000 * 60 * 60 * 24)));

    let totalCost = 0;

    for (const item of items) {
      const variantRes = await client.query(
        `SELECT * FROM product_variants WHERE id = $1`,
        [item.variantId]
      );
      if (!variantRes.rows[0]) throw new Error(`Variant ${item.variantId} not found`);
      const variant = variantRes.rows[0];

      const pricePerDay = item.rentalPricePerDay || variant.rental_price_per_day;
      totalCost += pricePerDay * item.quantity * days;
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
          AND (scope = 'rental' OR scope = 'both')
          AND (max_usage_count IS NULL OR usage_count < max_usage_count)
        FOR UPDATE
      `, [promotionId]);

      if (!promoRes.rows[0]) throw new Error('Selected promotion is no longer valid.');
      const promo = promoRes.rows[0];

      if (promo.min_order_amount && totalCost < promo.min_order_amount) {
        throw new Error(`Rental total must be at least LKR ${promo.min_order_amount} for this promotion.`);
      }

      if (promo.type === 'percentage') {
        promotionDiscount = totalCost * (parseFloat(promo.percentage_value) / 100);
      } else if (promo.type === 'flat_amount') {
        promotionDiscount = Math.min(parseFloat(promo.flat_amount_value), totalCost);
      } else if (promo.type === 'buy_x_get_y') {
        const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
        if (totalQty >= promo.buy_quantity) {
          const cheapestDailyRate = Math.min(
            ...items.map((i: any) => parseFloat(i.rentalPricePerDay || 0))
          );
          promotionDiscount = promo.get_quantity * cheapestDailyRate * days;
        }
      } else if (promo.type === 'free_item') {
        const fvRes = await client.query(
          `SELECT rental_price_per_day FROM product_variants WHERE id = $1`,
          [promo.free_variant_id]
        );
        if (fvRes.rows[0]) {
          promotionDiscount = parseFloat(fvRes.rows[0].rental_price_per_day || '0') * days;
        }
      }

      promotionDiscount = Math.max(0, Math.min(promotionDiscount, totalCost));
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
          AND (scope = 'rental' OR scope = 'both')
        FOR UPDATE
      `, [promoCode]);

      if (!codeRes.rows[0]) throw new Error('Invalid or inactive promotion code.');
      const pc = codeRes.rows[0];

      if (pc.discount_type === 'percentage') {
        promoCodeDiscount = totalCost * (parseFloat(pc.discount_value) / 100);
      } else if (pc.discount_type === 'flat_amount') {
        promoCodeDiscount = Math.min(parseFloat(pc.discount_value), totalCost);
      }

      promoCodeDiscount = Math.max(0, promoCodeDiscount);
      resolvedPromoCodeId = pc.id;

      await client.query(
        `UPDATE promotion_codes SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
        [pc.id]
      );
    }

    const totalDiscountAmount = (discountAmount || 0) + promotionDiscount + promoCodeDiscount;

    const rentalRes = await client.query(`
      INSERT INTO rentals (
        booking_number, customer_id, status, rental_start_date, event_date, rental_end_date,
        advance_payment, total_rental_cost, discount_amount,
        notes, event_type, created_by,
        security_type, security_deposit, security_id_number
      ) VALUES ($1,$2,'reserved',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      bookingNumber, customerId, rentalStartDate, eventDate, rentalEndDate,
      advancePayment || 0, totalCost,
      totalDiscountAmount, notes || null, eventType || null, req.user?.id,
      securityType || null, securityDeposit || 0, securityIdNumber || null,
    ]);

    const rental = rentalRes.rows[0];

    // Insert rental items
    for (const item of items) {
      const variantRes = await client.query(
        `SELECT * FROM product_variants WHERE id = $1`,
        [item.variantId]
      );
      const variant = variantRes.rows[0];
      const pricePerDay = item.rentalPricePerDay || variant.rental_price_per_day;

      await client.query(`
        INSERT INTO rental_items (rental_id, product_variant_id, quantity, rental_price_per_day)
        VALUES ($1, $2, $3, $4)
      `, [rental.id, item.variantId, item.quantity || 1, pricePerDay]);

      // Update stock (both total and available_for_rent)
      await client.query(`
        UPDATE product_variants
        SET available_for_rent = available_for_rent - $1,
            stock_quantity = stock_quantity - $1,
            updated_at = NOW()
        WHERE id = $2 AND available_for_rent >= $1
      `, [item.quantity || 1, item.variantId]);

      // Record inventory movement
      await client.query(`
        INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, reference_id, reference_type, created_by)
        VALUES ($1, 'rental_out', $2, 'Rental booking', $3, 'rental', $4)
      `, [item.variantId, item.quantity || 1, rental.id, req.user?.id]);
    }

    // Record advance payment — use 'full_payment' if the paid amount covers the net total
    if (advancePayment > 0) {
      const netTotal = totalCost - totalDiscountAmount;
      const paidType = advancePayment >= netTotal ? 'full_payment' : 'advance';
      await client.query(`
        INSERT INTO payments (rental_id, amount, payment_method, payment_type, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [rental.id, advancePayment, paymentMethod || 'cash', paidType, req.user?.id]);
    }

    // Record promotion usage
    if (resolvedPromotionId && promotionDiscount > 0) {
      await client.query(`
        INSERT INTO promotion_usages (promotion_id, rental_id, discount_amount, used_by)
        VALUES ($1, $2, $3, $4)
      `, [resolvedPromotionId, rental.id, promotionDiscount, req.user?.id]);
    }

    // Record promo code usage
    if (resolvedPromoCodeId && promoCodeDiscount > 0) {
      await client.query(`
        INSERT INTO promotion_code_usages (promotion_code_id, rental_id, discount_amount, used_by)
        VALUES ($1, $2, $3, $4)
      `, [resolvedPromoCodeId, rental.id, promoCodeDiscount, req.user?.id]);
    }

    await client.query('COMMIT');

    // Send booking confirmation notification
    const customerRes = await db.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
    const customer = customerRes.rows[0];
    if (customer?.phone || customer?.whatsapp) {
      const message = buildBookingConfirmationMessage({
        customerName: customer.name,
        bookingNumber,
        startDate: fmtDate(rentalStartDate),
        eventDate: fmtDate(eventDate),
        endDate: fmtDate(rentalEndDate),
        totalCost: totalCost - totalDiscountAmount,
        advancePaid: advancePayment || 0,
        securityType: securityType || null,
        securityDeposit: securityDeposit || 0,
        securityIdNumber: securityIdNumber || null,
      });
      await sendSmsAndWhatsapp({
        rentalId: rental.id,
        customerId,
        type: 'booking_confirmed',
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        message,
      });
    }

    res.status(201).json(rental);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

/** Format a pg DATE value (Date object or "YYYY-MM-DD" string) without timezone artefacts */
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const iso = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
  const [y, m, day] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${String(day).padStart(2,'0')} ${months[m - 1]} ${y}`;
}

/** Convert 24h "HH:MM" to "H:MM AM/PM" */
function fmtTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
}

export async function updateRentalStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, notes, pickupTime, securityType, securityDeposit, securityIdNumber } = req.body;

  const validStatuses = ['reserved', 'ready_for_pickup', 'picked_up', 'returned', 'late_return', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    let result;
    if (status === 'picked_up' && securityType && securityType !== 'none') {
      result = await client.query(`
        UPDATE rentals
        SET status = $1, notes = COALESCE($2, notes),
            security_type = $4::text,
            security_deposit = CASE WHEN $4::text = 'deposit' THEN $5::numeric ELSE security_deposit END,
            security_id_number = CASE WHEN $4::text = 'id_card' THEN $6::text ELSE security_id_number END,
            updated_at = NOW()
        WHERE id = $3 RETURNING *
      `, [status, notes, id, securityType, securityDeposit || 0, securityIdNumber || null]);
    } else {
      result = await client.query(`
        UPDATE rentals SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
        WHERE id = $3 RETURNING *
      `, [status, notes, id]);
    }

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    // Restore inventory when rental is cancelled
    if (status === 'cancelled') {
      const items = await client.query(
        `SELECT product_variant_id, quantity FROM rental_items WHERE rental_id = $1 AND is_returned = false`,
        [id]
      );
      for (const item of items.rows) {
        await client.query(`
          UPDATE product_variants
          SET available_for_rent = available_for_rent + $1,
              stock_quantity = stock_quantity + $1,
              updated_at = NOW()
          WHERE id = $2
        `, [item.quantity, item.product_variant_id]);
      }
    }

    await client.query('COMMIT');

    const rental = result.rows[0];

    // Send status-change notifications
    if (status === 'ready_for_pickup' || status === 'picked_up') {
      const customerRes = await db.query(
        `SELECT * FROM customers WHERE id = $1`, [rental.customer_id]
      );
      const customer = customerRes.rows[0];

      if (customer?.phone || customer?.whatsapp) {
        const isReady = status === 'ready_for_pickup';
        const totalCost = parseFloat(rental.total_rental_cost || '0');
        const discountAmt = parseFloat(rental.discount_amount || '0');
        const advance = parseFloat(rental.advance_payment || '0');
        const extraPaidRes = await db.query(
          `SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE rental_id = $1 AND payment_type = 'rental'`,
          [id]
        );
        const extraPaid = parseFloat(extraPaidRes.rows[0].total || '0');
        const balance = Math.max(0, totalCost - discountAmt - advance - extraPaid);

        const pickupDateStr = fmtDate(rental.rental_start_date);
        const returnDateStr = fmtDate(rental.rental_end_date);
        const pickupDateWithTime = pickupTime
          ? `${pickupDateStr} at ${fmtTime(pickupTime)}`
          : pickupDateStr;

        const message = isReady
          ? buildReadyForPickupMessage({
              customerName: customer.name,
              bookingNumber: rental.booking_number,
              pickupDate: pickupDateWithTime,
              returnDate: returnDateStr,
              advancePaid: advance,
              balanceAmount: balance,
            })
          : buildPickedUpMessage({
              customerName: customer.name,
              bookingNumber: rental.booking_number,
              returnDate: returnDateStr,
            });

        await sendSmsAndWhatsapp({
          rentalId: rental.id,
          customerId: rental.customer_id,
          type: status,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          message,
        });
      }
    }

    res.json(rental);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function sendReturnReminder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT r.booking_number, r.rental_end_date, r.customer_id,
             r.total_rental_cost, r.discount_amount, r.advance_payment,
             c.name AS customer_name, c.phone, c.whatsapp,
             COALESCE((
               SELECT SUM(amount) FROM payments
               WHERE rental_id = r.id AND payment_type = 'rental'
             ), 0) AS extra_paid
      FROM rentals r
      JOIN customers c ON c.id = r.customer_id
      WHERE r.id = $1
    `, [id]);

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const row = result.rows[0];
    if (!row.phone && !row.whatsapp) {
      res.status(400).json({ error: 'Customer has no phone number on file' });
      return;
    }

    const returnDate = fmtDate(row.rental_end_date);
    const balanceDue = Math.max(0,
      parseFloat(row.total_rental_cost) -
      parseFloat(row.discount_amount || '0') -
      parseFloat(row.advance_payment || '0') -
      parseFloat(row.extra_paid || '0')
    );

    const message = buildReturnReminderMessage({
      customerName: row.customer_name,
      bookingNumber: row.booking_number,
      returnDate,
      balanceDue,
    });

    await sendSmsAndWhatsapp({
      rentalId: id,
      customerId: row.customer_id,
      type: 'return_reminder',
      phone: row.phone,
      whatsapp: row.whatsapp,
      message,
    });

    res.json({ sent: true });
  } catch (err: any) {
    console.error('[sendReturnReminder]', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function addPayment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { amount, paymentMethod, paymentType, notes } = req.body;

  const result = await db.query(`
    INSERT INTO payments (rental_id, amount, payment_method, payment_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [id, amount, paymentMethod || 'cash', paymentType || 'balance', notes, req.user?.id]);

  res.status(201).json(result.rows[0]);
}

export async function getAvailability(req: AuthRequest, res: Response): Promise<void> {
  const { date, search } = req.query as { date?: string; search?: string };

  if (!date) {
    res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    return;
  }

  try {
    const params: any[] = [date, date];
    let searchClause = '';
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      const pi = params.length;
      searchClause = `AND (p.name ILIKE $${pi} OR pv.size ILIKE $${pi} OR pv.color ILIKE $${pi} OR pv.sku ILIKE $${pi})`;
    }

    const result = await db.query<any>(`
      SELECT
        p.id           AS product_id,
        p.name         AS product_name,
        pc.name        AS category_name,
        CASE WHEN pi_img.has_image THEN '/api/products/' || p.id::text || '/image' ELSE NULL END AS product_image,
        pv.id          AS variant_id,
        pv.sku,
        pv.size,
        pv.color,
        pv.material,
        COALESCE(pv.rental_price_per_day, p.rental_price_per_day, 0) AS price_per_day,
        -- rental_stock = what is currently free + all actively booked (= true total rental capacity)
        (pv.available_for_rent + COALESCE(all_active.total_booked, 0))::int AS rental_stock,
        COALESCE(booked.booked_qty, 0)::int AS booked_qty,
        GREATEST(0, pv.available_for_rent + COALESCE(all_active.total_booked, 0) - COALESCE(booked.booked_qty, 0))::int AS available_qty
      FROM products p
      JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT true as has_image FROM product_images
        WHERE product_id = p.id AND is_primary = true
        LIMIT 1
      ) pi_img ON true
      -- all units currently out on ANY active rental (not date-filtered)
      LEFT JOIN (
        SELECT ri.product_variant_id, SUM(ri.quantity) AS total_booked
        FROM rental_items ri
        JOIN rentals r ON r.id = ri.rental_id
        WHERE r.status NOT IN ('returned', 'completed', 'cancelled')
          AND ri.is_returned = false
        GROUP BY ri.product_variant_id
      ) all_active ON all_active.product_variant_id = pv.id
      -- units booked on the requested date specifically
      LEFT JOIN (
        SELECT ri.product_variant_id, SUM(ri.quantity) AS booked_qty
        FROM rental_items ri
        JOIN rentals r ON r.id = ri.rental_id
        WHERE r.rental_start_date <= $1
          AND r.rental_end_date >= $2
          AND r.status NOT IN ('returned', 'completed', 'cancelled')
          AND ri.is_returned = false
        GROUP BY ri.product_variant_id
      ) booked ON booked.product_variant_id = pv.id
      WHERE p.type IN ('rental', 'both')
        AND p.is_active = true
        ${searchClause}
      ORDER BY p.name, pv.size NULLS LAST, pv.color NULLS LAST
    `, params);

    res.json(result.rows);
  } catch (err: any) {
    console.error('[Availability] Query error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function getUpcomingReturns(_req: Request, res: Response): Promise<void> {
  const result = await db.query(`
    SELECT r.*, c.name as customer_name, c.phone as customer_phone,
           COUNT(ri.id) as item_count,
           CURRENT_DATE - r.rental_end_date as days_overdue
    FROM rentals r
    JOIN customers c ON c.id = r.customer_id
    LEFT JOIN rental_items ri ON ri.rental_id = r.id
    WHERE r.status IN ('picked_up', 'late_return')
      AND r.rental_end_date <= CURRENT_DATE + INTERVAL '3 days'
    GROUP BY r.id, c.name, c.phone
    ORDER BY r.rental_end_date ASC
    LIMIT 20
  `);
  res.json(result.rows);
}
