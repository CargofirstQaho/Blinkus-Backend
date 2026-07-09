import { canAccessERP } from '../modules/subscription/services/entitlementService.js';
import { errorHandler } from '../utils/errorHandler.js';

export const requireErpAccess = async (req, res, next) => {
  try {
    const allowed = await canAccessERP(req.user);
    if (!allowed) {
      return next(errorHandler(403, 'An active Trade subscription is required to use this feature.'));
    }
    next();
  } catch (error) {
    return next(error);
  }
};
