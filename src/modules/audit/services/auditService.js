import AuditLog from '../models/AuditLog.js';
import { extractRequestContext } from '../utils/requestMeta.js';
import { AUDIT_STATUS } from '../constants/auditActions.js';

export async function createAuditLog({
  req = null,
  userId = null,
  organizationId = null,
  action,
  module,
  resourceType = null,
  resourceId = null,
  description = '',
  status = AUDIT_STATUS.SUCCESS,
  metadata = {},
} = {}) {
  try {
    const requestContext = req ? extractRequestContext(req) : {};

    await AuditLog.create({
      userId: userId || req?.user?._id || null,
      organizationId: organizationId || null,
      action,
      module,
      resourceType,
      resourceId,
      description,
      status,
      metadata,
      ...requestContext,
    });
  } catch (error) {
    console.error('[audit] Failed to create audit log:', error.message);
  }
}

export async function getAuditLogs(filters = {}) {
  const {
    userId,
    organizationId,
    action,
    module,
    resourceType,
    resourceId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const query = {};
  if (userId) query.userId = userId;
  if (organizationId) query.organizationId = organizationId;
  if (action) query.action = action;
  if (module) query.module = module;
  if (resourceType) query.resourceType = resourceType;
  if (resourceId) query.resourceId = resourceId;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  };
}
