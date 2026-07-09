import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventType:   { type: String, required: true, trim: true },
    entityId:    { type: String, required: true, trim: true },
    payload:     { type: mongoose.Schema.Types.Mixed, default: {} },
    processed:   { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
    receivedAt:  { type: Date, required: true },
    error:       { type: String, default: null },
  },
  { timestamps: true }
);

webhookEventSchema.index({ eventType: 1, entityId: 1 }, { unique: true });
webhookEventSchema.index({ processed: 1, receivedAt: -1 });
webhookEventSchema.index({ receivedAt: -1 });

export default mongoose.model('WebhookEvent', webhookEventSchema);
