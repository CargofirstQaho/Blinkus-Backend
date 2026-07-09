import { Router } from 'express';
import rateLimit   from 'express-rate-limit';
import { protect } from '../../../../middleware/auth.js';
import { validate } from '../../../../middleware/validate.js';
import { requireActiveTradeSubscription } from '../../../payment/middlewares/requireActiveTradeSubscription.js';
import { saveDraftValidator, generateValidator } from '../validators/commercialInvoiceValidator.js';
import {
  saveDraft,
  getLatestDraft,
  getById,
  generatePdf,
  deleteDraft,
  duplicateDraft,
} from '../controllers/commercialInvoiceController.js';
import { auditMiddleware } from '../../../audit/middleware/auditMiddleware.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';

const router = Router();

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  'Too many PDF requests. Please try again later.',
});

router.use(protect);
router.use(requireActiveTradeSubscription);

router.post(  '/draft',          saveDraftValidator, validate, saveDraft);
router.get(   '/draft',          getLatestDraft);
router.get(   '/:id',            auditMiddleware(AUDIT_ACTIONS.COMMERCIAL_INVOICE_DOWNLOADED, { module: AUDIT_MODULES.COMMERCIAL_INVOICE, resourceType: 'CommercialInvoice' }), getById);
router.post(  '/:id/generate',   generateLimiter, generateValidator, validate, generatePdf);
router.post(  '/:id/duplicate',  duplicateDraft);
router.delete('/draft',          deleteDraft);

export default router;
