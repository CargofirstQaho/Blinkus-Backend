import { Router } from 'express';
import { webhookController } from '../controllers/webhookController.js';

const router = Router();

router.post('/', webhookController);

export default router;
