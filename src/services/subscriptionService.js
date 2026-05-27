import { PLAN_DEFS, ALL_FEATURES } from '../config/plans.js';
import { features } from '../config/features.js';

// Returns the feature permission array for a user.
// When subscriptions are disabled, everyone gets all features.
export function getPermissionsForUser(user) {
  if (!features.SUBSCRIPTIONS) return ALL_FEATURES;
  if (user.isPremium && user.plan !== 'free') {
    return PLAN_DEFS[user.plan]?.features ?? ALL_FEATURES;
  }
  return PLAN_DEFS.free.features;
}

// Returns the daily AI question limit for a user.
// When usage limits are disabled, returns Infinity.
export function getAiDailyLimit(user) {
  if (!features.USAGE_LIMITS) return Infinity;
  const plan = PLAN_DEFS[user.plan];
  return plan?.aiQuestionsPerDay ?? PLAN_DEFS.free.aiQuestionsPerDay;
}

// Computes first-time bonus months for a plan type.
// Each bonus type is granted at most once per user lifetime.
export function computeBonusMonths(planType, user) {
  if (planType === 'biannual' && !user.bonusUsed?.biannual) {
    return PLAN_DEFS.biannual.bonusMonths;
  }
  if (planType === 'yearly' && !user.bonusUsed?.yearly) {
    return PLAN_DEFS.yearly.bonusMonths;
  }
  return 0;
}
