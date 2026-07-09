import mongoose from 'mongoose';
import {
  PLAN_NAMES,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
} from '../../../config/paymentConfig.js';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    subscriptionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'PaymentSubscription',
      required: true,
      index:    true,
    },
    planName: {
      type:     String,
      enum:     Object.values(PLAN_NAMES),
      required: true,
    },
    amount: {
      type:     Number,
      required: true,
    },
    currency: {
      type:    String,
      default: 'USD',
      uppercase: true,
      trim:    true,
    },
    exchangeRate: {
      type:    Number,
      default: 1,
    },
    inrAmount: {
      type:    Number,
      default: 0,
    },
    planAmount: {
      type:    Number,
      default: 0,
    },
    gstRate: {
      type:    Number,
      default: 0,
    },
    gstAmount: {
      type:    Number,
      default: 0,
    },
    totalAmount: {
      type:    Number,
      default: 0,
    },
    razorpayOrderId: {
      type:    String,
      default: null,
      index:   true,
      sparse:  true,
    },
    razorpayPaymentId: {
      type:   String,
      default: null,
      index:  true,
      sparse: true,
    },
    razorpaySignature: {
      type:   String,
      default: null,
      select: false,
    },
    paymentMethod: {
      type:    String,
      trim:    true,
      default: null,
    },
    status: {
      type:    String,
      enum:    Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.CREATED,
      index:   true,
    },
    paymentDate: {
      type:    Date,
      default: null,
    },
    refundAmount: {
      type:    Number,
      default: 0,
    },
    refundStatus: {
      type:    String,
      enum:    Object.values(REFUND_STATUSES),
      default: REFUND_STATUSES.NONE,
    },
    metadata: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('PaymentRecord', paymentSchema);
