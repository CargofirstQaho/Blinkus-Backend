import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',                required: true,  index: true },
    paymentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRecord',       required: true,  index: true },
    subscriptionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentSubscription', default: null,   index: true },
    invoiceNumber:    { type: String, required: true, unique: true },
    subscriptionType: { type: String, enum: ['chat', 'trade'],                   required: true },
    planType:         { type: String, enum: ['monthly', 'sixMonth', 'yearly'],   required: true },
    amount:           { type: Number, required: true },
    currency:         { type: String, default: 'INR' },
    issuedAt:         { type: Date,   default: Date.now },
    status:           { type: String, enum: ['issued', 'paid', 'void'],          default: 'issued' },

    customerName:     { type: String, default: '' },
    customerEmail:    { type: String, default: '' },
    companyName:      { type: String, default: '' },
    phone:            { type: String, default: '' },

    billingCycle:           { type: String, default: null },
    subscriptionStartDate:  { type: Date,   default: null },
    subscriptionExpiryDate: { type: Date,   default: null },

    razorpayOrderId: { type: String, default: null },
    paymentMethod:   { type: String, default: null },
    gstRate:         { type: Number, default: 0 }, 
    gstAmount:       { type: Number, default: 0 },
    totalAmount:     { type: Number, default: 0 },

    invoiceFilename: { type: String, default: null },

    s3Key: { type: String, default: null, index: true },
    s3Url: { type: String, default: null },

    customerEmailSent:       { type: Boolean, default: false },
    customerEmailSentAt:     { type: Date,    default: null },
    customerSesMessageId:    { type: String,  default: null },

    internalNotificationSent:    { type: Boolean, default: false },
    internalNotificationSentAt:  { type: Date,    default: null },
    internalSesMessageId:        { type: String,  default: null },

    processingStatus: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING', index: true },
    completedAt:       { type: Date,   default: null },
    failedAt:          { type: Date,   default: null },
    failedStep:        { type: String, default: null },
    failureReason:     { type: String, default: null },
    retryCount:        { type: Number, default: 0 },
    lastRetryAt:       { type: Date,   default: null },
    nextRetryAt:       { type: Date,   default: null },
  },
  { timestamps: true }
);

invoiceSchema.index({ userId: 1, createdAt: -1 });
// invoiceSchema.index({ paymentId: 1 });
// invoiceSchema.index({ invoiceNumber: 1 });

export default mongoose.model('Invoice', invoiceSchema);
