import mongoose from 'mongoose';

const usageLogSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:             { type: String, required: true },
    aiQuestionsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

usageLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('UsageLog', usageLogSchema);
