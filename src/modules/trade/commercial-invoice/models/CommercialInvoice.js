import mongoose from 'mongoose';

const goodsItemSchema = new mongoose.Schema(
  {
    commodity:   { type: String, required: true, trim: true },
    hsnCode:     { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 0 },
    unit:        { type: String, required: true, trim: true },
    unitPrice:   { type: Number, required: true, min: 0 },
    taxPercent:  { type: Number, default: 0, min: 0, max: 100 },
    taxAmount:   { type: Number, default: 0 },
    amount:      { type: Number, default: 0 },
  },
  { _id: false }
);

const commercialInvoiceSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    commercialInvoiceNumber: { type: String, required: true, unique: true, index: true, trim: true },
    status: { type: String, enum: ['DRAFT', 'GENERATED'], default: 'DRAFT', index: true },

    contract:       { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },
    contractNumber: { type: String, default: '', trim: true },

    invoiceInfo: {
      date: { type: Date },
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

    shippingDetails: {
      vessel:           { type: String, default: '', trim: true },
      blNumber:         { type: String, default: '', trim: true, uppercase: true },
      portOfLoading:    { type: String, default: '', trim: true },
      portOfDischarge:  { type: String, default: '', trim: true },
      finalDestination: { type: String, default: '', trim: true },
    },

    goodsItems: { type: [goodsItemSchema], default: [] },

    financial: {
      currency:      { type: String, default: 'USD', trim: true },
      subTotal:      { type: Number, default: 0, min: 0 },
      placeOfSupply: { type: String, default: '', trim: true },
      cgst:          { type: Number, default: 0, min: 0 },
      sgst:          { type: Number, default: 0, min: 0 },
      igst:          { type: Number, default: 0, min: 0 },
      freight:       { type: Number, default: 0, min: 0 },
      insurance:     { type: Number, default: 0, min: 0 },
      total:         { type: Number, default: 0, min: 0 },
    },

    bankDetails: {
      bankName:      { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      swift:         { type: String, default: '', trim: true, uppercase: true },
      ifsc:          { type: String, default: '', trim: true, uppercase: true },
    },

    declaration:        { type: String, default: '', trim: true },
    termsAndConditions: { type: String, default: '', trim: true },

    signatory: {
      name:        { type: String, default: '', trim: true },
      designation: { type: String, default: '', trim: true },
    },

    pdfKey:      { type: String, default: null },
    generatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

commercialInvoiceSchema.index({ user: 1, status: 1 });
commercialInvoiceSchema.index({ contract: 1 });

export default mongoose.model('CommercialInvoice', commercialInvoiceSchema);
