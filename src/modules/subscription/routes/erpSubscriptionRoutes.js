import { Router } from 'express';
import { getErpSubscriptionStatus, getErpPlans, getPlanHistory } from '../controllers/erpSubscriptionController.js';
import { getPricingPlans } from '../controllers/pricingController.js';
import { protect } from '../../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/status',  getErpSubscriptionStatus);
router.get('/plans',   getErpPlans);
router.get('/history', getPlanHistory);
router.get('/pricing', getPricingPlans);

export default router;
