import { features } from '../config/features.js';
import { getAiDailyLimit } from '../modules/subscription/services/subscriptionService.js';
import { getTodayUsage } from '../modules/chat/services/usageService.js';
import { errorHandler } from '../utils/errorHandler.js';

export const checkUsageLimit = async (req, res, next) => {
  try {
    if (!features.USAGE_LIMITS) return next();

    const limit = getAiDailyLimit(req.user);
    if (limit === Infinity) return next();

    const used = await getTodayUsage(req.user._id);
    if (used >= limit) {
      return next(errorHandler(429, `Daily limit reached (${limit} AI questions/day on the Free plan). Upgrade to continue.`));
    }

    next();
  } catch (error) {
    return next(error);
  }
};
