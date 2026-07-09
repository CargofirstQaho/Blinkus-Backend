import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../../../../middleware/auth.js';
import { validate } from '../../../../middleware/validate.js';
import { requireActiveTradeSubscription } from '../../../payment/middlewares/requireActiveTradeSubscription.js';
import { saveDraftValidator } from '../validators/purchaseOrderValidator.js';
import {
  saveDraft,
  getLatestDraft,
  getById,
  generatePdf,
  deleteDraft,
  duplicateDraft,
} from '../controllers/purchaseOrderController.js';
import { auditMiddleware } from '../../../audit/middleware/auditMiddleware.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';

const router = Router();

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many PDF generation requests, please try again later' },
});

router.use(protect);
router.use(requireActiveTradeSubscription);

router.post('/draft',        saveDraftValidator, validate, saveDraft);
router.get('/draft',         getLatestDraft);
router.get('/:id',           auditMiddleware(AUDIT_ACTIONS.PURCHASE_ORDER_DOWNLOADED, { module: AUDIT_MODULES.PURCHASE_ORDER, resourceType: 'PurchaseOrder' }), getById);
router.post('/:id/generate', generateLimiter, generatePdf);
router.post('/:id/duplicate', duplicateDraft);
router.delete('/draft',      deleteDraft);

export default router;
