import { Router } from 'express';
import { submitContact } from '../controllers/contactController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/contact', asyncHandler(submitContact));

export default router;
