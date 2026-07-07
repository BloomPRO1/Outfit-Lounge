import { Request, Response } from 'express';
import { pool } from '../db/pool';

export async function listPromotions(_req: Request, res: Response): Promise<void> {
  const promotionsRes = await pool.query(
    `SELECT id, name, description, type, scope, percentage_value, flat_amount_value,
            buy_quantity, get_quantity, min_order_amount, end_date
     FROM promotions
     WHERE is_active = true
       AND CURRENT_DATE BETWEEN start_date AND end_date
       AND (max_usage_count IS NULL OR usage_count < max_usage_count)
     ORDER BY end_date`
  );

  const codesRes = await pool.query(
    `SELECT id, code, name, description, discount_type, discount_value, scope
     FROM promotion_codes
     WHERE is_active = true
     ORDER BY created_at DESC`
  );

  res.json({ promotions: promotionsRes.rows, codes: codesRes.rows });
}
