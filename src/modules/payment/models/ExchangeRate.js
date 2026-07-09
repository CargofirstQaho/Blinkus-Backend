import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema(
  {
    baseCurrency:   { type: String, required: true, uppercase: true, trim: true },
    targetCurrency: { type: String, required: true, uppercase: true, trim: true },
    rate:           { type: Number, required: true },
    lastUpdatedAt:  { type: Date, required: true },
    nextUpdateAt:   { type: Date, required: true },
  },
  { timestamps: true }
);

exchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1 }, { unique: true });

export default mongoose.model('ExchangeRate', exchangeRateSchema);
