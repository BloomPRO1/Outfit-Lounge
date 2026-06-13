import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { generateSKU, generateVariantSKU } from '../utils/generateSKU';
import { env } from '../config/env';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);
  const { search, category, type, active, includeVariants } = req.query;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    const labelId = parseInt(search as string, 10);
    const labelIdParam = !isNaN(labelId) ? labelId : null;
    whereClause += ` AND (
      p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex}
      OR EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND sku ILIKE $${paramIndex})
      OR ($${paramIndex + 1}::int IS NOT NULL AND EXISTS (
            SELECT 1 FROM product_variants WHERE product_id = p.id AND label_id = $${paramIndex + 1}::int
         ))
    )`;
    params.push(`%${search}%`);
    params.push(labelIdParam);
    paramIndex += 2;
  }
  if (category) {
    whereClause += ` AND p.category_id = $${paramIndex++}`;
    params.push(category);
  }
  if (type) {
    // 'sale' includes both 'sale' and 'both'; 'rental' includes 'rental' and 'both'
    whereClause += ` AND (p.type = $${paramIndex} OR p.type = 'both')`;
    params.push(type);
    paramIndex++;
  }
  if (active !== undefined) {
    whereClause += ` AND p.is_active = $${paramIndex++}`;
    params.push(active === 'true');
  }

  const withVariants = includeVariants === 'true';

  // Run COUNT and data fetch in parallel — cuts one serial DB round-trip
  const variantStatsSQL = withVariants
    ? `SELECT
         COUNT(*)                                      AS variant_count,
         COALESCE(SUM(stock_quantity), 0)              AS total_stock,
         COALESCE(SUM(available_for_rent), 0)          AS total_available,
         COALESCE(
           json_agg(
             json_build_object(
               'id', id, 'sku', sku, 'label_id', label_id, 'size', size, 'color', color,
               'selling_price', selling_price,
               'rental_price_per_day', rental_price_per_day,
               'stock_quantity', stock_quantity,
               'available_for_rent', available_for_rent
             ) ORDER BY size, color
           ), '[]'
         ) AS variants
       FROM product_variants WHERE product_id = p.id`
    : `SELECT
         COUNT(*)                             AS variant_count,
         COALESCE(SUM(stock_quantity), 0)     AS total_stock,
         COALESCE(SUM(available_for_rent), 0) AS total_available
       FROM product_variants WHERE product_id = p.id`;

  const [countRes, dataRes] = await Promise.all([
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params
    ),
    db.query(`
      SELECT p.*,
             pc.name as category_name,
             CASE WHEN any_img.has_image THEN '/api/products/' || p.id::text || '/image?size=300' ELSE NULL END as primary_image,
             COALESCE(pv_stats.variant_count, 0) as variant_count,
             COALESCE(pv_stats.total_stock, 0) as total_stock,
             COALESCE(pv_stats.total_available, 0) as total_available
             ${withVariants ? ', pv_stats.variants' : ''}
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT true as has_image FROM product_images
        WHERE product_id = p.id
        LIMIT 1
      ) any_img ON true
      LEFT JOIN LATERAL (
        ${variantStatsSQL}
      ) pv_stats ON true
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]),
  ]);

  const total = parseInt(countRes.rows[0].count);
  res.json(paginatedResponse(dataRes.rows, total, { page, limit, offset }));
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const productRes = await db.query(`
    SELECT p.*, pc.name as category_name, pc.slug as category_slug
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.id = $1
  `, [id]);

  if (!productRes.rows[0]) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const variantsRes = await db.query(
    `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY size, color`,
    [id]
  );

  const imagesRes = await db.query(
    `SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, created_at`,
    [id]
  );

  res.json({
    ...productRes.rows[0],
    variants: variantsRes.rows,
    images: imagesRes.rows,
  });
}

export async function getProductByBarcode(req: Request, res: Response): Promise<void> {
  const { barcode } = req.params;

  const res2 = await db.query(`
    SELECT p.*, pc.name as category_name,
           CASE WHEN pi.has_image THEN '/api/products/' || p.id::text || '/image?size=300' ELSE NULL END as primary_image
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT 1 as has_image FROM product_images WHERE product_id = p.id LIMIT 1
    ) pi ON true
    WHERE p.barcode = $1 OR p.sku = $1
  `, [barcode]);

  if (!res2.rows[0]) {
    // Try variant SKU or short label_id (e.g. "000042")
    const labelId = parseInt(barcode, 10);
    const varRes = await db.query(`
      SELECT pv.*, p.name as product_name, p.id as product_id, p.type as product_type,
             p.late_fine_per_day,
             p.selling_price as product_selling_price,
             p.rental_price_per_day as product_rental_price_per_day,
             pc.name as category_name,
             CASE WHEN pi.has_image THEN '/api/products/' || p.id::text || '/image?size=300' ELSE NULL END as primary_image
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT 1 as has_image FROM product_images WHERE product_id = p.id LIMIT 1
      ) pi ON true
      WHERE pv.sku = $1 OR ($2::int IS NOT NULL AND pv.label_id = $2::int)
    `, [barcode, isNaN(labelId) ? null : labelId]);

    if (!varRes.rows[0]) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ type: 'variant', ...varRes.rows[0] });
    return;
  }

  const variantsRes = await db.query(
    `SELECT * FROM product_variants WHERE product_id = $1`,
    [res2.rows[0].id]
  );

  res.json({ type: 'product', ...res2.rows[0], variants: variantsRes.rows });
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const {
    name, description, categoryId, type,
    sellingPrice, rentalPricePerDay, lateFinePerDay,
    variants = [],
  } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: 'Name and type are required' });
    return;
  }

  // Get category slug for SKU generation
  let categorySlug = 'PROD';
  if (categoryId) {
    const catRes = await db.query(`SELECT slug FROM product_categories WHERE id = $1`, [categoryId]);
    if (catRes.rows[0]) categorySlug = catRes.rows[0].slug;
  }

  const sku = generateSKU(categorySlug, name);
  const barcode = `BC${Date.now()}`;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const productRes = await client.query(`
      INSERT INTO products (name, description, category_id, sku, barcode, type, selling_price, rental_price_per_day, late_fine_per_day)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, description, categoryId || null, sku, barcode, type, sellingPrice || null, rentalPricePerDay || null, lateFinePerDay || 0]);

    const product = productRes.rows[0];

    // Create variants
    for (const variant of variants) {
      const variantSku = generateVariantSKU(sku, variant.size, variant.color);
      await client.query(`
        INSERT INTO product_variants (product_id, sku, size, color, material, selling_price, rental_price_per_day, stock_quantity, available_for_rent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        product.id, variantSku, variant.size || null, variant.color || null, variant.material || null,
        variant.sellingPrice || sellingPrice || null,
        variant.rentalPricePerDay || rentalPricePerDay || null,
        variant.stockQuantity || 0,
        variant.availableForRent || 0,
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json(product);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'SKU already exists' });
    } else {
      next(err);
    }
  } finally {
    client.release();
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const {
    name, description, categoryId, type,
    sellingPrice, rentalPricePerDay, lateFinePerDay, isActive,
    variants = [],
  } = req.body;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category_id = COALESCE($3, category_id),
        type = COALESCE($4, type),
        selling_price = COALESCE($5, selling_price),
        rental_price_per_day = COALESCE($6, rental_price_per_day),
        late_fine_per_day = COALESCE($7, late_fine_per_day),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [name, description, categoryId, type, sellingPrice, rentalPricePerDay, lateFinePerDay, isActive, id]);

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const productSku = result.rows[0].sku;

    for (const variant of variants) {
      if (variant.id) {
        // Update existing variant
        await client.query(`
          UPDATE product_variants SET
            size = COALESCE($1, size),
            color = COALESCE($2, color),
            material = COALESCE($3, material),
            selling_price = COALESCE($4, selling_price),
            rental_price_per_day = COALESCE($5, rental_price_per_day),
            stock_quantity = COALESCE($6, stock_quantity),
            available_for_rent = COALESCE($7, available_for_rent),
            updated_at = NOW()
          WHERE id = $8 AND product_id = $9
        `, [
          variant.size || null, variant.color || null, variant.material || null,
          variant.sellingPrice || null, variant.rentalPricePerDay || null,
          variant.stockQuantity ?? null, variant.availableForRent ?? null,
          variant.id, id,
        ]);
      } else {
        // Insert new variant
        const variantSku = generateVariantSKU(productSku, variant.size, variant.color);
        await client.query(`
          INSERT INTO product_variants (product_id, sku, size, color, material, selling_price, rental_price_per_day, stock_quantity, available_for_rent)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          id, variantSku, variant.size || null, variant.color || null, variant.material || null,
          variant.sellingPrice || sellingPrice || null,
          variant.rentalPricePerDay || rentalPricePerDay || null,
          variant.stockQuantity || 0,
          variant.availableForRent || 0,
        ]);
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const usageRes = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM rental_items ri
       JOIN product_variants pv ON pv.id = ri.product_variant_id
       WHERE pv.product_id = $1)::int AS rental_count,
      (SELECT COUNT(*) FROM sale_items si
       JOIN product_variants pv ON pv.id = si.product_variant_id
       WHERE pv.product_id = $1)::int AS sale_count,
      (SELECT COUNT(*) FROM inventory_movements im
       JOIN product_variants pv ON pv.id = im.product_variant_id
       WHERE pv.product_id = $1)::int AS movement_count
  `, [id]);

  const { rental_count, sale_count, movement_count } = usageRes.rows[0] as any;
  if (rental_count > 0 || sale_count > 0 || movement_count > 0) {
    res.status(409).json({
      error: `Cannot delete — this product has ${rental_count} rental(s), ${sale_count} sale(s), and ${movement_count} stock movement(s) on record.`,
    });
    return;
  }

  const result = await db.query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ message: 'Product deleted successfully' });
}

export async function deleteVariant(req: Request, res: Response): Promise<void> {
  const { id: productId, variantId } = req.params;

  const usageRes = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM rental_items      WHERE product_variant_id = $1)::int AS rental_count,
      (SELECT COUNT(*) FROM sale_items        WHERE product_variant_id = $1)::int AS sale_count,
      (SELECT COUNT(*) FROM inventory_movements WHERE product_variant_id = $1)::int AS movement_count
  `, [variantId]);

  const { rental_count, sale_count, movement_count } = usageRes.rows[0] as any;
  if (rental_count > 0 || sale_count > 0 || movement_count > 0) {
    res.status(409).json({
      error: `Cannot delete — this variant has ${rental_count} rental(s), ${sale_count} sale(s), and ${movement_count} stock movement(s) on record.`,
    });
    return;
  }

  const result = await db.query(
    `DELETE FROM product_variants WHERE id = $1 AND product_id = $2 RETURNING id`,
    [variantId, productId],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Variant not found' });
    return;
  }
  res.json({ message: 'Variant deleted successfully' });
}

