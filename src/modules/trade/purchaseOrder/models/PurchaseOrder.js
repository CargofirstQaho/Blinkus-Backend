import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    itemNumber:  { type: String, default: '' },
    productName: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    hsCode:      { type: String, default: '', trim: true },
    quantity:        { type: Number, required: true, min: 0 },
    unit:            { type: String, required: true, trim: true },
    unitsPerPackage: { type: Number, default: null },
    unitPrice:       { type: Number, required: true, min: 0 },
    taxPercent:      { type: Number, default: 0, min: 0, max: 100 },
    taxAmount:       { type: Number, default: 0 },
    total:           { type: Number, default: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    purchaseOrderNumber: { type: String, required: true, unique: true, index: true, trim: true },
    status: {
      type:    String,
      enum:    ['DRAFT', 'GENERATED'],
      default: 'DRAFT',
      index:   true,
    },

    buyerDetails: {
      buyerName:       { type: String, default: '', trim: true },
      buyerCompany:    { type: String, default: '', trim: true },
      buyerAddress:    { type: String, default: '', trim: true },
      buyerCountry:    { type: String, default: '', trim: true },
      buyerState:      { type: String, default: '', trim: true },
      buyerCity:       { type: String, default: '', trim: true },
      buyerPostalCode: { type: String, default: '', trim: true },
      buyerEmail:      { type: String, default: '', trim: true, lowercase: true },
      buyerPhone:      { type: String, default: '', trim: true },
      buyerGstNumber:  { type: String, default: '', trim: true, uppercase: true },
    },

    shipToDetails: {
      companyName:   { type: String, default: '', trim: true },
      address:       { type: String, default: '', trim: true },
      country:       { type: String, default: '', trim: true },
      state:         { type: String, default: '', trim: true },
      city:          { type: String, default: '', trim: true },
      postalCode:    { type: String, default: '', trim: true },
      contactPerson: { type: String, default: '', trim: true },
      phone:         { type: String, default: '', trim: true },
      email:         { type: String, default: '', trim: true, lowercase: true },
    },

    orderDetails: {
      poDate:          { type: Date },
      expectedDelivery: { type: Date },
      currency:        { type: String, default: 'INR', trim: true },
      paymentTerms:    { type: String, default: '', trim: true },
      incoterms:       { type: String, default: '', trim: true },
      portOfLoading:   { type: String, default: '', trim: true },
      portOfDischarge: { type: String, default: '', trim: true },
      shipmentMode:    { type: String, default: '', trim: true },
    },

    items: { type: [itemSchema], default: [] },

    summary: {
      subtotal:   { type: Number, default: 0 },
      cgst:       { type: Number, default: 0 },
      sgst:       { type: Number, default: 0 },
      igst:       { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },

    bankDetails: {
      bankName:      { type: String, default: '', trim: true },
      accountName:   { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifsc:          { type: String, default: '', trim: true, uppercase: true },
      swift:         { type: String, default: '', trim: true, uppercase: true },
      branch:        { type: String, default: '', trim: true },
    },

    notes: {
      termsAndConditions:   { type: String, default: '', trim: true },
      additionalNotes:      { type: String, default: '', trim: true },
      signatory:            { type: String, default: '', trim: true },
      signatoryDesignation: { type: String, default: '', trim: true },
    },

    pdfKey:      { type: String, default: null },
    pdfUrl:      { type: String, default: null },
    generatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ user: 1, status: 1 });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
