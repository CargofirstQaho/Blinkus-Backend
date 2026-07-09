import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true, trim: true },
    hsnCode:   { type: String, required: true, trim: true },
    quantity:  { type: Number, required: true, min: 0 },
    unit:      { type: String, required: true, trim: true },
    rate:      { type: Number, required: true, min: 0 },
    amount:    { type: Number, default: 0 },
  },
  { _id: false }
);

const proformaInvoiceSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    proformaInvoiceNumber: { type: String, required: true, unique: true, index: true, trim: true },
    status: { type: String, enum: ['DRAFT', 'GENERATED'], default: 'DRAFT', index: true },

    contract:       { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },
    contractNumber: { type: String, default: '', trim: true },

    invoiceInfo: {
      invoiceDate: { type: Date },
      currency:    { type: String, default: 'USD', trim: true },
    },

    exporterDetails: {
      companyName: { type: String, default: '', trim: true },
      address:     { type: String, default: '', trim: true },
      country:     { type: String, default: '', trim: true },
      email:       { type: String, default: '', trim: true, lowercase: true },
      phone:       { type: String, default: '', trim: true },
      taxNumber:   { type: String, default: '', trim: true },
    },

    buyerDetails: {
      companyName:   { type: String, default: '', trim: true },
      address:       { type: String, default: '', trim: true },
      country:       { type: String, default: '', trim: true },
      contactPerson: { type: String, default: '', trim: true },
      phone:         { type: String, default: '', trim: true },
      email:         { type: String, default: '', trim: true, lowercase: true },
      taxNumber:     { type: String, default: '', trim: true },
    },

    notifyParty: {
      name:    { type: String, default: '', trim: true },
      address: { type: String, default: '', trim: true },
      country: { type: String, default: '', trim: true },
      phone:   { type: String, default: '', trim: true },
      email:   { type: String, default: '', trim: true, lowercase: true },
    },

    consignee: {
      name:    { type: String, default: '', trim: true },
      address: { type: String, default: '', trim: true },
      country: { type: String, default: '', trim: true },
      phone:   { type: String, default: '', trim: true },
      email:   { type: String, default: '', trim: true, lowercase: true },
    },

    shippingInfo: {
      portOfLoading:    { type: String, default: '', trim: true },
      portOfDischarge:  { type: String, default: '', trim: true },
      finalDestination: { type: String, default: '', trim: true },
      countryOfOrigin:  { type: String, default: '', trim: true },
    },

    commercialDetails: { type: [lineItemSchema], default: [] },

    financialInfo: {
      advancePercent: { type: Number, default: 0, min: 0, max: 100 },
      advanceAmount:  { type: Number, default: 0, min: 0 },
      balanceAmount:  { type: Number, default: 0 },
    },

    bankInfo: {
      bankName:      { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifsc:          { type: String, default: '', trim: true, uppercase: true },
      swift:         { type: String, default: '', trim: true, uppercase: true },
    },

    notes:              { type: String, default: '', trim: true },
    termsAndConditions: { type: String, default: '', trim: true },

    pdfKey:      { type: String, default: null },
    generatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

proformaInvoiceSchema.index({ user: 1, status: 1 });
proformaInvoiceSchema.index({ contract: 1 });

export default mongoose.model('ProformaInvoice', proformaInvoiceSchema);
