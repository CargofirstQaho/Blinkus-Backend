import mongoose from 'mongoose';

const billingAddressSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    fullName: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:     String,
      required: true,
      trim:     true,
      lowercase: true,
    },
    phone: {
      type:     String,
      required: true,
      trim:     true,
    },
    companyName: {
      type:    String,
      trim:    true,
      default: null,
    },
    country: {
      type:     String,
      required: true,
      trim:     true,
    },
    state: {
      type:     String,
      required: true,
      trim:     true,
    },
    city: {
      type:     String,
      required: true,
      trim:     true,
    },
    postalCode: {
      type:     String,
      required: true,
      trim:     true,
    },
    addressLine1: {
      type:     String,
      required: true,
      trim:     true,
    },
    addressLine2: {
      type:    String,
      trim:    true,
      default: null,
    },
    isDefault: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

billingAddressSchema.index({ userId: 1, createdAt: -1 });
billingAddressSchema.index({ userId: 1, isDefault: 1 });

export default mongoose.model('BillingAddress', billingAddressSchema);
