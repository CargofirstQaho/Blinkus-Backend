import { callSandboxVerificationApi } from '../utils/sandboxClient.js';

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

export function isValidGstFormat(number) {
  return GST_REGEX.test(number.toUpperCase());
}

export async function verifyGst(number) {
  const gst = number.toUpperCase();

  if (!isValidGstFormat(gst)) {
    return { status: 'failed', reason: 'GST number format is invalid' };
  }

  return callSandboxVerificationApi({
    endpoint: '/kyc/gst/verify',
    payload: { gstin: gst },
  });
}
