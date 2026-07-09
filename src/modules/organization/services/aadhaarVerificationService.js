import { callSandboxVerificationApi } from '../utils/sandboxClient.js';

const AADHAAR_REGEX = /^\d{12}$/;

export function isValidAadhaarFormat(number) {
  return AADHAAR_REGEX.test(number);
}

export async function verifyAadhaar(number) {
  if (!isValidAadhaarFormat(number)) {
    return { status: 'failed', reason: 'Aadhaar number must be a 12-digit number' };
  }

  return callSandboxVerificationApi({
    endpoint: '/kyc/aadhaar/verify',
    payload: { aadhaar_number: number },
  });
}
