import { Router } from 'express';
import * as controller from '../controllers/cartController.js';
import { validateId } from '../middleware/validateId.js';
import { requireCustomer } from '../middleware/auth.js';

const router = Router();
const productId = validateId('PRD', 'Product', 'productId');

// Guests keep their cart in the browser; this prices it without logging in.
router.post('/preview', controller.preview);

router.use(requireCustomer);
router.get('/', controller.get);
router.post('/items', controller.add);
router.put('/items/:productId', productId, controller.update);
router.delete('/items/:productId', productId, controller.remove);
router.delete('/', controller.clear);
router.post('/merge', controller.merge);

export default router;
