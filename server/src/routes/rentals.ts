import { Router } from 'express';
import {
  getRentals, getRentalById, createRental,
  updateRentalStatus, updateRentalDetails, addPayment, getUpcomingReturns, getAvailability,
  sendReturnReminder,
} from '../controllers/rentalController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/upcoming-returns', getUpcomingReturns);
router.get('/availability', getAvailability);
router.get('/', getRentals);
router.get('/:id', getRentalById);
router.post('/', createRental);
router.patch('/:id/status', updateRentalStatus);
router.patch('/:id/details', updateRentalDetails);
router.post('/:id/payments', addPayment);
router.post('/:id/send-reminder', sendReturnReminder);

export default router;
