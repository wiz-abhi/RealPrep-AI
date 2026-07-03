import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../schemas';

const router = Router();

router.post('/create-order', authenticateToken, validateBody(createOrderSchema), createOrder);
router.post('/verify', authenticateToken, validateBody(verifyPaymentSchema), verifyPayment);

export default router;
