import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminAuthRequest extends Request {
  admin?: { id: string; email: string; name: string };
}

export function authenticateAdmin(req: AdminAuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
    };
    req.admin = { id: decoded.id, email: decoded.email, name: decoded.name };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}
