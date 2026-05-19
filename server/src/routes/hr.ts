import { Router } from 'express';
import {
  getEmployees, getEmployee, upsertEmployeeProfile,
  getLeaves, applyLeave, reviewLeave, cancelLeave, getLeaveCalendar,
  getPayroll, generatePayroll, updatePayrollRecord, markPaid, bulkMarkPaid,
  addAllowance, deleteAllowance,
} from '../controllers/hrController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAbove } from '../middleware/roles';

const router = Router();
router.use(authenticate);

// Employees
router.get('/employees',              getEmployees);
router.get('/employees/:id',          getEmployee);
router.put('/employees/:id/profile',  requireManagerOrAbove, upsertEmployeeProfile);

// Leaves
router.get('/leaves/calendar',        getLeaveCalendar);
router.get('/leaves',                 getLeaves);
router.post('/leaves',                applyLeave);
router.patch('/leaves/:id/review',    requireManagerOrAbove, reviewLeave);
router.patch('/leaves/:id/cancel',    cancelLeave);

// Payroll
router.get('/payroll',                         requireManagerOrAbove, getPayroll);
router.post('/payroll/generate/:period',        requireManagerOrAbove, generatePayroll);
router.patch('/payroll/:id/pay',               requireManagerOrAbove, markPaid);
router.post('/payroll/pay-all/:period',         requireManagerOrAbove, bulkMarkPaid);
router.patch('/payroll/:id',                   requireManagerOrAbove, updatePayrollRecord);
router.post('/payroll/:id/allowances',          requireManagerOrAbove, addAllowance);
router.delete('/payroll/:id/allowances/:allowanceId', requireManagerOrAbove, deleteAllowance);

export default router;
