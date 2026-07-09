import { Router } from 'express';
import { protect } from '../../../../middleware/auth.js';
import { validate } from '../../../../middleware/validate.js';
import { requireActiveTradeSubscription } from '../../../payment/middlewares/requireActiveTradeSubscription.js';
import { createOrganizationValidator } from '../validators/organizationValidator.js';
import { uploadOrganizationLogo } from '../utils/logoUpload.js';
import {
  getMyOrganization,
  saveOrganization,
  uploadOrganizationLogoHandler,
} from '../controllers/organizationController.js';

const router = Router();
router.use(protect);
router.use(requireActiveTradeSubscription);

router.get('/',      getMyOrganization);
router.put('/',      createOrganizationValidator, validate, saveOrganization);
router.post('/logo', uploadOrganizationLogo.single('logo'), uploadOrganizationLogoHandler);

export default router;