// In-memory image cache keyed by `productId:size` (size=0 means full resolution).
// Thumbnails are generated once with sharp and cached as WebP — no DB hit after that.
const _imgCache = new Map<string, { mime: string; buf: Buffer; at: number }>();
const IMG_TTL = 10 * 60 * 1000;

function _evictProduct(productId: string) {
  for (const key of _imgCache.keys()) {
    if (key.startsWith(`${productId}:`)) _imgCache.delete(key);
  }
}

export async function serveProductImage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const size = Math.min(parseInt(req.query.size as string) || 0, 1200);
  const cacheKey = `${id}:${size}`;

  const now = Date.now();
  const hit = _imgCache.get(cacheKey);
  if (hit && now - hit.at < IMG_TTL) {
    res.set('Content-Type', hit.mime);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(hit.buf);
    return;
  }

  const result = await db.query(
    `SELECT url FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order, created_at LIMIT 1`,
    [id]
  );
  if (!result.rows[0]) { res.status(404).end(); return; }
  const url: string = result.rows[0].url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) { res.status(404).end(); return; }

  const rawBuf = Buffer.from(match[2], 'base64');
  let outBuf: Buffer;
  let outMime: string;

  if (size > 0) {
    try {
      // Convert to sRGB first so CMYK/unusual-profile images don't fail WebP conversion
      outBuf = await sharp(rawBuf)
        .toColorspace('srgb')
        .resize(size, size, { fit: 'cover', position: 'center' })
        .webp({ quality: 82 })
        .toBuffer();
      outMime = 'image/webp';
    } catch {
      // Fall back to original image bytes if sharp can't handle this format
      outBuf = rawBuf;
      outMime = match[1];
    }
  } else {
    outBuf = rawBuf;
    outMime = match[1];
  }

  _imgCache.set(cacheKey, { mime: outMime, buf: outBuf, at: now });

  res.set('Content-Type', outMime);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(outBuf);
}

