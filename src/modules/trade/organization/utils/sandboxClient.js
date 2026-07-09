export function isSandboxConfigured() {
  return Boolean(process.env.SANDBOX_API_KEY && process.env.SANDBOX_API_SECRET);
}

export async function callSandboxVerificationApi({ endpoint, payload }) {
  if (!isSandboxConfigured()) {
    return {
      status: 'pending',
      reason: 'Sandbox verification gateway is not yet configured',
      raw: null,
    };
  }

  const baseUrl = process.env.SANDBOX_API_BASE_URL || 'https://api.sandbox.co.in';

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SANDBOX_API_KEY}`,
      'x-api-secret': process.env.SANDBOX_API_SECRET,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { status: 'failed', reason: data.message || 'Verification request failed', raw: data };
  }

  return { status: data.verified ? 'verified' : 'failed', reason: data.message || null, raw: data };
}
