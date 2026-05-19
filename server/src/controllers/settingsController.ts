import { Request, Response } from 'express';
import { db } from '../config/database';

export async function getSettings(req: Request, res: Response): Promise<void> {
  const { category } = req.query;
  let whereClause = '';
  const params: any[] = [];

  if (category) {
    whereClause = 'WHERE category = $1';
    params.push(category);
  }

  const result = await db.query(
    `SELECT * FROM settings ${whereClause} ORDER BY category, key`,
    params
  );

  // Convert to key-value object
  const settings: Record<string, any> = {};
  for (const row of result.rows) {
    settings[row.key] = { value: row.value, category: row.category, label: row.label };
  }

  res.json(settings);
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const updates = req.body as Record<string, string>;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    for (const [key, value] of Object.entries(updates)) {
      await client.query(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, value]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function getSetting(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  const result = await db.query(`SELECT * FROM settings WHERE key = $1`, [key]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Setting not found' });
    return;
  }
  res.json(result.rows[0]);
}
