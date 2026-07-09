import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionType: { type: String, enum: ['chat', 'trade'], required: true },
    planType:         { type: String, enum: ['monthly', 'sixMonth', 'yearly'], required: true },
    amount:           { type: Number, required: true },
    currency:         { type: String, default: 'INR' },
    provider:         { type: String, enum: ['razorpay'], default: 'razorpay' },
    providerOrderId:   { type: String, default: null, index: true },
    providerPaymentId: { type: String, default: null, index: true },
    providerSignature: { type: String, default: null, select: false },
    status:           { type: String, enum: ['created', 'authorized', 'captured', 'failed', 'refunded'], default: 'created', index: true },
    failureReason:    { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
