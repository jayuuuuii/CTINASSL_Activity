import { Router } from 'express';
import * as controller from '../controllers/orderController.js';
import { validateId } from '../middleware/validateId.js';
import { authenticate, requireAdmin, requireCustomer } from '../middleware/auth.js';

const router = Router();
const id = validateId('ORD', 'Order');

router.post('/', requireCustomer, controller.create);
router.get('/', authenticate, controller.list);
router.get('/my-orders', authenticate, controller.mine); // must come before /:id
router.get('/:id', id, authenticate, controller.get);
router.put('/:id/status', id, requireAdmin, controller.updateStatus);
router.put('/:id/cancel', id, authenticate, controller.cancel);

export default router;
