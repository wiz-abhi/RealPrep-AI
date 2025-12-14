import { Router } from 'express';
import { startSession, endSession, getAccessToken, chat, getUserSessions, getReport } from '../controllers/interview.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/token', getAccessToken);
router.post('/start', authenticateToken, startSession);
router.get('/history', authenticateToken, getUserSessions);
router.get('/report/:sessionId', getReport);
router.post('/chat', chat);
router.post('/end', endSession);

export default router;
