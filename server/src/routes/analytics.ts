import { Router } from 'express';
import { getAnalytics, getDailySalesByPayment, getDailySalesDetail, listCapital, addCapital, deleteCapital } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAbove } from '../middleware/roles';

const router = Router();

router.get('/', authenticate, getAnalytics);
router.get('/daily-sales', authenticate, getDailySalesByPayment);
router.get('/daily-sales-detail', authenticate, getDailySalesDetail);
router.get('/capital', authenticate, listCapital);
router.post('/capital', authenticate, requireManagerOrAbove, addCapital);
router.delete('/capital/:id', authenticate, requireManagerOrAbove, deleteCapital);

export default router;
