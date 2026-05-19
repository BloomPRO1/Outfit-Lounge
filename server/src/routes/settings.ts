import { Router } from 'express';
import { getSettings, updateSettings, getSetting } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import { requireManagerOrAbove } from '../middleware/roles';

const router = Router();
router.use(authenticate);

router.get('/', getSettings);
router.get('/:key', getSetting);
router.put('/', requireManagerOrAbove, updateSettings);

export default router;