export async function uploadProductImage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { isPrimary = false } = req.body;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const wantsPrimary = isPrimary === 'true' || isPrimary === true;

  // Auto-promote to primary if this product has no primary image yet
  const existingPrimary = await db.query(
    `SELECT 1 FROM product_images WHERE product_id = $1 AND is_primary = true LIMIT 1`, [id]
  );
  const setAsPrimary = wantsPrimary || existingPrimary.rowCount === 0;

  if (setAsPrimary) {
    await db.query(`UPDATE product_images SET is_primary = false WHERE product_id = $1`, [id]);
  }

  const result = await db.query(`
    INSERT INTO product_images (product_id, url, is_primary)
    VALUES ($1, $2, $3) RETURNING *
  `, [id, imageUrl, setAsPrimary]);

  _evictProduct(id);
  res.status(201).json(result.rows[0]);
}

export async function deleteProductImage(req: AuthRequest, res: Response): Promise<void> {
  const { id, imageId } = req.params;
  const result = await db.query(
    `DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING id, is_primary`,
    [imageId, id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  // If the deleted image was primary, promote the next image automatically
  if (result.rows[0].is_primary) {
    await db.query(`
      UPDATE product_images SET is_primary = true
      WHERE id = (
        SELECT id FROM product_images WHERE product_id = $1
        ORDER BY sort_order, created_at LIMIT 1
      )
    `, [id]);
  }
  _evictProduct(id);
  res.status(204).send();
}

export async function setProductImagePrimary(req: AuthRequest, res: Response): Promise<void> {
  const { id, imageId } = req.params;
  // Verify the image belongs to this product
  const check = await db.query(
    `SELECT id FROM product_images WHERE id = $1 AND product_id = $2`,
    [imageId, id]
  );
  if (!check.rows[0]) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  await db.query(`UPDATE product_images SET is_primary = false WHERE product_id = $1`, [id]);
  const result = await db.query(
    `UPDATE product_images SET is_primary = true WHERE id = $1 RETURNING *`,
    [imageId]
  );
  res.json(result.rows[0]);
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const result = await db.query(`
    SELECT pc.*, COUNT(p.id) as product_count
    FROM product_categories pc
    LEFT JOIN products p ON p.category_id = pc.id AND p.is_active = true
    GROUP BY pc.id
    ORDER BY pc.sort_order, pc.name
  `);
  res.json(result.rows);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name, slug, description, parentId, sortOrder } = req.body;
  const result = await db.query(`
    INSERT INTO product_categories (name, slug, description, parent_id, sort_order)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [name, slug || name.toLowerCase().replace(/\s+/g, '-'), description, parentId || null, sortOrder || 0]);
  res.status(201).json(result.rows[0]);
}

export async function createVariant(req: AuthRequest, res: Response): Promise<void> {
  const { id: productId } = req.params;
  const { size, color, material, sellingPrice, rentalPricePerDay, stockQuantity, availableForRent } = req.body;

  const productRes = await db.query(`SELECT sku FROM products WHERE id = $1`, [productId]);
  if (!productRes.rows[0]) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const variantSku = generateVariantSKU(productRes.rows[0].sku, size, color);

  const result = await db.query(`
    INSERT INTO product_variants (product_id, sku, size, color, material, selling_price, rental_price_per_day, stock_quantity, available_for_rent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [productId, variantSku, size, color, material, sellingPrice, rentalPricePerDay, stockQuantity || 0, availableForRent || 0]);

  res.status(201).json(result.rows[0]);
}

export async function updateVariant(req: AuthRequest, res: Response): Promise<void> {
  const { variantId } = req.params;
  const { size, color, material, sellingPrice, rentalPricePerDay, stockQuantity, availableForRent } = req.body;

  const result = await db.query(`
    UPDATE product_variants SET
      size = COALESCE($1, size),
      color = COALESCE($2, color),
      material = COALESCE($3, material),
      selling_price = COALESCE($4, selling_price),
      rental_price_per_day = COALESCE($5, rental_price_per_day),
      stock_quantity = COALESCE($6, stock_quantity),
      available_for_rent = COALESCE($7, available_for_rent),
      updated_at = NOW()
    WHERE id = $8 RETURNING *
  `, [size, color, material, sellingPrice, rentalPricePerDay, stockQuantity, availableForRent, variantId]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Variant not found' });
    return;
  }
  res.json(result.rows[0]);
}

export async function splitVariantToRental(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const { id: productId, variantId } = req.params;
  const qty = parseInt(req.body.quantity);

  if (!qty || qty < 1) {
    res.status(400).json({ error: 'Quantity must be at least 1' });
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Load source variant + product SKU
    const srcRes = await client.query(
      `SELECT pv.*, p.sku as product_sku FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = $1 AND pv.product_id = $2`,
      [variantId, productId]
    );
    if (!srcRes.rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Variant not found' });
      return;
    }
    const src = srcRes.rows[0];

    // Sale stock = total stock minus whatever is already allocated to rent
    const saleStock = (src.stock_quantity || 0) - (src.available_for_rent || 0);
    if (qty > saleStock) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: `Only ${saleStock} unit(s) available for transfer` });
      return;
    }

    // Derive rent variant identifiers (append -R to color; fall back to size)
    const rentColor = src.color ? `${src.color}-R` : src.color;
    const rentSize  = !src.color && src.size ? `${src.size}-R` : src.size;

    if (!rentColor && !rentSize) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Variant must have a size or color to split into rent' });
      return;
    }

    // Does the rent variant already exist?
    const existRes = await client.query(
      `SELECT * FROM product_variants
       WHERE product_id = $1
         AND size IS NOT DISTINCT FROM $2
         AND color IS NOT DISTINCT FROM $3`,
      [productId, rentSize, rentColor]
    );

    let rentVariant: any;
    if (existRes.rows[0]) {
      // Add units to the existing rent variant
      const upd = await client.query(
        `UPDATE product_variants SET
           stock_quantity    = stock_quantity    + $1,
           available_for_rent = available_for_rent + $1,
           updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [qty, existRes.rows[0].id]
      );
      rentVariant = upd.rows[0];
    } else {
      // Create brand-new rent variant — gets its own auto-incremented label_id
      const rentSku = generateVariantSKU(src.product_sku, rentSize, rentColor);
      const ins = await client.query(
        `INSERT INTO product_variants
           (product_id, sku, size, color, material, selling_price, rental_price_per_day, stock_quantity, available_for_rent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          productId, rentSku, rentSize, rentColor, src.material,
          src.selling_price, src.rental_price_per_day,
          qty, qty,
        ]
      );
      rentVariant = ins.rows[0];
    }

    // Deduct from source variant
    await client.query(
      `UPDATE product_variants SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2`,
      [qty, variantId]
    );

    // Inventory movement log
    await client.query(
      `INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, created_by)
       VALUES ($1,'out',$2,'Transferred to rental pool',$3)`,
      [variantId, qty, req.user?.id]
    );
    await client.query(
      `INSERT INTO inventory_movements (product_variant_id, type, quantity, reason, created_by)
       VALUES ($1,'in',$2,'Transferred from sale pool',$3)`,
      [rentVariant.id, qty, req.user?.id]
    );

    await client.query('COMMIT');
    res.json({ sourceVariant: src, rentVariant });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'SKU conflict — try again' });
    } else {
      next(err);
    }
  } finally {
    client.release();
  }
}
