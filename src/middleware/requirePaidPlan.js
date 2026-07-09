import { features } from '../config/features.js';
import { errorHandler } from '../utils/errorHandler.js';

export const requirePaidPlan = async (req, res, next) => {
  try {
    if (!features.PLAN_ENFORCEMENT) return next();
    if (req.user.isPremium) return next();
    return next(errorHandler(403, 'This feature requires a paid plan. Upgrade to unlock full access.'));
  } catch (error) {
    return next(error);
  }
};
