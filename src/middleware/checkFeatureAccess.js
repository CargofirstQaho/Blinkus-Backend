import { features } from '../config/features.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';


export const checkFeatureAccess = (feature) =>
  asyncHandler(async (req, res, next) => {
    if (!features.SUBSCRIPTIONS) return next();
    if (req.user.permissions?.includes(feature)) return next();
    throw new ApiError(403, `Your current plan does not include access to this feature.`);
  });
