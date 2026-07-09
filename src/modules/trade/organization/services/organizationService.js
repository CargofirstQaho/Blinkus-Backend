import Organization from '../models/Organization.js';
import { errorHandler } from '../../../../utils/errorHandler.js';

const ORGANIZATION_LOCKED_MESSAGE = 'Organization has already been registered and cannot be modified.';
const ORGANIZATION_EMAIL_TAKEN_MESSAGE = 'An organization with this email has already been registered.';

function buildPayload(body) {
  const gst = body.gstNumber?.trim()?.toUpperCase() || null;
  return {
    organizationName:  body.organizationName,
    organizationEmail: body.organizationEmail,
    logoKey: body.logoKey || null,
    location:          body.location,
    gstNumber:         gst,
    contact: {
      address: body.contact?.address || '',
      pinCode: body.contact?.pinCode || '',
      phone:   body.contact?.phone || '',
      website: body.contact?.website || '',
    },
    regionalInformation: {
      timezone:           body.regionalInformation?.timezone || '',
      country:            body.regionalInformation?.country || '',
      countryCode:        body.regionalInformation?.countryCode || '',
      financialYearStart: body.regionalInformation?.financialYearStart || '',
      dateFormat:         body.regionalInformation?.dateFormat || '',
    },
    kyc: {
      gst: { number: gst },
    },
  };
}

export async function getOrganizationByUser(userId) {
  return Organization.findOne({ user: userId });
}

export async function createOrganization(userId, body) {
  const existingForUser = await getOrganizationByUser(userId);
  if (existingForUser) {
    throw errorHandler(409, ORGANIZATION_LOCKED_MESSAGE);
  }

  const payload = buildPayload(body);

  const existingForEmail = await Organization.findOne({ organizationEmail: payload.organizationEmail });
  if (existingForEmail) {
    throw errorHandler(409, ORGANIZATION_EMAIL_TAKEN_MESSAGE);
  }

  const now = new Date();

  try {
    const organization = await Organization.create({
      ...payload,
      user: userId,
      status: 'active',
      isLocked: true,
      organizationStatus: 'ACTIVE',
      organizationCreatedAt: now,
    });

    return organization;
  } catch (err) {
    if (err?.code === 11000) {
      throw errorHandler(409, ORGANIZATION_LOCKED_MESSAGE);
    }
    throw err;
  }
}

export async function updateKycField(organization, field, number) {
  if (!['aadhaar', 'pan', 'gst'].includes(field)) {
    throw errorHandler(400, 'Invalid verification field');
  }

  organization.kyc[field].number = number;
  organization.kyc[field].status = 'pending';
  organization.kyc[field].verified = false;
  organization.kyc[field].verifiedAt = null;
  await organization.save();

  return organization;
}

export async function applyVerificationResult(organization, field, result) {
  organization.kyc[field].status = result.status;
  organization.kyc[field].verified = result.status === 'verified';
  organization.kyc[field].verifiedAt = result.status === 'verified' ? new Date() : null;
  await organization.save();

  return organization;
}

export const ORGANIZATION_LOCK_MESSAGES = {
  alreadyRegistered: ORGANIZATION_LOCKED_MESSAGE,
  emailTaken:        ORGANIZATION_EMAIL_TAKEN_MESSAGE,
};
