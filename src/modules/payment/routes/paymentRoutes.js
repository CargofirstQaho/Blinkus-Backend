import { Router } from 'express';
import { protect } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { createOrderValidator, verifyPaymentValidator } from '../validators/paymentValidator.js';
import {
  createOrderController,
  verifyPaymentController,
  getPaymentHistoryController,
  getCurrentSubscriptionController,
} from '../controllers/paymentController.js';

const router = Router();

router.use(protect);

router.post('/create-order',           createOrderValidator,   validate, createOrderController);
router.post('/verify-payment',         verifyPaymentValidator, validate, verifyPaymentController);
router.get('/history',                 getPaymentHistoryController);
router.get('/current-subscription',    getCurrentSubscriptionController);

export default router;
