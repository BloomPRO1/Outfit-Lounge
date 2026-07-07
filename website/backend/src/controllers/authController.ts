import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(customer: { id: string; email: string; name: string }): string {
  return jwt.sign(customer, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, phone } = req.body ?? {};

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Enter a valid email address' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO website_customers (name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, created_at`,
      [String(name).trim(), normalizedEmail, passwordHash, phone ? String(phone).trim() : null]
    );
    const customer = result.rows[0];
    const token = signToken({ id: customer.id, email: customer.email, name: customer.name });
    res.status(201).json({ token, customer });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const result = await pool.query(
    `SELECT id, name, email, password_hash, phone, is_active FROM website_customers WHERE email = $1`,
    [String(email).toLowerCase().trim()]
  );

  const customer = result.rows[0];
  if (!customer || !customer.is_active) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({ id: customer.id, email: customer.email, name: customer.name });
  res.json({
    token,
    customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT id, name, email, phone, created_at FROM website_customers WHERE id = $1`,
    [req.customer?.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json(result.rows[0]);
}
