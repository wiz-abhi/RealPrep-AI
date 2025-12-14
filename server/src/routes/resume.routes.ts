import { Router } from 'express';
import { uploadResume } from '../controllers/resume.controller';
import { listResumes, deleteResume } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/upload', uploadResume);
router.get('/list', authenticateToken, listResumes);
router.delete('/:resumeId', authenticateToken, deleteResume);

export default router;
