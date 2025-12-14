import { Router } from 'express';
import { uploadReference } from '../controllers/reference.controller';

const router = Router();

router.post('/', uploadReference);

export default router;
