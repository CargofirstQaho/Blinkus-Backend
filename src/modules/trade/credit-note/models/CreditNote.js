import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    itemName:    { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    hsnCode:     { type: String, default: '', trim: true },
    quantity:    { type: Number, required: true, min: 0 },
    unit:        { type: String, required: true, trim: true },
    unitPrice:   { type: Number, required: true, min: 0 },
    taxPercent:  { type: Number, default: 0, min: 0, max: 100 },
    taxAmount:   { type: Number, default: 0 },
    total:       { type: Number, default: 0 },
  },
  { _id: false }
);

const creditNoteSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    creditNoteNumber: { type: String, required: true, unique: true, index: true, trim: true },
    status: {
      type:    String,
      enum:    ['DRAFT', 'GENERATED'],
      default: 'DRAFT',
      index:   true,
    },

    creditNoteInfo: {
      creditNoteDate:         { type: Date },
      referenceInvoiceNumber: { type: String, default: '', trim: true },
      referenceInvoiceDate:   { type: Date },
      currency:               { type: String, default: 'INR', trim: true },
      placeOfSupply:          { type: String, default: '', trim: true },
    },

    customerInfo: {
      customerName:    { type: String, default: '', trim: true },
      customerCompany: { type: String, default: '', trim: true },
      billingAddress:  { type: String, default: '', trim: true },
      shippingAddress: { type: String, default: '', trim: true },
      gstNumber:       { type: String, default: '', trim: true, uppercase: true },
      email:           { type: String, default: '', trim: true, lowercase: true },
      phone:           { type: String, default: '', trim: true },
    },

    lineItems: { type: [lineItemSchema], default: [] },

    summary: {
      subTotal:     { type: Number, default: 0 },
      cgst:         { type: Number, default: 0 },
      sgst:         { type: Number, default: 0 },
      igst:         { type: Number, default: 0 },
      total:        { type: Number, default: 0 },
      creditAmount: { type: Number, default: 0 },
    },

    reasonForCreditNote: { type: String, default: '', trim: true },
    notes:               { type: String, default: '', trim: true },
    termsAndConditions:  { type: String, default: '', trim: true },

    pdfKey:      { type: String, default: null },
    generatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

creditNoteSchema.index({ user: 1, status: 1 });

export default mongoose.model('CreditNote', creditNoteSchema);
