import { createAuditLog } from '../services/auditService.js';
import { AUDIT_STATUS } from '../constants/auditActions.js';
import { errorHandler } from '../../../utils/errorHandler.js';

export function auditMiddleware(action, options = {}) {
  return function (req, res, next) {
    res.on('finish', () => {
      const status = res.statusCode < 400 ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.FAILURE;

      createAuditLog({
        req,
        userId: req.user?._id || null,
        organizationId: typeof options.getOrganizationId === 'function' ? options.getOrganizationId(req, res) : null,
        action,
        module: options.module,
        resourceType: options.resourceType || null,
        resourceId: typeof options.getResourceId === 'function' ? options.getResourceId(req, res) : (req.params?.id || null),
        description: options.description || '',
        status,
        metadata: typeof options.getMetadata === 'function' ? options.getMetadata(req, res) : {},
      });
    });

    next();
  };
}

export async function requireAdmin(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(errorHandler(403, 'Admin access required'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
