import mongoose from 'mongoose';
import {
  PLAN_NAMES,
  BILLING_CYCLES,
  SUBSCRIPTION_STATUSES,
} from '../../../config/paymentConfig.js';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    organizationId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Organization',
      default: null,
      index:   true,
    },
    planName: {
      type:     String,
      enum:     Object.values(PLAN_NAMES),
      required: true,
    },
    billingCycle: {
      type:     String,
      enum:     Object.values(BILLING_CYCLES),
      required: true,
    },
    status: {
      type:    String,
      enum:    Object.values(SUBSCRIPTION_STATUSES),
      default: SUBSCRIPTION_STATUSES.PENDING_PAYMENT,
      index:   true,
    },
    startDate:  { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    autoRenew:  { type: Boolean, default: false },
    cancelledAt:  { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, createdAt: -1 });
subscriptionSchema.index({ expiryDate: 1, status: 1 });

export default mongoose.model('PaymentSubscription', subscriptionSchema);
