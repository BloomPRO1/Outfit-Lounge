import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

export const requireAdmin = requireRoles('super_admin');
export const requireManagerOrAbove = requireRoles('super_admin', 'manager');
export const requireCashierOrAbove = requireRoles('super_admin', 'manager', 'cashier');
export const requireStaffOrAbove = requireRoles('super_admin', 'manager', 'cashier', 'inventory_staff');
