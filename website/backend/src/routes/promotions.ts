import { Router } from 'express';
import { listPromotions } from '../controllers/promotionsController';
import { getAccountSummary } from '../controllers/accountController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/promotions', asyncHandler(listPromotions));
router.get('/account/summary', authenticate, asyncHandler(getAccountSummary));

export default router;
