import { PoolClient } from 'pg';

/**
 * The website's customer accounts (`website_customers`) are intentionally not
 * linked via foreign key to the ERP's `customers` table (see
 * website/database_changes.md). To create a sale/rental — which reference
 * `customers.id` — find an existing ERP customer by email, or create one,
 * exactly as ERP staff would when serving a new walk-in customer.
 */
export async function findOrCreateErpCustomer(
  client: PoolClient,
  info: { name: string; email: string; phone: string | null }
): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM customers WHERE lower(email) = lower($1) LIMIT 1`,
    [info.email]
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id`,
    [info.name, info.phone, info.email]
  );
  return inserted.rows[0].id;
}
