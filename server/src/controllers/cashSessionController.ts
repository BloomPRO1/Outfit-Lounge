import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

export async function openSession(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { opening_balance, notes } = req.body;

  if (opening_balance === undefined || opening_balance === null || isNaN(parseFloat(opening_balance))) {
    res.status(400).json({ error: 'opening_balance is required' });
    return;
  }

  // Prevent opening a second session on the same calendar day
  const existing = await db.query(
    `SELECT id FROM cash_sessions
     WHERE user_id = $1
       AND status = 'open'
       AND opened_at::date = CURRENT_DATE`,
    [userId]
  );
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'A session is already open for today', session_id: existing.rows[0].id });
    return;
  }

  const { rows } = await db.query(
    `INSERT INTO cash_sessions (user_id, opening_balance, notes)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, parseFloat(opening_balance), notes || null]
  );
  res.status(201).json(rows[0]);
}

export async function closeSession(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { closing_balance, notes } = req.body;

  if (closing_balance === undefined || closing_balance === null || isNaN(parseFloat(closing_balance))) {
    res.status(400).json({ error: 'closing_balance is required' });
    return;
  }

  const { rows } = await db.query(
    `UPDATE cash_sessions
     SET status = 'closed',
         closing_balance = $1,
         notes = COALESCE($2, notes),
         closed_at = NOW()
     WHERE user_id = $3
       AND status = 'open'
     RETURNING *`,
    [parseFloat(closing_balance), notes || null, userId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'No open session found' });
    return;
  }
  res.json(rows[0]);
}

export async function getCurrentSession(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { rows } = await db.query(
    `SELECT * FROM cash_sessions
     WHERE user_id = $1
       AND status = 'open'
     ORDER BY opened_at DESC
     LIMIT 1`,
    [userId]
  );
  res.json(rows[0] || null);
}

export async function listSessions(req: AuthRequest, res: Response): Promise<void> {
  const { date, user_id } = req.query as Record<string, string>;
  const params: any[] = [];
  const clauses: string[] = [];

  if (date) { params.push(date); clauses.push(`cs.opened_at::date = $${params.length}`); }
  if (user_id) { params.push(user_id); clauses.push(`cs.user_id = $${params.length}`); }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const { rows } = await db.query(
    `SELECT cs.*, u.name AS user_name, u.role AS user_role
     FROM cash_sessions cs
     JOIN users u ON u.id = cs.user_id
     ${where}
     ORDER BY cs.opened_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
}
