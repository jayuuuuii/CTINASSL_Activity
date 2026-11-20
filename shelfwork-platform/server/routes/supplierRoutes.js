import { Router } from 'express';
import * as controller from '../controllers/supplierController.js';
import { validateId } from '../middleware/validateId.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const id = validateId('SUP', 'Supplier');

router.use(requireAdmin); // supplier records are internal business data
router.get('/', controller.list);
router.get('/:id', id, controller.get);
router.post('/', controller.create);
router.put('/:id', id, controller.update);
router.delete('/:id', id, controller.remove);

export default router;
