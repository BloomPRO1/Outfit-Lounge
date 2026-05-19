import { Router } from 'express';
import {
  getRentals, getRentalById, createRental,
  updateRentalStatus, addPayment, getUpcomingReturns,
} from '../controllers/rentalController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/upcoming-returns', getUpcomingReturns);
router.get('/', getRentals);
router.get('/:id', getRentalById);
router.post('/', createRental);
router.patch('/:id/status', updateRentalStatus);
router.post('/:id/payments', addPayment);

export default router;
