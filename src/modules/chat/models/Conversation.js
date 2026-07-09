import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role:    { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    tokens:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:        { type: String, default: 'New Chat', maxlength: 120 },
    messages:     [messageSchema],
    model:        { type: String, default: 'BLINKUS TRADE AGENT 1.0' },
    totalTokens:  { type: Number, default: 0 },
    lastMessage:  { type: String, default: '' },
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
