import { Router } from 'express';
import * as controller from '../controllers/dashboardController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);
router.get('/stats', controller.stats);
router.get('/recent-products', controller.recentProducts);
router.get('/recent-transactions', controller.recentTransactions);
router.get('/category-summary', controller.categorySummary);

export default router;
