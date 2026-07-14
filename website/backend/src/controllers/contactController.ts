import { Request, Response } from 'express';
import { pool } from '../db/pool';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(req: Request, res: Response): Promise<void> {
  const { name, email, phone, subject, message } = req.body ?? {};

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Enter a valid email address' });
    return;
  }
  if (!message || !String(message).trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  await pool.query(
    `INSERT INTO website_contact_submissions (name, email, phone, subject, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      String(name).trim(),
      String(email).toLowerCase().trim(),
      phone ? String(phone).trim() : null,
      subject ? String(subject).trim() : null,
      String(message).trim(),
    ]
  );

  res.status(201).json({ success: true });
}
