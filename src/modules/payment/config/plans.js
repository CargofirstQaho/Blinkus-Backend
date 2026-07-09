import { PLAN_NAMES, PLAN_PRICES, PLAN_DURATION_DAYS } from '../../../config/paymentConfig.js';

export const PLANS = Object.freeze({
  [PLAN_NAMES.FREE]: {
    planName:       PLAN_NAMES.FREE,
    displayName:    'Free',
    amount:         PLAN_PRICES[PLAN_NAMES.FREE],
    currency:       'USD',
    durationInDays: PLAN_DURATION_DAYS[PLAN_NAMES.FREE],
  },
  [PLAN_NAMES.MONTHLY]: {
    planName:       PLAN_NAMES.MONTHLY,
    displayName:    'Monthly',
    amount:         PLAN_PRICES[PLAN_NAMES.MONTHLY],
    currency:       'USD',
    durationInDays: PLAN_DURATION_DAYS[PLAN_NAMES.MONTHLY],
  },
  [PLAN_NAMES.SIX_MONTHS]: {
    planName:       PLAN_NAMES.SIX_MONTHS,
    displayName:    '6 Months',
    amount:         PLAN_PRICES[PLAN_NAMES.SIX_MONTHS],
    currency:       'USD',
    durationInDays: PLAN_DURATION_DAYS[PLAN_NAMES.SIX_MONTHS],
  },
  [PLAN_NAMES.YEARLY]: {
    planName:       PLAN_NAMES.YEARLY,
    displayName:    'Yearly',
    amount:         PLAN_PRICES[PLAN_NAMES.YEARLY],
    currency:       'USD',
    durationInDays: PLAN_DURATION_DAYS[PLAN_NAMES.YEARLY],
  },
});

export function getPlanById(planName) {
  return PLANS[planName] ?? null;
}

export function getAllPlans() {
  return Object.values(PLANS);
}

export function getPaidPlans() {
  return getAllPlans().filter((p) => p.amount > 0);
}
