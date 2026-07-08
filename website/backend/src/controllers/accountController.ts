import { Response } from 'express';
import { pool } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

export async function getAccountSummary(req: AuthRequest, res: Response): Promise<void> {
  if (!req.customer) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const websiteCustomerRes = await pool.query(
    `SELECT email FROM website_customers WHERE id = $1`,
    [req.customer.id]
  );
  const email = websiteCustomerRes.rows[0]?.email;
  if (!email) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  // The website account isn't FK-linked to `customers` — find the matching
  // ERP customer record the same way checkout/booking do (by email). If the
  // customer has never checked out or booked yet, there's no match at all.
  const customerRes = await pool.query(`SELECT id FROM customers WHERE lower(email) = lower($1)`, [
    email,
  ]);
  const customerId = customerRes.rows[0]?.id;
  if (!customerId) {
    res.json({ orders: [], rentals: [] });
    return;
  }

  const ordersRes = await pool.query(
    `SELECT s.id, s.sale_number, s.status, s.subtotal, s.discount_amount, s.total_amount, s.created_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'productName', si.product_name, 'variantInfo', si.variant_info,
                 'quantity', si.quantity, 'unitPrice', si.unit_price, 'subtotal', si.subtotal
               ) ORDER BY si.id)
               FROM sale_items si WHERE si.sale_id = s.id), '[]'
            ) AS items,
            COALESCE(
              (SELECT json_agg(json_build_object('title', wp.title, 'discount', wpu.discount_amount))
               FROM website_promotion_usages wpu JOIN website_promotions wp ON wp.id = wpu.website_promotion_id
               WHERE wpu.sale_id = s.id), '[]'
            ) AS promotion_discounts
     FROM sales s
     WHERE s.customer_id = $1
     ORDER BY s.created_at DESC`,
    [customerId]
  );

  const rentalsRes = await pool.query(
    `SELECT r.id, r.booking_number, r.status, r.rental_start_date, r.rental_end_date,
            r.total_rental_cost, r.discount_amount, r.created_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'productName', p.name, 'size', pv.size, 'color', pv.color,
                 'quantity', ri.quantity, 'pricePerDay', ri.rental_price_per_day, 'isReturned', ri.is_returned
               ) ORDER BY ri.id)
               FROM rental_items ri
               JOIN product_variants pv ON pv.id = ri.product_variant_id
               JOIN products p ON p.id = pv.product_id
               WHERE ri.rental_id = r.id), '[]'
            ) AS items,
            COALESCE(
              (SELECT json_agg(json_build_object('title', wp.title, 'discount', wpu.discount_amount))
               FROM website_promotion_usages wpu JOIN website_promotions wp ON wp.id = wpu.website_promotion_id
               WHERE wpu.rental_id = r.id), '[]'
            ) AS promotion_discounts
     FROM rentals r
     WHERE r.customer_id = $1
     ORDER BY r.created_at DESC`,
    [customerId]
  );

  res.json({ orders: ordersRes.rows, rentals: rentalsRes.rows });
}
