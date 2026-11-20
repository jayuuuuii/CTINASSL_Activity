import { Router } from 'express';
import * as controller from '../controllers/adminController.js';
import { validateId } from '../middleware/validateId.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const userId = validateId('USR', 'Customer');

router.use(requireAdmin);
router.get('/dashboard', controller.dashboard);
router.get('/orders', controller.orderList);
router.get('/customers', controller.customers);
router.get('/customers/:id', userId, controller.customer);
router.put('/customers/:id/status', userId, controller.customerStatus);
router.get('/inventory', controller.inventory);
router.get('/transactions', controller.transactions);

export default router;
