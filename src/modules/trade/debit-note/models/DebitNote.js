import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    itemName:    { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    hsnCode:     { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 0 },
    unit:        { type: String, required: true, trim: true },
    rate:        { type: Number, required: true, min: 0 },
    taxPercent:  { type: Number, default: 0, min: 0, max: 100 },
    taxAmount:   { type: Number, default: 0 },
    total:       { type: Number, default: 0 },
  },
  { _id: false }
);

const debitNoteSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    debitNoteNumber: { type: String, required: true, unique: true, index: true, trim: true },
    status: {
      type:    String,
      enum:    ['DRAFT', 'GENERATED'],
      default: 'DRAFT',
      index:   true,
    },

    debitNoteInfo: {
      debitNoteDate:          { type: Date },
      referenceInvoiceNumber: { type: String, default: '', trim: true },
      referenceInvoiceDate:   { type: Date },
      currency:               { type: String, default: 'INR', trim: true },
      placeOfSupply:          { type: String, default: '', trim: true },
    },

    supplierInfo: {
      supplierName:    { type: String, default: '', trim: true },
      supplierCompany: { type: String, default: '', trim: true },
      gstNumber:       { type: String, default: '', trim: true, uppercase: true },
      address:         { type: String, default: '', trim: true },
      phone:           { type: String, default: '', trim: true },
      email:           { type: String, default: '', trim: true, lowercase: true },
    },

    lineItems: { type: [lineItemSchema], default: [] },

    summary: {
      subtotal:   { type: Number, default: 0 },
      cgst:       { type: Number, default: 0 },
      sgst:       { type: Number, default: 0 },
      igst:       { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
      balanceDue: { type: Number, default: 0 },
    },

    reasonForDebitNote: { type: String, default: '', trim: true },
    notes:              { type: String, default: '', trim: true },
    termsAndConditions: { type: String, default: '', trim: true },

    pdfKey:      { type: String, default: null },
    generatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

debitNoteSchema.index({ user: 1, status: 1 });

export default mongoose.model('DebitNote', debitNoteSchema);
