import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/admin/login', controller.adminLogin);
router.post('/logout', authenticate, controller.logout);
router.get('/profile', authenticate, controller.profile);
router.put('/profile', authenticate, controller.updateProfile);

export default router;
