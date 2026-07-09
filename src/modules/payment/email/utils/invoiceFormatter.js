export function formatCurrencySymbol(currency) {
  return currency === 'INR' ? '₹' : '$';
}

export function formatGstRate(gstRate) {
  return `${Math.round(gstRate * 100)}%`;
}

export function formatPaymentMethod(method) {
  if (!method) return '—';
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
}
