import { Response } from 'express';
import { pool } from '../db/pool';
import { AdminAuthRequest } from '../middleware/adminAuth';

const DISCOUNT_TYPES = ['percentage', 'flat_amount'];
const SCOPES = ['sale', 'rental', 'both'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type PromotionInput = {
  title: string;
  description?: string | null;
  bannerImage?: string | null;
  discountType: string;
  discountValue: number;
  scope: string;
  categoryIds?: string[] | null;
  weekendOnly?: boolean;
  minOrderAmount?: number | null;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

async function validateInput(input: Partial<PromotionInput>): Promise<string | null> {
  if (!input.title || !String(input.title).trim()) return 'Title is required';
  if (!input.discountType || !DISCOUNT_TYPES.includes(input.discountType)) {
    return 'discountType must be "percentage" or "flat_amount"';
  }
  if (typeof input.discountValue !== 'number' || input.discountValue <= 0) {
    return 'discountValue must be a positive number';
  }
  if (input.discountType === 'percentage' && input.discountValue > 100) {
    return 'A percentage discount cannot exceed 100';
  }
  if (!input.scope || !SCOPES.includes(input.scope)) {
    return 'scope must be "sale", "rental", or "both"';
  }
  if (!input.startDate || !input.endDate || !DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) {
    return 'startDate and endDate are required (YYYY-MM-DD)';
  }
  if (input.startDate > input.endDate) return 'startDate must be on or before endDate';
  if (input.categoryIds && input.categoryIds.length > 0) {
    const res = await pool.query(`SELECT id FROM product_categories WHERE id = ANY($1::uuid[])`, [
      input.categoryIds,
    ]);
    if (res.rows.length !== input.categoryIds.length) {
      return 'One or more categoryIds do not exist';
    }
  }
  return null;
}

// All product_categories, unfiltered by current stock/eligibility (unlike the
// public /categories endpoint) — an admin should be able to target a
// promotion at any category regardless of what's in stock right now.
export async function listAllCategories(_req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT id, name, slug FROM product_categories ORDER BY sort_order, name`
  );
  res.json(result.rows);
}

export async function listAdminPromotions(_req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT p.*,
            COALESCE(
              (SELECT json_agg(json_build_object('id', pc.id, 'name', pc.name, 'slug', pc.slug))
               FROM product_categories pc WHERE pc.id = ANY(p.category_ids)),
              '[]'
            ) AS categories
     FROM website_promotions p
     ORDER BY p.created_at DESC`
  );
  res.json(result.rows);
}

export async function getAdminPromotion(req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(`SELECT * FROM website_promotions WHERE id = $1`, [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  res.json(result.rows[0]);
}

export async function createAdminPromotion(req: AdminAuthRequest, res: Response): Promise<void> {
  const input = req.body as PromotionInput;
  const error = await validateInput(input);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const result = await pool.query(
    `INSERT INTO website_promotions (
       title, description, banner_image, discount_type, discount_value, scope,
       category_ids, weekend_only, min_order_amount, start_date, end_date, is_active, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      input.title.trim(),
      input.description ?? null,
      input.bannerImage ?? null,
      input.discountType,
      input.discountValue,
      input.scope,
      input.categoryIds && input.categoryIds.length > 0 ? input.categoryIds : null,
      Boolean(input.weekendOnly),
      input.minOrderAmount ?? null,
      input.startDate,
      input.endDate,
      input.isActive ?? true,
      req.admin?.id ?? null,
    ]
  );
  res.status(201).json(result.rows[0]);
}

export async function updateAdminPromotion(req: AdminAuthRequest, res: Response): Promise<void> {
  const existing = await pool.query(`SELECT * FROM website_promotions WHERE id = $1`, [req.params.id]);
  if (!existing.rows[0]) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  const current = existing.rows[0];
  const input = req.body as Partial<PromotionInput>;

  const merged: PromotionInput = {
    title: input.title ?? current.title,
    description: input.description ?? current.description,
    bannerImage: input.bannerImage !== undefined ? input.bannerImage : current.banner_image,
    discountType: input.discountType ?? current.discount_type,
    discountValue: input.discountValue ?? parseFloat(current.discount_value),
    scope: input.scope ?? current.scope,
    categoryIds: input.categoryIds !== undefined ? input.categoryIds : current.category_ids,
    weekendOnly: input.weekendOnly !== undefined ? input.weekendOnly : current.weekend_only,
    minOrderAmount:
      input.minOrderAmount !== undefined
        ? input.minOrderAmount
        : current.min_order_amount !== null
          ? parseFloat(current.min_order_amount)
          : null,
    startDate: input.startDate ?? current.start_date,
    endDate: input.endDate ?? current.end_date,
    isActive: input.isActive !== undefined ? input.isActive : current.is_active,
  };

  const error = await validateInput(merged);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const result = await pool.query(
    `UPDATE website_promotions SET
       title = $1, description = $2, banner_image = $3, discount_type = $4, discount_value = $5,
       scope = $6, category_ids = $7, weekend_only = $8, min_order_amount = $9,
       start_date = $10, end_date = $11, is_active = $12, updated_at = NOW()
     WHERE id = $13
     RETURNING *`,
    [
      merged.title.trim(),
      merged.description,
      merged.bannerImage,
      merged.discountType,
      merged.discountValue,
      merged.scope,
      merged.categoryIds && merged.categoryIds.length > 0 ? merged.categoryIds : null,
      Boolean(merged.weekendOnly),
      merged.minOrderAmount,
      merged.startDate,
      merged.endDate,
      merged.isActive,
      req.params.id,
    ]
  );
  res.json(result.rows[0]);
}

export async function deleteAdminPromotion(req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(`DELETE FROM website_promotions WHERE id = $1 RETURNING id`, [
    req.params.id,
  ]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  res.status(204).end();
}

export async function toggleAdminPromotion(req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `UPDATE website_promotions SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  res.json(result.rows[0]);
}
