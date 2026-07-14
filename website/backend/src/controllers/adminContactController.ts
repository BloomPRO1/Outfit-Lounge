import { Response } from 'express';
import { pool } from '../db/pool';
import { AdminAuthRequest } from '../middleware/adminAuth';

export async function listAdminContactSubmissions(_req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT * FROM website_contact_submissions ORDER BY created_at DESC`
  );
  res.json(result.rows);
}

export async function markContactSubmissionRead(req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `UPDATE website_contact_submissions
     SET status = CASE WHEN status = 'new' THEN 'read' ELSE 'new' END
     WHERE id = $1
     RETURNING *`,
    [req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  res.json(result.rows[0]);
}

export async function deleteContactSubmission(req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `DELETE FROM website_contact_submissions WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  res.status(204).end();
}
