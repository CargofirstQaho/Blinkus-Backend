import { Router } from 'express';
import { protect } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import {
  createBillingAddressController,
  getUserBillingAddressesController,
  getBillingAddressByIdController,
  updateBillingAddressController,
  deleteBillingAddressController,
} from '../controllers/billingController.js';
import { calculateBillingSummaryController } from '../controllers/billingSummaryController.js';
import {
  createBillingAddressValidator,
  updateBillingAddressValidator,
  billingAddressIdValidator,
  calculateSummaryValidator,
} from '../validators/billingValidator.js';

const router = Router();

router.use(protect);

router.post('/',                      createBillingAddressValidator,  validate, createBillingAddressController);
router.get('/getBillingAddresses',                                               getUserBillingAddressesController);
router.post('/calculate-summary',     calculateSummaryValidator,      validate, calculateBillingSummaryController);
router.get('/:billingAddressId',      billingAddressIdValidator,      validate, getBillingAddressByIdController);
router.put('/:billingAddressId',      updateBillingAddressValidator,  validate, updateBillingAddressController);
router.delete('/:billingAddressId',   billingAddressIdValidator,      validate, deleteBillingAddressController);

export default router;
