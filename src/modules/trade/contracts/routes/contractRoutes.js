import { Router }    from 'express';
import rateLimit     from 'express-rate-limit';
import multer        from 'multer';
import { protect }   from '../../../../middleware/auth.js';
import { validate }  from '../../../../middleware/validate.js';
import { requireActiveTradeSubscription } from '../../../payment/middlewares/requireActiveTradeSubscription.js';
import {
  saveDraftValidator,
  finalizeValidator,
  uploadInitValidator,
} from '../validators/contractValidator.js';
import {
  saveDraft,
  getLatestDraft,
  getById,
  listFinalized,
  finalizeAndGeneratePdf,
  uploadContract,
  uploadSignedContract,
  getShipment,
  updateShipmentStatus,
  deleteDraft,
  checkContractNumber,
  duplicateDraft,
} from '../controllers/contractController.js';
import { auditMiddleware } from '../../../audit/middleware/auditMiddleware.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';

const router = Router();

const MAX_FILE_BYTES = parseInt(process.env.MAX_CONTRACT_FILE_SIZE_MB || '10', 10) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_FILE_BYTES },
});

const finalizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many PDF generation requests, please try again later' },
});

router.use(protect);
router.use(requireActiveTradeSubscription);

router.post('/upload',            upload.single('document'), uploadInitValidator, validate, uploadContract);
router.post('/draft',             saveDraftValidator, validate, saveDraft);
router.get('/draft',              getLatestDraft);
router.delete('/draft',           deleteDraft);
router.get('/finalized',          listFinalized);
router.get('/check-number',       checkContractNumber);
router.get('/:id',                auditMiddleware(AUDIT_ACTIONS.CONTRACT_REVIEWED, { module: AUDIT_MODULES.CONTRACT, resourceType: 'Contract' }), getById);
router.get('/:id/shipment',       getShipment);
router.patch('/:id/shipment-status', updateShipmentStatus);
router.post('/:id/finalize',      finalizeLimiter, finalizeValidator, validate, finalizeAndGeneratePdf);
router.post('/:id/upload-signed', upload.single('document'), uploadSignedContract);
router.post('/:id/duplicate',     duplicateDraft);

export default router;
