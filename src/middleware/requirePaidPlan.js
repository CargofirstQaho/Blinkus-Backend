import { features } from '../config/features.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';


export const requirePaidPlan = asyncHandler(async (req, res, next) => {
  if (!features.PLAN_ENFORCEMENT) return next();
  if (req.user.isPremium) return next();
  throw new ApiError(403, 'This feature requires a paid plan. Upgrade to unlock full access.');
});
