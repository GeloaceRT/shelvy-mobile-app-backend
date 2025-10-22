import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.loginUser);
router.post('/logout', authController.logoutUser);

export default router;