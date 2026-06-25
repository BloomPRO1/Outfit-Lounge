import { Router } from 'express';
import { openSession, closeSession, getCurrentSession, listSessions } from '../controllers/cashSessionController';
import { authenticate } from '../middleware/auth';
import { requireCashierOrAbove, requireManagerOrAbove } from '../middleware/roles';

const router = Router();
router.use(authenticate);

router.get('/current',  requireCashierOrAbove, getCurrentSession);
router.post('/open',    requireCashierOrAbove, openSession);
router.post('/close',   requireCashierOrAbove, closeSession);
router.get('/',         requireManagerOrAbove, listSessions);

export default router;
