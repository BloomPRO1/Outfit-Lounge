import { Router, Response, NextFunction } from 'express';
import {
  listPromotionCodes,
  validatePromotionCode,
  createPromotionCode,
  updatePromotionCode,
  togglePromotionCode,
  deletePromotionCode,
} from '../controllers/promotionCodesController';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function requireManagerOrAbove(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Forbidden: manager or admin required' });
    return;
  }
  next();
}

router.get('/',             listPromotionCodes);
router.get('/validate',     validatePromotionCode);
router.post('/',            requireManagerOrAbove, createPromotionCode);
router.patch('/:id',        requireManagerOrAbove, updatePromotionCode);
router.patch('/:id/toggle', requireManagerOrAbove, togglePromotionCode);
router.delete('/:id',       requireManagerOrAbove, deletePromotionCode);

export default router;
