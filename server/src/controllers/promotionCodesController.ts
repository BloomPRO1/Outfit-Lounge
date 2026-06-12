import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function listPromotionCodes(_req: AuthRequest, res: Response): Promise<void> {
  const result = await db.query(`
    SELECT pc.*, u.name AS created_by_name
    FROM promotion_codes pc
    LEFT JOIN users u ON u.id = pc.created_by
    ORDER BY pc.created_at DESC
  `);
  res.json(result.rows);
}

export async function validatePromotionCode(req: AuthRequest, res: Response): Promise<void> {
  const { code, scope } = req.query as { code: string; scope?: string };
  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  const result = await db.query(`
    SELECT * FROM promotion_codes
    WHERE UPPER(code) = UPPER($1)
      AND is_active = true
      AND ($2::text IS NULL OR scope = $2 OR scope = 'both')
  `, [code.trim(), scope || null]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Invalid or inactive promotion code' });
    return;
  }
  res.json(result.rows[0]);
}

export async function createPromotionCode(req: AuthRequest, res: Response): Promise<void> {
  const { code, name, description, discount_type, discount_value, scope = 'both', is_active = true } = req.body;

  if (!code || !name || !discount_type || discount_value == null) {
    res.status(400).json({ error: 'code, name, discount_type, and discount_value are required' });
    return;
  }
  if (!['percentage', 'flat_amount'].includes(discount_type)) {
    res.status(400).json({ error: 'discount_type must be percentage or flat_amount' });
    return;
  }
  if (discount_type === 'percentage' && (parseFloat(discount_value) <= 0 || parseFloat(discount_value) > 100)) {
    res.status(400).json({ error: 'Percentage must be between 0.01 and 100' });
    return;
  }
  if (discount_type === 'flat_amount' && parseFloat(discount_value) <= 0) {
    res.status(400).json({ error: 'Discount amount must be greater than 0' });
    return;
  }

  try {
    const result = await db.query(`
      INSERT INTO promotion_codes (code, name, description, discount_type, discount_value, scope, is_active, created_by)
      VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      code.trim(), name.trim(), description || null,
      discount_type, parseFloat(discount_value), scope, is_active, req.user?.id,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A promotion code with this code already exists' });
      return;
    }
    throw err;
  }
}

export async function updatePromotionCode(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, discount_value, scope, is_active } = req.body;

  const existing = await db.query(`SELECT * FROM promotion_codes WHERE id = $1`, [id]);
  if (!existing.rows[0]) {
    res.status(404).json({ error: 'Promotion code not found' });
    return;
  }

  if (discount_value != null && parseFloat(discount_value) <= 0) {
    res.status(400).json({ error: 'Discount value must be greater than 0' });
    return;
  }

  const result = await db.query(`
    UPDATE promotion_codes SET
      name           = COALESCE($1, name),
      description    = $2,
      discount_value = COALESCE($3, discount_value),
      scope          = COALESCE($4, scope),
      is_active      = COALESCE($5, is_active),
      updated_at     = NOW()
    WHERE id = $6
    RETURNING *
  `, [
    name || null,
    description !== undefined ? (description || null) : existing.rows[0].description,
    discount_value != null ? parseFloat(discount_value) : null,
    scope || null,
    is_active !== undefined ? is_active : null,
    id,
  ]);
  res.json(result.rows[0]);
}

export async function togglePromotionCode(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await db.query(`
    UPDATE promotion_codes SET is_active = NOT is_active, updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Promotion code not found' });
    return;
  }
  res.json(result.rows[0]);
}

export async function deletePromotionCode(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await db.query(`
    UPDATE promotion_codes SET is_active = false, updated_at = NOW()
    WHERE id = $1 RETURNING id
  `, [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Promotion code not found' });
    return;
  }
  res.status(204).send();
}
