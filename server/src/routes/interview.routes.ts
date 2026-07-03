import { Router } from 'express';
import {
    startSession,
    endSession,
    endSessionWithoutReport,
    generateImprovementPlan,
    chat,
    chatStream,
    pauseSession,
    resumeSession,
    evaluateCode,
    getUserSessions,
    getReport,
    clearHistory,
    getSession,
    updateSessionDuration,
    updateElapsedTime,
} from '../controllers/interview.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { startSessionSchema, chatSchema } from '../schemas';

const router = Router();

// All interview endpoints require authentication. Ownership of the session
// is checked inside each handler (a bearer token alone doesn't grant access
// to someone else's sessionId).
router.post('/start', authenticateToken, validateBody(startSessionSchema), startSession);
router.get('/session/:sessionId', authenticateToken, getSession);
router.put('/session/:sessionId/duration', authenticateToken, updateSessionDuration);
router.put('/session/:sessionId/elapsed', authenticateToken, updateElapsedTime);
router.get('/history', authenticateToken, getUserSessions);
router.delete('/clear-history', authenticateToken, clearHistory);
router.get('/report/:sessionId', authenticateToken, getReport);
router.post('/chat', authenticateToken, validateBody(chatSchema), chat);
router.post('/chat-stream', authenticateToken, validateBody(chatSchema), chatStream);
router.post('/pause', authenticateToken, pauseSession);
router.post('/resume', authenticateToken, resumeSession);
router.post('/code', authenticateToken, evaluateCode);
router.post('/end', authenticateToken, endSession);
router.post('/end-quick', authenticateToken, endSessionWithoutReport);
router.post('/improvement-plan', authenticateToken, generateImprovementPlan);

export default router;
