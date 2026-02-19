import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/create-order', authenticateToken, createOrder);
router.post('/verify', authenticateToken, verifyPayment);

export default router;
