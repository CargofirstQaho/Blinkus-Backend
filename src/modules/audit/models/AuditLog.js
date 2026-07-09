import mongoose from 'mongoose';
import { AUDIT_STATUS } from '../constants/auditActions.js';

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },

    resourceType: { type: String, default: null, trim: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },

    description: { type: String, default: '', trim: true },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    browser: { type: String, default: null },
    operatingSystem: { type: String, default: null },
    deviceType: { type: String, default: null },

    requestMethod: { type: String, default: null },
    requestUrl: { type: String, default: null },

    status: { type: String, enum: Object.values(AUDIT_STATUS), default: AUDIT_STATUS.SUCCESS },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
