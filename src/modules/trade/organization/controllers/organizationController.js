import crypto from 'crypto';
import path from 'path';
import { errorHandler } from '../../../../utils/errorHandler.js';
import {
  getOrganizationByUser,
  createOrganization,
  updateKycField,
  applyVerificationResult,
  ORGANIZATION_LOCK_MESSAGES,
} from '../services/organizationService.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { deleteFile }   from '../../../../services/storage/s3DeleteService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { verifyAadhaar } from '../services/aadhaarVerificationService.js';
import { verifyPan }     from '../services/panVerificationService.js';
import { verifyGst }     from '../services/gstVerificationService.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const VERIFIERS = {
  aadhaar: verifyAadhaar,
  pan:     verifyPan,
  gst:     verifyGst,
};

function buildOrgResponse(organization, logoUrl) {
  const obj = organization.toObject();
  delete obj.logoKey;
  obj.logoUrl = logoUrl;
  return obj;
}

export const getMyOrganization = async (req, res, next) => {
  try {
    const organization = await getOrganizationByUser(req.user._id);
    if (!organization) {
      return res.json({ success: true, message: 'Success', data: { organization: null } });
    }
    const logoUrl = await getSignedUrl(organization.logoKey);
    return res.json({ success: true, message: 'Success', data: { organization: buildOrgResponse(organization, logoUrl) } });
  } catch (error) {
    return next(error);
  }
};

export const saveOrganization = async (req, res, next) => {
  try {
    if (!req.body.logoKey) return next(errorHandler(400, 'Company logo is required'));
    const organization = await createOrganization(req.user._id, req.body);
    const logoUrl = await getSignedUrl(organization.logoKey);

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization._id,
      action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
      module: AUDIT_MODULES.ORGANIZATION,
      resourceType: 'Organization',
      resourceId: organization._id,
      description: 'Organization registered',
      metadata: { organizationName: organization.organizationName },
    });

    return res.status(201).json({ success: true, message: 'Organization registered and locked successfully', data: { organization: buildOrgResponse(organization, logoUrl) } });
  } catch (error) {
    return next(error);
  }
};

export const uploadOrganizationLogoHandler = async (req, res, next) => {
  try {
    if (!req.file) return next(errorHandler(400, 'Logo file is required'));

    const existing = await getOrganizationByUser(req.user._id);
    if (existing) return next(errorHandler(409, ORGANIZATION_LOCK_MESSAGES.alreadyRegistered));

    const ext    = path.extname(req.file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
    const key     = `organizations/logos/${req.user._id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;

    await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype, key });

    await createAuditLog({
      req,
      userId: req.user._id,
      action: AUDIT_ACTIONS.ORGANIZATION_LOGO_UPLOADED,
      module: AUDIT_MODULES.ORGANIZATION,
      resourceType: 'OrganizationLogo',
      description: 'Organization logo uploaded',
      metadata: { key },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'OrganizationLogo',
      description: 'Organization logo uploaded to S3',
      metadata: { key },
    });

    return res.json({ success: true, message: 'Logo uploaded successfully', data: { logoKey: key } });
  } catch (error) {
    return next(error);
  }
};

export const verifyKycField = async (req, res, next) => {
  try {
    const { field, number } = req.body;
    const verifier = VERIFIERS[field];
    if (!verifier) return next(errorHandler(400, 'Invalid verification field'));

    let organization = await getOrganizationByUser(req.user._id);
    if (!organization) return next(errorHandler(404, 'Complete your organization registration before running verification'));

    organization = await updateKycField(organization, field, number);

    const result = await verifier(number);
    organization = await applyVerificationResult(organization, field, result);

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization._id,
      action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
      module: AUDIT_MODULES.ORGANIZATION,
      resourceType: 'Organization',
      resourceId: organization._id,
      description: `KYC field "${field}" verification updated`,
      metadata: { field, status: organization.kyc[field].status },
    });

    const logoUrl = await getSignedUrl(organization.logoKey);

    return res.json({ success: true, message: result.status === 'verified' ? 'Verification successful' : 'Verification submitted', data: {
      field,
      status:  organization.kyc[field].status,
      reason:  result.reason || null,
      organization: buildOrgResponse(organization, logoUrl),
    }});
  } catch (error) {
    return next(error);
  }
};
