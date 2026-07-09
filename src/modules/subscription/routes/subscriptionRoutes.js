import { Router } from 'express';
import { getCurrentPlan } from '../controllers/subscriptionController.js';
import { protect } from '../../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/plan', getCurrentPlan);

export default router;
