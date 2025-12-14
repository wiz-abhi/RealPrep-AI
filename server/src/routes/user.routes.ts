import { Router } from 'express';
import {
    getProfile,
    getStats,
    listResumes,
    deleteResume,
    changePassword,
    updateSettings,
    deleteAccount
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', authenticateToken, getProfile);
router.get('/stats', authenticateToken, getStats);
router.put('/password', authenticateToken, changePassword);
router.put('/settings', authenticateToken, updateSettings);
router.delete('/account', authenticateToken, deleteAccount);

export default router;
