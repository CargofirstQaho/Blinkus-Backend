function maskValue(value) {
  if (!value || typeof value !== 'string') return '[MISSING]';
  if (value.length <= 6) return '***';
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
}

function buildEntry(level, event, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };
}

export function logPaymentEvent(event, data = {}) {
  console.log(JSON.stringify(buildEntry('INFO', event, data)));
}

export function logRazorpayEvent(event, data = {}) {
  console.log(JSON.stringify(buildEntry('INFO', event, { source: 'razorpay', ...data })));
}

export function logPaymentError(event, error, data = {}) {
  console.error(JSON.stringify(buildEntry('ERROR', event, {
    message: error?.message || String(error),
    ...data,
  })));
}

export function logAuditEntry(event, data = {}) {
  console.log(JSON.stringify(buildEntry('AUDIT', event, data)));
}

export { maskValue };
