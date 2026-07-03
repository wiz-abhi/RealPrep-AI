import { Router } from 'express';
import { speechSTT, speechTTS } from '../controllers/speech.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/stt', authenticateToken, speechSTT);
router.post('/tts', authenticateToken, speechTTS);

export default router;
