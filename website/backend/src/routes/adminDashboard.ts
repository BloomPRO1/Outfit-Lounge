import { Router } from 'express';
import {
  getOverview,
  listAdminProducts,
  listAdminOrders,
  listAdminRentals,
  listAdminCustomers,
} from '../controllers/adminDashboardController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use('/admin/dashboard', authenticateAdmin);
router.get('/admin/dashboard/overview', asyncHandler(getOverview));
router.get('/admin/dashboard/products', asyncHandler(listAdminProducts));
router.get('/admin/dashboard/orders', asyncHandler(listAdminOrders));
router.get('/admin/dashboard/rentals', asyncHandler(listAdminRentals));
router.get('/admin/dashboard/customers', asyncHandler(listAdminCustomers));

export default router;
