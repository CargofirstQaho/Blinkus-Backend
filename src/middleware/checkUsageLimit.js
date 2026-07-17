import { features } from '../config/features.js';
import { getAiDailyLimit } from '../modules/subscription/services/subscriptionService.js';
import { getTodayUsage } from '../modules/chat/services/usageService.js';
import { getUsagePeriodLabel } from '../modules/chat/utils/aiUsageUtils.js';
import { FREE_AI_LIMIT_PERIOD } from '../config/aiUsageConfig.js';
import { errorHandler } from '../utils/errorHandler.js';

export const checkUsageLimit = async (req, res, next) => {
  try {
    if (!features.USAGE_LIMITS) return next();

    const limit = getAiDailyLimit(req.user);
    if (limit === Infinity) {
      req.aiUsageBypassed = true;
      return next();
    }

    const used = await getTodayUsage(req.user._id);
    if (used >= limit) {
      const period = getUsagePeriodLabel(FREE_AI_LIMIT_PERIOD);
      return next(errorHandler(429, `Free plan limit reached. Upgrade to continue.`));
    }

    next();
  } catch (error) {
    return next(error);
  }
};
