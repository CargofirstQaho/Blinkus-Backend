import { callSandboxVerificationApi } from '../utils/sandboxClient.js';

const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

export function isValidPanFormat(number) {
  return PAN_REGEX.test(number.toUpperCase());
}

export async function verifyPan(number) {
  const pan = number.toUpperCase();

  if (!isValidPanFormat(pan)) {
    return { status: 'failed', reason: 'PAN must be in the format ABCDE1234F' };
  }

  return callSandboxVerificationApi({
    endpoint: '/kyc/pan/verify',
    payload: { pan_number: pan },
  });
}
