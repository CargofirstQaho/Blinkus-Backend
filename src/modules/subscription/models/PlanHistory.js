import mongoose from 'mongoose';

const planHistorySchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionType: { type: String, enum: ['chat', 'trade'], required: true },
    planType:         { type: String, enum: ['monthly', 'sixMonth', 'yearly'], required: true },
    durationMonths:   { type: Number, required: true },
    bonusMonths:      { type: Number, default: 0 },
    totalMonths:      { type: Number, required: true },
    amountPaid:       { type: Number, required: true },
    purchaseDate:     { type: Date, required: true },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    renewalDate:      { type: Date, default: null },
    paymentStatus:    { type: String, enum: ['paid', 'pending', 'failed', 'refunded'], default: 'paid' },
    source:           { type: String, enum: ['chat-plan', 'trade-plan'], required: true },
  },
  { timestamps: true }
);

planHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PlanHistory', planHistorySchema);
