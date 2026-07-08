import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { AdminAuthRequest } from '../middleware/adminAuth';

// No public registration — the admin account is provisioned directly in the
// database (see website/database_changes.md). This only authenticates.
export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const result = await pool.query(
    `SELECT id, name, email, password_hash, is_active FROM website_admins WHERE email = $1`,
    [String(email).toLowerCase().trim()]
  );

  const admin = result.rows[0];
  if (!admin || !admin.is_active) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    env.ADMIN_JWT_SECRET,
    { expiresIn: env.ADMIN_JWT_EXPIRES_IN } as jwt.SignOptions
  );

  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
}

export async function getAdminMe(req: AdminAuthRequest, res: Response): Promise<void> {
  const result = await pool.query(`SELECT id, name, email, created_at FROM website_admins WHERE id = $1`, [
    req.admin?.id,
  ]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Admin not found' });
    return;
  }
  res.json(result.rows[0]);
}
