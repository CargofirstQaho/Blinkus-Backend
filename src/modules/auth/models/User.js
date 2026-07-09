import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile:      { type: String, default: '', trim: true },
    password:    { type: String, minlength: 8, select: false },
    googleId:    { type: String, default: null },
    provider:    { type: String, enum: ['local', 'google'], default: 'local' },
    company:     { type: String, trim: true, default: '' },
    avatar:      { type: String, default: '' },
    role:        { type: String, enum: ['user', 'admin'], default: 'user' },
    country:     { type: String, trim: true, default: '' },
    tradeSector: { type: String, trim: true, default: '' },

    isVerified: { type: Boolean, default: false },

    otpHash:        { type: String, select: false },
    otpExpiry:      { type: Date },
    otpAttempts:    { type: Number, default: 0 },
    otpResendCount: { type: Number, default: 0 },
    otpLastResent:  { type: Date },

    resetOtpHash:     { type: String, select: false },
    resetOtpExpiry:   { type: Date },
    resetOtpAttempts: { type: Number, default: 0 },

    plan:               { type: String, enum: ['free', 'monthly', 'biannual', 'yearly'], default: 'free' },
    planStatus:         { type: String, enum: ['active', 'expired', 'cancelled', 'none'], default: 'none' },
    isPremium:          { type: Boolean, default: false },
    subscriptionEndsAt: { type: Date, default: null },

    bonusUsed: {
      biannual: { type: Boolean, default: false },
      yearly:   { type: Boolean, default: false },
    },

    subscription: {
      chat: {
        planType:        { type: String, enum: ['free', 'monthly', 'sixMonth', 'yearly'], default: 'free' },
        status:          { type: String, enum: ['active', 'expired', 'cancelled', 'none'], default: 'none' },
        startDate:       { type: Date, default: null },
        endDate:         { type: Date, default: null },
        unlimitedAccess: { type: Boolean, default: true },
        source:          { type: String, enum: ['free', 'chat-plan', 'trade-plan'], default: 'free' },
      },
      trade: {
        planType:        { type: String, enum: ['none', 'monthly', 'sixMonth', 'yearly'], default: 'none' },
        status:          { type: String, enum: ['active', 'expired', 'cancelled', 'none'], default: 'none' },
        startDate:       { type: Date, default: null },
        endDate:         { type: Date, default: null },
        unlimitedAccess: { type: Boolean, default: false },
      },
    },

    bonusEligibility: {
      sixMonthBonusUsed: { type: Boolean, default: false },
      yearlyBonusUsed:   { type: Boolean, default: false },
    },

    permissions: { type: [String], default: [] },

    termsAcceptance: {
      accepted:   { type: Boolean, default: false },
      acceptedAt: { type: Date, default: null },
      version:    { type: String, default: null },
      acceptedVia: { type: String, default: null },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  if (!candidate || !this.password || typeof this.password !== 'string') {
    return Promise.resolve(false);
  }
  return bcrypt.compare(candidate, this.password);
};
 
userSchema.methods.toSafeObject = function () {
  const {
    _id, name, email, mobile, company, avatar, role, isVerified, provider,
    googleId, country, tradeSector,
    plan, planStatus, isPremium, subscriptionEndsAt, permissions, bonusUsed,
    subscription, bonusEligibility, termsAcceptance,
    createdAt,
  } = this;
  return {
    _id, name, email, mobile, company, avatar, role, isVerified, provider,
    country, tradeSector,
    hasGoogleLinked: !!googleId,
    plan, planStatus, isPremium, subscriptionEndsAt, permissions, bonusUsed,
    subscription, bonusEligibility, termsAcceptance,
    createdAt,
  };
};

export default mongoose.model('User', userSchema);
