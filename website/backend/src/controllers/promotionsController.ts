import { Request, Response } from 'express';
import { pool } from '../db/pool';

/**
 * Public listing of currently-active, in-window website promotions (see
 * website/database_changes.md — these are entirely separate from the ERP's
 * own promotions/promotion_codes, which stay ERP/in-store only). No promo
 * codes: these auto-apply at checkout/booking based on category/scope/
 * weekend-only targeting the admin configured.
 */
export async function listPromotions(_req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT p.id, p.title, p.description, p.banner_image, p.discount_type, p.discount_value,
            p.scope, p.weekend_only, p.min_order_amount, p.start_date, p.end_date,
            COALESCE(
              (SELECT json_agg(json_build_object('id', pc.id, 'name', pc.name, 'slug', pc.slug))
               FROM product_categories pc WHERE pc.id = ANY(p.category_ids)),
              '[]'
            ) AS categories
     FROM website_promotions p
     WHERE p.is_active = true
       AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
       AND (NOT p.weekend_only OR EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6))
     ORDER BY p.end_date`
  );

  res.json({ promotions: result.rows });
}
