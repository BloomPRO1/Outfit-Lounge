import { Router } from 'express';
import { getAnalytics, listCapital, addCapital, deleteCapital } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAbove } from '../middleware/roles';

const router = Router();

router.get('/', authenticate, getAnalytics);
router.get('/capital', authenticate, listCapital);
router.post('/capital', authenticate, requireManagerOrAbove, addCapital);
router.delete('/capital/:id', authenticate, requireManagerOrAbove, deleteCapital);

export default router;
