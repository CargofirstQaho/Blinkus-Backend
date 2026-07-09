import mongoose from 'mongoose';

const DOCUMENT_TYPES = [
  'PurchaseOrder',
  'CreditNote',
  'DebitNote',
  'CommercialInvoice',
  'ProformaInvoice',
  'PackingList',
  'Contract',
];

const tradeDraftSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    documentId:   { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'documentType' },

    title:    { type: String, default: '', trim: true },
    favorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tradeDraftSchema.index({ user: 1, updatedAt: -1 });
tradeDraftSchema.index({ documentType: 1, documentId: 1 }, { unique: true });

export { DOCUMENT_TYPES };
export default mongoose.model('TradeDraft', tradeDraftSchema);
