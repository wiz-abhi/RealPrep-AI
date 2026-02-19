import { Router } from 'express';
import { getAllUsers, updateUserCredits } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// All admin routes require authentication + admin role
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.put('/users/:userId/credits', authenticateToken, requireAdmin, updateUserCredits);

export default router;
