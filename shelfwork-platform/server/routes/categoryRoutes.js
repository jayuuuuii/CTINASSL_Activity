import { Router } from 'express';
import * as controller from '../controllers/categoryController.js';
import { validateId } from '../middleware/validateId.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const id = validateId('CAT', 'Category');

router.get('/', controller.list); // public: the shop shows categories
router.get('/:id', id, controller.get);
router.post('/', requireAdmin, controller.create);
router.put('/:id', id, requireAdmin, controller.update);
router.delete('/:id', id, requireAdmin, controller.remove);

export default router;
