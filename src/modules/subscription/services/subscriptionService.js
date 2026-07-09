import { PLAN_DEFS, ALL_FEATURES } from '../../../config/plans.js';
import { features } from '../../../config/features.js';

export function getPermissionsForUser(user) {
  if (!features.SUBSCRIPTIONS) return ALL_FEATURES;
  if (user.isPremium && user.plan !== 'free') {
    return PLAN_DEFS[user.plan]?.features ?? ALL_FEATURES;
  }
  return PLAN_DEFS.free.features;
}

export function getAiDailyLimit(user) {
  if (!features.USAGE_LIMITS) return Infinity;
  const plan = PLAN_DEFS[user.plan];
  return plan?.aiQuestionsPerDay ?? PLAN_DEFS.free.aiQuestionsPerDay;
}

export function computeBonusMonths(planType, user) {
  if (planType === 'biannual' && !user.bonusUsed?.biannual) {
    return PLAN_DEFS.biannual.bonusMonths;
  }
  if (planType === 'yearly' && !user.bonusUsed?.yearly) {
    return PLAN_DEFS.yearly.bonusMonths;
  }
  return 0;
}
