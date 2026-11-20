import { Router } from 'express';
import express from 'express';
import * as controller from '../controllers/productController.js';
import { validateId } from '../middleware/validateId.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const id = validateId('PRD', 'Product');
const imageBody = express.json({ limit: '3mb' }); // images are sent as base64 (about 2 MB of image)

// Public (shoppers see only products that are for sale; admins see all)
router.get('/', optionalAuth, controller.list);
router.get('/:id', id, optionalAuth, controller.get);
router.get('/:id/availability', id, controller.availability);

// Admin only
router.post('/', requireAdmin, controller.create);
router.put('/:id', id, requireAdmin, controller.update);
router.delete('/:id', id, requireAdmin, controller.remove);
router.put('/:id/image', id, requireAdmin, imageBody, controller.uploadImage);
router.delete('/:id/image', id, requireAdmin, controller.removeImage);

export default router;
