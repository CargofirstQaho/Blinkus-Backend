import mongoose from 'mongoose';
import TradeDraft from '../models/TradeDraft.js';
import { DRAFT_DOCUMENT_TYPES, resolveDraftDocumentType, DRAFT_TYPE_SEARCH_TOKENS } from '../constants/draftDocumentTypes.js';
import { errorHandler } from '../../../../utils/errorHandler.js';

export async function listDrafts(req, res, next) {
  try {
    const { type, organization, favorite, search } = req.query;

    const filter = { user: req.user._id };
    if (type && DRAFT_DOCUMENT_TYPES[type]) filter.documentType = type;
    if (organization && mongoose.isValidObjectId(organization)) filter.organization = organization;
    if (favorite === 'true') filter.favorite = true;
    if (search && search.trim()) {
      const q = search.trim().replace(/\s+/g, ' ');
      const matchingTypes = Object.keys(DRAFT_TYPE_SEARCH_TOKENS).filter((t) =>
        DRAFT_TYPE_SEARCH_TOKENS[t].toLowerCase().includes(q.toLowerCase())
      );
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        ...(matchingTypes.length ? [{ documentType: { $in: matchingTypes } }] : []),
      ];
    }

    const drafts = await TradeDraft.find(filter)
      .sort({ updatedAt: -1 })
      .populate('documentId')
      .populate('organization', 'organizationName')
      .lean();

    const data = drafts
      .filter((d) => d.documentId)
      .map((d) => {
        const typeConfig = DRAFT_DOCUMENT_TYPES[d.documentType];
        return {
          _id:            d._id,
          documentType:   d.documentType,
          documentId:     d.documentId._id,
          title:          d.title,
          favorite:       d.favorite,
          status:         d.documentId.status,
          documentNumber: typeConfig ? d.documentId[typeConfig.numberField] || null : null,
          organization:   d.organization ? { _id: d.organization._id, name: d.organization.organizationName } : null,
          createdAt:      d.createdAt,
          updatedAt:      d.updatedAt,
        };
      });

    return res.json({ success: true, message: 'Success', data: { drafts: data } });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid draft id'));

    const draftIndex = await TradeDraft.findOne({ _id: id, user: req.user._id });
    if (!draftIndex) return next(errorHandler(404, 'Draft not found'));

    const typeConfig = resolveDraftDocumentType(draftIndex.documentType);
    if (typeConfig) {
      await typeConfig.Model.deleteOne({ _id: draftIndex.documentId, user: req.user._id });
    }
    await draftIndex.deleteOne();

    return res.json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function toggleFavorite(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid draft id'));

    const draftIndex = await TradeDraft.findOne({ _id: id, user: req.user._id });
    if (!draftIndex) return next(errorHandler(404, 'Draft not found'));

    draftIndex.favorite = !draftIndex.favorite;
    await draftIndex.save();

    return res.json({ success: true, message: 'Success', data: { draft: draftIndex } });
  } catch (err) {
    return next(err);
  }
}
