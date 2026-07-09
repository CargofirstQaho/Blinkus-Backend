import mongoose from 'mongoose';
import { PAYMENT_EVENT_TYPES } from '../../../config/paymentConfig.js';

const paymentAuditSchema = new mongoose.Schema(
  {
    eventType: {
      type:     String,
      enum:     Object.values(PAYMENT_EVENT_TYPES),
      required: true,
      trim:     true,
      index:    true,
    },
    userId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      index:   true,
    },
    paymentId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'PaymentRecord',
      default: null,
      index:   true,
    },
    payload: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type:    String,
      default: null,
      trim:    true,
    },
    userAgent: {
      type:    String,
      default: null,
      trim:    true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

paymentAuditSchema.index({ createdAt: -1 });
paymentAuditSchema.index({ userId: 1, createdAt: -1 });
paymentAuditSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.model('PaymentAudit', paymentAuditSchema);
