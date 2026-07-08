import { Router } from 'express';
import {
  listAdminPromotions,
  getAdminPromotion,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  toggleAdminPromotion,
  listAllCategories,
} from '../controllers/adminPromotionsController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use('/admin/promotions', authenticateAdmin);
router.get('/admin/promotions', asyncHandler(listAdminPromotions));
router.get('/admin/promotions/:id', asyncHandler(getAdminPromotion));
router.post('/admin/promotions', asyncHandler(createAdminPromotion));
router.put('/admin/promotions/:id', asyncHandler(updateAdminPromotion));
router.delete('/admin/promotions/:id', asyncHandler(deleteAdminPromotion));
router.patch('/admin/promotions/:id/toggle', asyncHandler(toggleAdminPromotion));

router.use('/admin/categories', authenticateAdmin);
router.get('/admin/categories', asyncHandler(listAllCategories));

export default router;
