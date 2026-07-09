import { getAuditLogs } from '../services/auditService.js';

export async function listAuditLogs(req, res, next) {
  try {
    const {
      userId, organizationId, action, module, resourceType, resourceId,
      status, startDate, endDate, page, limit,
    } = req.query;

    const result = await getAuditLogs({
      userId, organizationId, action, module, resourceType, resourceId,
      status, startDate, endDate, page, limit,
    });

    return res.status(200).json({ success: true, message: 'Success', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getMyActivity(req, res, next) {
  try {
    const { action, module, status, startDate, endDate, page, limit } = req.query;

    const result = await getAuditLogs({
      userId: req.user._id,
      action, module, status, startDate, endDate, page, limit,
    });

    return res.status(200).json({ success: true, message: 'Success', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getOrganizationActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { action, module, status, startDate, endDate, page, limit } = req.query;

    const result = await getAuditLogs({
      organizationId: id,
      action, module, status, startDate, endDate, page, limit,
    });

    return res.status(200).json({ success: true, message: 'Success', data: result });
  } catch (error) {
    return next(error);
  }
}
