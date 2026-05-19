import { Request, Response } from 'express';
import { db } from '../config/database';
import { getPagination, paginatedResponse } from '../utils/pagination';

export async function getCustomers(req: Request, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req.query);
  const { search } = req.query;

  let whereClause = '';
  const params: any[] = [];

  if (search) {
    whereClause = `WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1`;
    params.push(`%${search}%`);
  }

  const countRes = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM customers c ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);

  const dataRes = await db.query(`
    SELECT c.*,
           COUNT(DISTINCT r.id) as total_rentals,
           COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('reserved','ready_for_pickup','picked_up','late_return')) as active_rentals,
           COALESCE(SUM(ft.total_fine) FILTER (WHERE ft.is_paid = false), 0) as outstanding_fines
    FROM customers c
    LEFT JOIN rentals r ON r.customer_id = c.id
    LEFT JOIN fine_transactions ft ON ft.rental_id = r.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]);

  res.json(paginatedResponse(dataRes.rows, total, { page, limit, offset }));
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const customerRes = await db.query(`SELECT * FROM customers WHERE id = $1`, [id]);
  if (!customerRes.rows[0]) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const rentalsRes = await db.query(`
    SELECT r.*,
           COUNT(ri.id) as item_count
    FROM rentals r
    LEFT JOIN rental_items ri ON ri.rental_id = r.id
    WHERE r.customer_id = $1
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT 10
  `, [id]);

  const paymentsRes = await db.query(`
    SELECT p.*, r.booking_number, s.sale_number
    FROM payments p
    LEFT JOIN rentals r ON r.id = p.rental_id
    LEFT JOIN sales s ON s.id = p.sale_id
    WHERE r.customer_id = $1 OR s.customer_id = $1
    ORDER BY p.created_at DESC
    LIMIT 10
  `, [id]);

  const finesRes = await db.query(`
    SELECT ft.*, r.booking_number
    FROM fine_transactions ft
    JOIN rentals r ON r.id = ft.rental_id
    WHERE r.customer_id = $1
    ORDER BY ft.created_at DESC
  `, [id]);

  res.json({
    ...customerRes.rows[0],
    rentals: rentalsRes.rows,
    payments: paymentsRes.rows,
    fines: finesRes.rows,
  });
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const { name, phone, whatsapp, email, address, notes } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Customer name is required' });
    return;
  }

  const result = await db.query(`
    INSERT INTO customers (name, phone, whatsapp, email, address, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [name, phone || null, whatsapp || null, email || null, address || null, notes || null]);

  res.status(201).json(result.rows[0]);
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, phone, whatsapp, email, address, notes } = req.body;

  const result = await db.query(`
    UPDATE customers SET
      name = COALESCE($1, name),
      phone = COALESCE($2, phone),
      whatsapp = COALESCE($3, whatsapp),
      email = COALESCE($4, email),
      address = COALESCE($5, address),
      notes = COALESCE($6, notes),
      updated_at = NOW()
    WHERE id = $7 RETURNING *
  `, [name, phone, whatsapp, email, address, notes, id]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(result.rows[0]);
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  // Check for active rentals
  const activeRes = await db.query(
    `SELECT COUNT(*) FROM rentals WHERE customer_id = $1 AND status NOT IN ('completed','cancelled')`,
    [id]
  );
  if (parseInt(activeRes.rows[0].count) > 0) {
    res.status(400).json({ error: 'Cannot delete customer with active rentals' });
    return;
  }
  await db.query(`DELETE FROM customers WHERE id = $1`, [id]);
  res.json({ message: 'Customer deleted successfully' });
}

export async function searchCustomers(req: Request, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q) {
    res.json([]);
    return;
  }
  const result = await db.query(`
    SELECT id, name, phone, whatsapp, email
    FROM customers
    WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
    ORDER BY name LIMIT 10
  `, [`%${q}%`]);
  res.json(result.rows);
}
