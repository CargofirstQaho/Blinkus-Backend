import TradeDraft from '../models/TradeDraft.js';

export async function syncDraftIndex({ user, organization, documentType, documentId, title }) {
  await TradeDraft.findOneAndUpdate(
    { documentType, documentId },
    {
      $set: { user, organization, title: title || '' },
      $setOnInsert: { documentType, documentId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function removeDraftIndex({ documentType, documentId }) {
  await TradeDraft.deleteOne({ documentType, documentId });
}
