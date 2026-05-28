import { Request, Response, NextFunction } from 'express';
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
    whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex}
      OR EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND sku ILIKE $${paramIndex}))`;
    params.push(`%${search}%`);
    paramIndex++;
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

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM products p ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);

  const variantsSelect = includeVariants === 'true' ? ', pv_stats.variants' : '';

  const dataRes = await db.query(`
    SELECT p.*,
           pc.name as category_name,
           primary_img.url as primary_image,
           COALESCE(pv_stats.variant_count, 0) as variant_count,
           COALESCE(pv_stats.total_stock, 0) as total_stock,
           COALESCE(pv_stats.total_available, 0) as total_available
           ${variantsSelect}
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT url FROM product_images
      WHERE product_id = p.id AND is_primary = true
      LIMIT 1
    ) primary_img ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)                                      AS variant_count,
        COALESCE(SUM(stock_quantity), 0)              AS total_stock,
        COALESCE(SUM(available_for_rent), 0)          AS total_available,
        COALESCE(
          json_agg(
            json_build_object(
              'id', id, 'sku', sku, 'size', size, 'color', color,
              'selling_price', selling_price,
              'rental_price_per_day', rental_price_per_day,
              'stock_quantity', stock_quantity,
              'available_for_rent', available_for_rent
            ) ORDER BY size, color
          ), '[]'
        ) AS variants
      FROM product_variants
      WHERE product_id = p.id
    ) pv_stats ON true
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);

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
           pi.url as primary_image
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
    WHERE p.barcode = $1 OR p.sku = $1
  `, [barcode]);

  if (!res2.rows[0]) {
    // Try variant SKU
    const varRes = await db.query(`
      SELECT pv.*, p.name as product_name, p.id as product_id, p.type as product_type,
             p.late_fine_per_day,
             p.selling_price as product_selling_price,
             p.rental_price_per_day as product_rental_price_per_day,
             pc.name as category_name, pi.url as primary_image
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE pv.sku = $1
    `, [barcode]);

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
  const result = await db.query(`UPDATE products SET is_active = false WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ message: 'Product deactivated successfully' });
}

export async function uploadProductImage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { isPrimary = false } = req.body;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  if (isPrimary === 'true' || isPrimary === true) {
    await db.query(`UPDATE product_images SET is_primary = false WHERE product_id = $1`, [id]);
  }

  const result = await db.query(`
    INSERT INTO product_images (product_id, url, is_primary)
    VALUES ($1, $2, $3) RETURNING *
  `, [id, imageUrl, isPrimary === 'true' || isPrimary === true]);

  res.status(201).json(result.rows[0]);
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
