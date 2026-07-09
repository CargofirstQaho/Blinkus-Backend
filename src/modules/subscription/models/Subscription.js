import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionType: { type: String, enum: ['chat', 'trade'], default: 'trade', index: true },
    planType:        { type: String, enum: ['monthly', 'biannual', 'yearly', 'sixMonth'], required: true },
    amountPaid:      { type: Number, required: true },
    durationMonths:  { type: Number, required: true },
    bonusMonths:     { type: Number, default: 0 },
    totalMonths:     { type: Number, required: true },
    startDate:       { type: Date, required: true },
    endDate:         { type: Date, required: true },
    isActive:        { type: Boolean, default: true, index: true },
    paymentProvider: { type: String, default: null },
    transactionId:   { type: String, default: null },
    isFirstOfType:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, isActive: 1 });
subscriptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Subscription', subscriptionSchema);
