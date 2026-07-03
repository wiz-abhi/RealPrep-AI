import { Router } from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

export default router;
