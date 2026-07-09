import mongoose from 'mongoose';

const kycFieldSchema = new mongoose.Schema(
  {
    number:     { type: String, default: null, trim: true },
    verified:   { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    status:     { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },

    organizationName:  { type: String, required: true, trim: true, maxlength: 120 },
    organizationEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true, index: true },
    logoKey: { type: String, default: null },
    location:          { type: String, required: true, trim: true, maxlength: 200 },
    gstNumber:         { type: String, default: null, trim: true, maxlength: 20 },

    contact: {
      address: { type: String, default: '', trim: true, maxlength: 300 },
      pinCode: { type: String, default: '', trim: true, maxlength: 12 },
      phone:   { type: String, default: '', trim: true, maxlength: 20 },
      website: { type: String, default: '', trim: true, maxlength: 200 },
    },

    regionalInformation: {
      timezone:           { type: String, default: '', trim: true },
      country:            { type: String, default: '', trim: true },
      countryCode:        { type: String, default: '', trim: true, uppercase: true, maxlength: 3 },
      financialYearStart: { type: String, default: '', trim: true },
      dateFormat:         { type: String, enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', ''], default: '' },
    },

    kyc: {
      aadhaar: { type: kycFieldSchema, default: () => ({}) },
      pan:     { type: kycFieldSchema, default: () => ({}) },
      gst:     { type: kycFieldSchema, default: () => ({}) },
    },

    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },

    isLocked:            { type: Boolean, default: false, index: true },
    organizationStatus:  { type: String, enum: ['ACTIVE'], default: undefined },
    organizationCreatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
