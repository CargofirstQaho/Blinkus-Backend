import { PLAN_PRICES, PLAN_DURATION_DAYS, PLAN_NAMES } from '../../../config/paymentConfig.js';

export function getPlanPrice(planName) {
  return PLAN_PRICES[planName] ?? 0;
}

export function getPlanDurationDays(planName) {
  return PLAN_DURATION_DAYS[planName] ?? null;
}

export function calculateExpiryDate(startDate, planName) {
  const days = getPlanDurationDays(planName);
  if (days === null) return null;
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

export function isPaidPlan(planName) {
  return planName !== PLAN_NAMES.FREE;
}

export function getAmountInPaise(usdAmount, exchangeRate) {
  return Math.round(usdAmount * exchangeRate * 100);
}

export function planNameToTradeType(planName) {
  const map = {
    MONTHLY:    'monthly',
    SIX_MONTHS: 'sixMonth',
    YEARLY:     'yearly',
  };
  return map[planName] ?? 'none';
}
