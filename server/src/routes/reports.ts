import { Router } from 'express';
import {
  getDashboardStats, getRevenueChart,
  getSalesReport, getRentalReport, getInventoryReport,
} from '../controllers/reportsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/sales', getSalesReport);
router.get('/rentals', getRentalReport);
router.get('/inventory', getInventoryReport);

export default router;
