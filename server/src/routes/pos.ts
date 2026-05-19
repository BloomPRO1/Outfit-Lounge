import { Router } from 'express';
import { checkout, getSales, getSaleById } from '../controllers/posController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/checkout', checkout);
router.get('/sales', getSales);
router.get('/sales/:id', getSaleById);

export default router;
