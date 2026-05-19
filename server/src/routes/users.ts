import { Router } from 'express';
import {
  getUsers, createUser, updateUser,
  resetUserPassword, deactivateUser,
} from '../controllers/usersController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireManagerOrAbove } from '../middleware/roles';

const router = Router();
router.use(authenticate);

router.get('/', requireManagerOrAbove, getUsers);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireManagerOrAbove, updateUser);
router.post('/:id/reset-password', requireAdmin, resetUserPassword);
router.delete('/:id', requireAdmin, deactivateUser);

export default router;
