import { Router } from 'express';
import { checkout } from '../controllers/checkoutController';
import { createBooking } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/checkout', authenticate, asyncHandler(checkout));
router.post('/bookings', authenticate, asyncHandler(createBooking));

export default router;
