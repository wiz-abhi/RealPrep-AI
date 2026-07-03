import { Router } from 'express';
import { uploadReference } from '../controllers/reference.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, uploadReference);

export default router;
