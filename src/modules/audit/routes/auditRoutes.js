import { Router } from 'express';
import { protect } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { requireAdmin } from '../middleware/auditMiddleware.js';
import {
  listAuditLogsValidator,
  organizationIdParamValidator,
} from '../validators/auditValidator.js';
import {
  listAuditLogs,
  getMyActivity,
  getOrganizationActivity,
} from '../controllers/auditController.js';

const router = Router();

router.use(protect);

router.get('/my-activity', listAuditLogsValidator, validate, getMyActivity);
router.get('/organizations/:id', organizationIdParamValidator, listAuditLogsValidator, validate, requireAdmin, getOrganizationActivity);
router.get('/logs', listAuditLogsValidator, validate, requireAdmin, listAuditLogs);

export default router;
