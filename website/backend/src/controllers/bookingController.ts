import { Response } from 'express';
import { pool } from '../db/pool';
import { AuthRequest } from '../middleware/auth';
import { generateBookingNumber } from '../utils/generateNumbers';
import { findOrCreateErpCustomer } from '../services/customerLink';
import { findBestWebsitePromotion, recordWebsitePromotionUsage } from '../services/websitePromotionEngine';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createBooking(req: AuthRequest, res: Response): Promise<void> {
  if (!req.customer) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { variantId, startDate, endDate, notes } = req.body ?? {};
  const quantity = Number(req.body?.quantity ?? 1);

  if (!variantId || !startDate || !endDate) {
    res.status(400).json({ error: 'Variant, start date, and end date are required' });
    return;
  }
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || startDate > endDate) {
    res.status(400).json({ error: 'Invalid date range' });
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    res.status(400).json({ error: 'Invalid quantity' });
    return;
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

    const variantRes = await client.query(
      `SELECT pv.*, p.name AS product_name, p.type AS product_type, p.category_id AS category_id,
              p.rental_price_per_day AS product_rental_price_per_day
       FROM product_variants pv JOIN products p ON p.id = pv.product_id
       WHERE pv.id = $1`,
      [variantId]
    );
    const variant = variantRes.rows[0];
    if (!variant) throw new Error('Product variant not found');

    const isRentEligible = variant.product_type === 'rental' || variant.sku?.endsWith('-R');
    if (!isRentEligible) throw new Error(`"${variant.product_name}" is not available for rent`);

    // Date-range-aware availability — same overlap math as GET /products?context=rent,
    // so a far-future booking isn't blocked just because units are out right now.
    const availRes = await client.query(
      `WITH active_bookings AS (
         SELECT ri.product_variant_id, SUM(ri.quantity) AS total_booked
         FROM rental_items ri
         JOIN rentals r ON r.id = ri.rental_id
         WHERE r.status NOT IN ('returned', 'completed', 'cancelled') AND ri.is_returned = false
         GROUP BY ri.product_variant_id
       ),
       overlap_bookings AS (
         SELECT ri.product_variant_id, SUM(ri.quantity) AS booked_qty
         FROM rental_items ri
         JOIN rentals r ON r.id = ri.rental_id
         WHERE r.rental_start_date <= $3 AND r.rental_end_date >= $2
           AND r.status NOT IN ('returned', 'completed', 'cancelled') AND ri.is_returned = false
         GROUP BY ri.product_variant_id
       )
       SELECT GREATEST(0, pv.available_for_rent + COALESCE(ab.total_booked, 0) - COALESCE(ob.booked_qty, 0)) AS available_qty
       FROM product_variants pv
       LEFT JOIN active_bookings ab ON ab.product_variant_id = pv.id
       LEFT JOIN overlap_bookings ob ON ob.product_variant_id = pv.id
       WHERE pv.id = $1`,
      [variantId, startDate, endDate]
    );
    const availableQty = availRes.rows[0]?.available_qty ?? 0;
    if (availableQty < quantity) {
      throw new Error(
        `Only ${availableQty} unit(s) of "${variant.product_name}"${variant.size ? ` (size ${variant.size})` : ''} available for these dates`
      );
    }

    // Same day-count convention as the frontend's date picker (inclusive of both ends).
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    const days = Math.max(1, Math.round(ms / 86400000) + 1);
    const pricePerDay = parseFloat(
      variant.rental_price_per_day ?? variant.product_rental_price_per_day ?? '0'
    );
    const totalCost = pricePerDay * quantity * days;

    const countRes = await client.query<{ count: string }>(`SELECT COUNT(*) FROM rentals`);
    const bookingNumber = generateBookingNumber(parseInt(countRes.rows[0].count, 10) + 1);

    // Website-only automatic promotions — see checkoutController.ts for the
    // full rationale. No codes; scope 'rental', base amount is the gross
    // rental cost, category comes from the booked product.
    const promotion = await findBestWebsitePromotion(client, 'rental', [
      { categoryId: variant.category_id, amount: totalCost },
    ]);
    const discountAmount = promotion?.discount ?? 0;

    // Website bookings only ever reserve — no payment is collected here.
    // Pickup, deposit/ID verification, and billing all happen in person at
    // the shop, handled by staff through the existing ERP rental workflow
    // (status transitions from 'reserved' onward, addPayment, etc.).
    // total_rental_cost stores the GROSS cost; discount_amount is separate
    // (net = total_rental_cost - discount_amount) — same convention as the ERP.
    const rentalRes = await client.query(
      `INSERT INTO rentals (
         booking_number, customer_id, status, rental_start_date, event_date, rental_end_date,
         advance_payment, total_rental_cost, discount_amount, notes, created_by
       ) VALUES ($1,$2,'reserved',$3,$3,$4,0,$5,$6,$7,NULL)
       RETURNING *`,
      [bookingNumber, customerId, startDate, endDate, totalCost, discountAmount, notes || null]
    );
    const rental = rentalRes.rows[0];

    await client.query(
      `INSERT INTO rental_items (rental_id, product_variant_id, quantity, rental_price_per_day)
       VALUES ($1, $2, $3, $4)`,
      [rental.id, variantId, quantity, pricePerDay]
    );

    // Guarded decrement — identical predicate to the ERP's createRental.
    const stockRes = await client.query(
      `UPDATE product_variants
       SET available_for_rent = available_for_rent - $1, stock_quantity = stock_quantity - $1, updated_at = NOW()
       WHERE id = $2 AND available_for_rent >= $1
       RETURNING id`,
      [quantity, variantId]
    );
    if (stockRes.rowCount === 0) {
      throw new Error(`"${variant.product_name}" is no longer available right now`);
    }

    await client.query(
      `INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, reference_id, reference_type, created_by)
       VALUES ($1, 'rental_out', $2, 'Website booking', $3, 'rental', NULL)`,
      [variantId, quantity, rental.id]
    );

    if (promotion) {
      await recordWebsitePromotionUsage(client, promotion, { rentalId: rental.id });
    }

    await client.query('COMMIT');
    res.status(201).json({
      rental,
      days,
      pricePerDay,
      totalCost,
      netCost: totalCost - discountAmount,
      appliedPromotion: promotion ? { title: promotion.title, discount: promotion.discount } : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Booking failed';
    res.status(400).json({ error: message });
  } finally {
    client.release();
  }
}
