import { Router } from 'express';
import {
  getInventory, getInventorySummary, recordMovement,
  getMovements, getLowStockAlerts,
} from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', getInventorySummary);
router.get('/low-stock', getLowStockAlerts);
router.get('/movements', getMovements);
router.get('/', getInventory);
router.post('/movements', recordMovement);

export default router;
