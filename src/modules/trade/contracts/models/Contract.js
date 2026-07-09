import mongoose from 'mongoose';

const clauseSchema = new mongoose.Schema({
  order:   { type: Number, default: 0 },
  title:   { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
}, { _id: false });

const stdClauseSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  content: { type: String, default: '', trim: true },
}, { _id: false });

const contractSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

  contractNumber: { type: String, default: '', trim: true, uppercase: true },
  contractMode:   { type: String, enum: ['DRAFT', 'UPLOAD'], required: true },
  status: {
    type:    String,
    enum:    ['DRAFT', 'FINALIZED'],
    default: 'DRAFT',
    index:   true,
  },

  buyerName:  { type: String, default: '', trim: true },
  sellerName: { type: String, default: '', trim: true },

  documentS3Key: { type: String, default: null },
  documentUrl:   { type: String, default: null },

  contractDate: { type: Date,   default: null },
  contractType: { type: String, default: '', trim: true },

  buyer: {
    companyName:   { type: String, default: '', trim: true },
    address:       { type: String, default: '', trim: true },
    country:       { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    phone:         { type: String, default: '', trim: true },
    email:         { type: String, default: '', trim: true, lowercase: true },
    taxNumber:     { type: String, default: '', trim: true },
  },

  seller: {
    companyName:   { type: String, default: '', trim: true },
    address:       { type: String, default: '', trim: true },
    country:       { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    phone:         { type: String, default: '', trim: true },
    email:         { type: String, default: '', trim: true, lowercase: true },
    taxNumber:     { type: String, default: '', trim: true },
  },

  commodity: {
    commodity:            { type: String, default: '', trim: true },
    hsCode:               { type: String, default: '', trim: true },
    originCountry:        { type: String, default: '', trim: true },
    qualitySpecification: { type: String, default: '', trim: true },
  },

  shipment: {
    incoterm:        { type: String, default: '', trim: true },
    loadingPort:     { type: String, default: '', trim: true },
    destinationPort: { type: String, default: '', trim: true },
    partialShipment: { type: String, default: 'No', trim: true },
    transshipment:   { type: String, default: 'No', trim: true },
    quantity:        { type: Number, default: null },
    unit:            { type: String, default: '', trim: true },
  },

  price: {
    currency:           { type: String, default: 'USD', trim: true },
    unitPrice:          { type: Number, default: null },
    totalContractValue: { type: Number, default: null },
  },

  paymentTerms: {
    advancePercent: { type: Number, default: null },
    balancePercent: { type: Number, default: null },
    paymentMethod:  { type: String, default: '', trim: true },
  },

  packing: {
    packagingType: { type: String, default: '', trim: true },
    bagMarking:    { type: String, default: '', trim: true },
  },

  inspection: {
    inspectionAgency:      { type: String, default: '', trim: true },
    inspectionRequirement: { type: String, default: '', trim: true },
  },

  insurance: {
    responsibility: { type: String, default: 'Seller', trim: true },
  },

  forceMajeure: { type: String, default: '', trim: true },
  arbitration:  { type: String, default: '', trim: true },
  governingLaw: { type: String, default: '', trim: true },

  clauses: { type: [clauseSchema], default: [] },

  standardClauses: {
    forceMajeure:      { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
    arbitration:       { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
    qualityClaims:     { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
    insurance:         { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
    inspection:        { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
    paymentDefault:    { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
    disputeResolution: { type: stdClauseSchema, default: () => ({ enabled: false, content: '' }) },
  },

  pdfKey:      { type: String, default: null },
  generatedAt: { type: Date,   default: null },

  signedContract: {
    s3Key:      { type: String, default: null },
    fileName:   { type: String, default: null },
    mimeType:   { type: String, default: null },
    size:       { type: Number, default: null },
    uploadedAt: { type: Date,   default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },

  shipmentStatus: { type: String, enum: ['COMPLETED', 'CANCELLED'], default: null },
}, { timestamps: true });

contractSchema.index({ user: 1, status: 1, contractMode: 1 });
contractSchema.index(
  { organization: 1, contractNumber: 1 },
  { unique: true, partialFilterExpression: { contractNumber: { $nin: ['', null] } } }
);

export default mongoose.model('Contract', contractSchema);
