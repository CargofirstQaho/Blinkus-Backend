import { PLAN_DEFS, ALL_FEATURES } from '../../../config/plans.js';
import { features } from '../../../config/features.js';
import { FREE_AI_LIMIT } from '../../../config/aiUsageConfig.js';
import { isTradeActive } from './entitlementService.js';

export function getPermissionsForUser(user) {
  if (!features.SUBSCRIPTIONS) return ALL_FEATURES;
  if (user.isPremium && user.plan !== 'free') {
    return PLAN_DEFS[user.plan]?.features ?? ALL_FEATURES;
  }
  return PLAN_DEFS.free.features;
}

export function getAiDailyLimit(user) {
  if (!features.USAGE_LIMITS) return Infinity;
  if (isTradeActive(user)) return Infinity;
  return FREE_AI_LIMIT;
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
