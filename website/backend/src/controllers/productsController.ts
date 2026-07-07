import { Request, Response } from 'express';
import { pool } from '../db/pool';

const SALE_TYPES = ['sale', 'both'];
const RENT_TYPES = ['rental', 'both'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(String(req.query.limit ?? '12'), 10) || 12));
  return { page, limit, offset: (page - 1) * limit };
}

// Rentals booked for a future date range don't need to be "back in stock" —
// they just need to not overlap requested dates with an existing active booking.
// Mirrors the ERP's rentalController.getAvailability, generalized from a single
// date to a [startDate, endDate] range.
function parseDateRange(req: Request): { startDate: string; endDate: string } | undefined {
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  if (typeof startDate !== 'string' || typeof endDate !== 'string') return undefined;
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return undefined;
  if (startDate > endDate) return undefined;
  return { startDate, endDate };
}

/**
 * SQL fragments giving each rent-eligible variant an `available_qty` for the
 * given date range: currently-free stock (`available_for_rent`) plus units out
 * on bookings that don't overlap the requested range, minus units already
 * booked for a date that does overlap the requested range.
 */
function rentAvailabilityCTEs(paramIndex: number) {
  const startParam = paramIndex;
  const endParam = paramIndex + 1;
  const ctes = `
    active_bookings AS (
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
      WHERE r.rental_start_date <= $${endParam}
        AND r.rental_end_date >= $${startParam}
        AND r.status NOT IN ('returned', 'completed', 'cancelled')
        AND ri.is_returned = false
      GROUP BY ri.product_variant_id
    )
  `;
  const availableQtyExpr = `GREATEST(0, pv.available_for_rent + COALESCE(ab.total_booked, 0) - COALESCE(ob.booked_qty, 0))`;
  const joins = `
    LEFT JOIN active_bookings ab ON ab.product_variant_id = pv.id
    LEFT JOIN overlap_bookings ob ON ob.product_variant_id = pv.id
  `;
  return { ctes, joins, availableQtyExpr, nextParamIndex: paramIndex + 2 };
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  const context = req.query.context === 'rent' ? 'rent' : 'sale';
  const types = context === 'rent' ? RENT_TYPES : SALE_TYPES;

  const variantCondition =
    context === 'rent'
      ? `(p.type = 'rental' OR pv.sku LIKE '%-R') AND pv.available_for_rent > 0`
      : `(pv.stock_quantity - pv.available_for_rent) > 0`;

  const result = await pool.query(
    `SELECT pc.id, pc.name, pc.slug, COUNT(DISTINCT p.id)::int AS product_count
     FROM product_categories pc
     JOIN products p ON p.category_id = pc.id
     JOIN product_variants pv ON pv.product_id = p.id
     WHERE p.is_active = true
       AND p.type = ANY($1)
       AND ${variantCondition}
     GROUP BY pc.id, pc.name, pc.slug
     ORDER BY pc.sort_order, pc.name`,
    [types]
  );

  res.json(result.rows);
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const context = req.query.context === 'rent' ? 'rent' : 'sale';
  const types = context === 'rent' ? RENT_TYPES : SALE_TYPES;
  const { page, limit, offset } = parsePagination(req);
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const dateRange = context === 'rent' ? parseDateRange(req) : undefined;

  const rentEligible = `(p.type = 'rental' OR pv.sku LIKE '%-R')`;
  const params: unknown[] = [types];
  let paramIndex = 2;

  let variantCondition: string;
  let priceExpr: string;
  let availabilityExpr = '0';
  let ctePrefix = '';
  let joinExtra = '';

  if (context === 'rent' && dateRange) {
    const { ctes, joins, availableQtyExpr, nextParamIndex } = rentAvailabilityCTEs(paramIndex);
    ctePrefix = `WITH ${ctes}`;
    joinExtra = joins;
    availabilityExpr = availableQtyExpr;
    variantCondition = `${rentEligible} AND ${availableQtyExpr} > 0`;
    priceExpr = `COALESCE(pv.rental_price_per_day, p.rental_price_per_day)`;
    params.push(dateRange.startDate, dateRange.endDate);
    paramIndex = nextParamIndex;
  } else if (context === 'rent') {
    variantCondition = `${rentEligible} AND pv.available_for_rent > 0`;
    priceExpr = `COALESCE(pv.rental_price_per_day, p.rental_price_per_day)`;
    availabilityExpr = `pv.available_for_rent`;
  } else {
    variantCondition = `(pv.stock_quantity - pv.available_for_rent) > 0`;
    priceExpr = `COALESCE(pv.selling_price, p.selling_price)`;
    availabilityExpr = `(pv.stock_quantity - pv.available_for_rent)`;
  }

  let filters = '';
  if (category) {
    filters += ` AND pc.slug = $${paramIndex++}`;
    params.push(category);
  }
  if (search) {
    filters += ` AND p.name ILIKE $${paramIndex++}`;
    params.push(`%${search}%`);
  }

  const countRes = await pool.query<{ count: string }>(
    `${ctePrefix}
     SELECT COUNT(DISTINCT p.id)
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     JOIN product_variants pv ON pv.product_id = p.id
     ${joinExtra}
     WHERE p.is_active = true AND p.type = ANY($1) AND ${variantCondition} ${filters}`,
    params
  );

  const dataRes = await pool.query(
    `${ctePrefix}
     SELECT p.id, p.name, p.description,
            pc.name AS category_name, pc.slug AS category_slug,
            MIN(${priceExpr}) AS from_price,
            MAX(${availabilityExpr}) AS max_available_qty,
            (SELECT id FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order, created_at LIMIT 1) AS primary_image_id
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     JOIN product_variants pv ON pv.product_id = p.id
     ${joinExtra}
     WHERE p.is_active = true AND p.type = ANY($1) AND ${variantCondition} ${filters}
     GROUP BY p.id, pc.name, pc.slug
     ORDER BY p.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  res.json({
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    page,
    limit,
    dateRange: dateRange ?? null,
  });
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const context = req.query.context === 'rent' ? 'rent' : 'sale';
  const dateRange = context === 'rent' ? parseDateRange(req) : undefined;

  const productRes = await pool.query(
    `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE p.id = $1 AND p.is_active = true`,
    [id]
  );
  const product = productRes.rows[0];
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  if (context === 'rent' ? !RENT_TYPES.includes(product.type) : !SALE_TYPES.includes(product.type)) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  let variantsRes;
  if (context === 'rent' && dateRange) {
    const { ctes, joins, availableQtyExpr } = rentAvailabilityCTEs(2);
    variantsRes = await pool.query(
      `WITH ${ctes}
       SELECT pv.id, pv.sku, pv.size, pv.color, pv.material, pv.selling_price, pv.rental_price_per_day,
              pv.stock_quantity, pv.available_for_rent,
              ${availableQtyExpr} AS available_qty
       FROM product_variants pv
       ${joins}
       WHERE pv.product_id = $1
       ORDER BY pv.size, pv.color`,
      [id, dateRange.startDate, dateRange.endDate]
    );
  } else {
    variantsRes = await pool.query(
      `SELECT id, sku, size, color, material, selling_price, rental_price_per_day,
              stock_quantity, available_for_rent
       FROM product_variants
       WHERE product_id = $1
       ORDER BY size, color`,
      [id]
    );
  }

  const eligibleVariants = variantsRes.rows.filter((v) => {
    if (context !== 'rent') return v.stock_quantity - v.available_for_rent > 0;
    if (product.type !== 'rental' && !v.sku?.endsWith('-R')) return false;
    return dateRange ? v.available_qty > 0 : v.available_for_rent > 0;
  });

  const imagesRes = await pool.query(
    `SELECT id, is_primary FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order, created_at`,
    [id]
  );

  res.json({
    ...product,
    variants: eligibleVariants,
    images: imagesRes.rows,
    dateRange: dateRange ?? null,
  });
}

const imageCache = new Map<string, { mime: string; buf: Buffer; at: number }>();
const IMAGE_TTL = 10 * 60 * 1000;

export async function serveImage(req: Request, res: Response): Promise<void> {
  const { imageId } = req.params;
  const size = Math.min(parseInt(String(req.query.size ?? '0'), 10) || 0, 1200);
  const cacheKey = `${imageId}:${size}`;

  const now = Date.now();
  const cached = imageCache.get(cacheKey);
  if (cached && now - cached.at < IMAGE_TTL) {
    res.set('Content-Type', cached.mime);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(cached.buf);
    return;
  }

  const result = await pool.query(`SELECT url FROM product_images WHERE id = $1`, [imageId]);
  const url: string | undefined = result.rows[0]?.url;
  if (!url) {
    res.status(404).end();
    return;
  }
  const match = url.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    res.status(404).end();
    return;
  }

  const rawBuf = Buffer.from(match[2], 'base64');
  let outBuf = rawBuf;
  let outMime = match[1];

  if (size > 0) {
    try {
      const sharp = (await import('sharp')).default;
      outBuf = await sharp(rawBuf)
        .toColorspace('srgb')
        .resize(size, size, { fit: 'cover', position: 'center' })
        .webp({ quality: 82 })
        .toBuffer();
      outMime = 'image/webp';
    } catch {
      // fall back to original bytes if sharp can't process this image
    }
  }

  imageCache.set(cacheKey, { mime: outMime, buf: outBuf, at: now });
  res.set('Content-Type', outMime);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(outBuf);
}
