import { features } from '../config/features.js';
import { errorHandler } from '../utils/errorHandler.js';

export const checkFeatureAccess = (feature) => async (req, res, next) => {
  try {
    if (!features.SUBSCRIPTIONS) return next();
    if (req.user.permissions?.includes(feature)) return next();
    return next(errorHandler(403, 'Your current plan does not include access to this feature.'));
  } catch (error) {
    return next(error);
  }
};
