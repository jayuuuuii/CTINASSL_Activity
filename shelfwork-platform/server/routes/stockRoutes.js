import { Router } from 'express';
import * as controller from '../controllers/stockController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);
router.get('/transactions', controller.transactions);
router.post('/in', controller.stockIn);
router.post('/out', controller.stockOut);
router.post('/adjust', controller.adjust);
router.get('/low', controller.low);
router.get('/out-of-stock', controller.outOfStock);

export default router;
