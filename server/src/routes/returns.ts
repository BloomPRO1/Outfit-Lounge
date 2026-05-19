import { Router } from 'express';
import { getPendingReturns, processReturn, getFineCalculation } from '../controllers/returnController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/pending', getPendingReturns);
router.get('/:rentalId/fine', getFineCalculation);
router.post('/:rentalId/process', processReturn);

export default router;
