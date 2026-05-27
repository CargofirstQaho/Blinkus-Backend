import { features } from '../config/features.js';
import { getAiDailyLimit } from '../services/subscriptionService.js';
import { getTodayUsage } from '../services/usageService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';


export const checkUsageLimit = asyncHandler(async (req, res, next) => {
  if (!features.USAGE_LIMITS) return next();

  const limit = getAiDailyLimit(req.user);
  if (limit === Infinity) return next();

  const used = await getTodayUsage(req.user._id);
  if (used >= limit) {
    throw new ApiError(429, `Daily limit reached (${limit} AI questions/day on the Free plan). Upgrade to continue.`);
  }

  next();
});
