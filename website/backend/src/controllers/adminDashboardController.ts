import { Response } from 'express';
import { pool } from '../db/pool';
import { AdminAuthRequest } from '../middleware/adminAuth';
import { getPagination } from '../utils/pagination';

export async function getOverview(_req: AdminAuthRequest, res: Response): Promise<void> {
  const [products, stock, sales, rentals, customers, promotions] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM products WHERE is_active = true`),
    pool.query(
      `SELECT COALESCE(SUM(pv.stock_quantity),0)::int AS total_stock,
              COALESCE(SUM(pv.available_for_rent),0)::int AS total_available_for_rent,
              COALESCE(SUM(pv.stock_quantity * COALESCE(pv.selling_price, p.selling_price, 0)),0)::numeric AS stock_value
       FROM product_variants pv
       LEFT JOIN products p ON p.id = pv.product_id`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount),0)::numeric AS revenue
       FROM sales WHERE created_by IS NULL`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE status NOT IN ('returned','completed','cancelled'))::int AS active_count
       FROM rentals WHERE created_by IS NULL`
    ),
    pool.query(`SELECT COUNT(*)::int AS count FROM website_customers`),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM website_promotions
       WHERE is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date`
    ),
  ]);

  res.json({
    activeProducts: products.rows[0].count,
    totalStockUnits: stock.rows[0].total_stock,
    totalAvailableForRent: stock.rows[0].total_available_for_rent,
    stockValue: stock.rows[0].stock_value,
    websiteOrders: sales.rows[0].count,
    websiteRevenue: sales.rows[0].revenue,
    websiteRentals: rentals.rows[0].count,
    activeWebsiteRentals: rentals.rows[0].active_count,
    websiteCustomers: customers.rows[0].count,
    activePromotions: promotions.rows[0].count,
  });
}

export async function listAdminProducts(req: AdminAuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

  const params: unknown[] = [];
  let filter = '';
  if (search) {
    params.push(`%${search}%`);
    filter = ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
  }

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM products p WHERE 1=1 ${filter}`,
    params
  );

  const dataRes = await pool.query(
    `SELECT p.id, p.name, p.sku, p.type, p.is_active, p.selling_price, p.rental_price_per_day,
            pc.name AS category_name,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', pv.id, 'sku', pv.sku, 'size', pv.size, 'color', pv.color,
                 'stockQuantity', pv.stock_quantity, 'availableForRent', pv.available_for_rent,
                 'sellingPrice', pv.selling_price, 'rentalPricePerDay', pv.rental_price_per_day
               ) ORDER BY pv.size, pv.color)
               FROM product_variants pv WHERE pv.product_id = p.id), '[]'
            ) AS variants
     FROM products p
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE 1=1 ${filter}
     ORDER BY p.name
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count, 10), page, limit });
}

export async function listAdminOrders(req: AdminAuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);

  const countRes = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM sales`);
  const dataRes = await pool.query(
    `SELECT s.id, s.sale_number, s.status, s.subtotal, s.discount_amount, s.total_amount,
            s.payment_method, s.created_at, s.created_by,
            c.name AS customer_name, c.email AS customer_email,
            COUNT(si.id)::int AS item_count
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN sale_items si ON si.sale_id = s.id
     GROUP BY s.id, c.name, c.email
     ORDER BY s.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count, 10), page, limit });
}

export async function listAdminRentals(req: AdminAuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);

  const countRes = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM rentals`);
  const dataRes = await pool.query(
    `SELECT r.id, r.booking_number, r.status, r.rental_start_date, r.rental_end_date,
            r.total_rental_cost, r.discount_amount, r.advance_payment, r.created_at, r.created_by,
            c.name AS customer_name, c.email AS customer_email,
            COUNT(ri.id)::int AS item_count
     FROM rentals r
     LEFT JOIN customers c ON c.id = r.customer_id
     LEFT JOIN rental_items ri ON ri.rental_id = r.id
     GROUP BY r.id, c.name, c.email
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count, 10), page, limit });
}

export async function listAdminCustomers(req: AdminAuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);

  const countRes = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM website_customers`);
  const dataRes = await pool.query(
    `SELECT wc.id, wc.name, wc.email, wc.phone, wc.created_at,
            (SELECT COUNT(*) FROM sales s JOIN customers c ON c.id = s.customer_id WHERE lower(c.email) = lower(wc.email))::int AS order_count,
            (SELECT COUNT(*) FROM rentals r JOIN customers c ON c.id = r.customer_id WHERE lower(c.email) = lower(wc.email))::int AS rental_count
     FROM website_customers wc
     ORDER BY wc.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count, 10), page, limit });
}
