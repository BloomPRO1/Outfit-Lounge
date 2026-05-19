import { Router } from 'express';
import {
  getCustomers, getCustomerById, createCustomer,
  updateCustomer, deleteCustomer, searchCustomers,
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/search', searchCustomers);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
