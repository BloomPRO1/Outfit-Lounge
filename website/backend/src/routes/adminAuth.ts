import { Router } from 'express';
import { adminLogin, getAdminMe } from '../controllers/adminAuthController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/admin/auth/login', asyncHandler(adminLogin));
router.get('/admin/auth/me', authenticateAdmin, asyncHandler(getAdminMe));

export default router;
