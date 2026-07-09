import mongoose from 'mongoose';

const packingItemSchema = new mongoose.Schema(
  {
    marksAndNumbers:  { type: String, required: true, trim: true },
    packagingType:    { type: String, required: true, trim: true },
    numberOfPackages: { type: Number, required: true, min: 0 },
    commodity:        { type: String, required: true, trim: true },
    description:      { type: String, required: true, trim: true },
    hsnCode:          { type: String, required: true, trim: true },
    netWeight:        { type: Number, required: true, min: 0 },
    grossWeight:      { type: Number, required: true, min: 0 },
    quantity:         { type: Number, required: true, min: 0 },
    unit:             { type: String, required: true, trim: true },
  },
  { _id: false }
);

const packingListSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    packingListNumber: { type: String, required: true, unique: true, index: true, trim: true },
    status: { type: String, enum: ['DRAFT', 'GENERATED'], default: 'DRAFT', index: true },

    contract:       { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },
    contractNumber: { type: String, default: '', trim: true },

    packingListInfo: {
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

    consignee: {
      name:    { type: String, default: '', trim: true },
      address: { type: String, default: '', trim: true },
      country: { type: String, default: '', trim: true },
      phone:   { type: String, default: '', trim: true },
      email:   { type: String, default: '', trim: true, lowercase: true },
    },

    shippingDetails: {
      portOfLoading:   { type: String, default: '', trim: true },
      portOfDischarge: { type: String, default: '', trim: true },
      vessel:          { type: String, default: '', trim: true },
      containerNumber: { type: String, default: '', trim: true, uppercase: true },
      sealNumber:      { type: String, default: '', trim: true, uppercase: true },
    },

    packingItems: { type: [packingItemSchema], default: [] },

    remarks:            { type: String, default: '', trim: true },
    termsAndConditions: { type: String, default: '', trim: true },

    pdfKey:      { type: String, default: null },
    generatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

packingListSchema.index({ user: 1, status: 1 });
packingListSchema.index({ contract: 1 });

export default mongoose.model('PackingList', packingListSchema);
