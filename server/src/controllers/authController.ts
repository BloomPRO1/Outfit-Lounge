import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const result = await db.query(
    `SELECT id, name, email, password_hash, role, is_active, avatar_url, phone FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as any
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
      phone: user.phone,
    },
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const result = await db.query(
    `SELECT id, name, email, role, is_active, avatar_url, phone, created_at FROM users WHERE id = $1`,
    [req.user?.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(result.rows[0]);
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  const result = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user?.id]);
  const user = result.rows[0];

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, req.user?.id]);

  res.json({ message: 'Password changed successfully' });
}
