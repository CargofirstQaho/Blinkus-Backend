import mongoose from 'mongoose';
import DebitNote     from '../models/DebitNote.js';
import Organization  from '../../organization/models/Organization.js';
import { buildDebitNotePdf } from '../services/debitNotePdfService.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';
import { computeGstSummary, resolveOverridable } from '../../shared/utils/gstCalculator.js';

async function generateDnNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `DN/${year}/${month}/`;

  const latest = await DebitNote.findOne(
    { debitNoteNumber: { $regex: `^${prefix}` } },
    { debitNoteNumber: 1 },
    { sort: { debitNoteNumber: -1 } }
  ).lean();

  let seq = 1;
  if (latest) {
    const parts = latest.debitNoteNumber.split('/');
    seq = (parseInt(parts[3], 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function buildDnPayload(body, organization) {
  const lineItems = (body.lineItems || []).map((it) => {
    const qty  = parseFloat(it.quantity)   || 0;
    const rate = parseFloat(it.rate)       || 0;
    const tax  = parseFloat(it.taxPercent) || 0;
    const base      = qty * rate;
    const taxAmount = base * (tax / 100);
    return {
      itemName:    (it.itemName    || '').trim(),
      description: (it.description || '').trim(),
      hsnCode:     (it.hsnCode      || '').trim(),
      quantity:    qty,
      unit:        (it.unit         || '').trim(),
      rate,
      taxPercent:  tax,
      taxAmount,
      total:       base + taxAmount,
    };
  });

  const subtotal = lineItems.reduce((s, it) => s + it.quantity * it.rate, 0);
  const totalTax = lineItems.reduce((s, it) => s + it.taxAmount, 0);

  const dni = body.debitNoteInfo || {};
  const sup = body.supplierInfo  || {};
  const placeOfSupply = (dni.placeOfSupply || '').trim();

  const computed = computeGstSummary({
    currency: dni.currency || 'INR',
    orgGstNumber: organization?.kyc?.gst?.number,
    placeOfSupply,
    totalTax,
  });

  const summaryBody = body.summary || {};
  const cgst = resolveOverridable(summaryBody.cgst, computed.cgst);
  const sgst = resolveOverridable(summaryBody.sgst, computed.sgst);
  const igst = resolveOverridable(summaryBody.igst, computed.igst);

  const computedGrandTotal = subtotal + cgst + sgst + igst;
  const grandTotal = resolveOverridable(summaryBody.grandTotal, computedGrandTotal);

  const balanceDueRaw = summaryBody.balanceDue;
  const balanceDue    = balanceDueRaw !== undefined && balanceDueRaw !== null && balanceDueRaw !== ''
    ? parseFloat(balanceDueRaw) || 0
    : grandTotal;

  return {
    debitNoteInfo: {
      debitNoteDate:          dni.debitNoteDate          || null,
      referenceInvoiceNumber: (dni.referenceInvoiceNumber || '').trim(),
      referenceInvoiceDate:   dni.referenceInvoiceDate    || null,
      currency:               (dni.currency               || 'INR').trim(),
      placeOfSupply,
    },
    supplierInfo: {
      supplierName:    (sup.supplierName    || '').trim(),
      supplierCompany: (sup.supplierCompany || '').trim(),
      gstNumber:       (sup.gstNumber       || '').trim().toUpperCase(),
      address:         (sup.address         || '').trim(),
      phone:           (sup.phone           || '').trim(),
      email:           (sup.email           || '').trim().toLowerCase(),
    },
    lineItems,
    summary: { subtotal, cgst, sgst, igst, grandTotal, balanceDue },
    reasonForDebitNote: (body.reasonForDebitNote || '').trim(),
    notes:              (body.notes              || '').trim(),
    termsAndConditions: (body.termsAndConditions || '').trim(),
  };
}

async function buildDnResponse(dn) {
  const pdfUrl = dn.pdfKey ? await getSignedUrl(dn.pdfKey) : null;
  const obj    = dn.toObject ? dn.toObject() : { ...dn };
  delete obj.pdfKey;
  return { ...obj, pdfUrl };
}

export async function saveDraft(req, res, next) {
  try {
    const userId = req.user._id;

    const org = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const orgId   = org._id;
    const payload = buildDnPayload(req.body, org);

    const documentId = req.body.documentId;
    let dn = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      dn = await DebitNote.findOne({ _id: documentId, user: userId, status: 'DRAFT' });
    }

    if (dn) {
      Object.assign(dn, payload);
      await dn.save();
    } else {
      const dnNumber = await generateDnNumber();
      dn = await DebitNote.create({
        user:            userId,
        organization:    orgId,
        debitNoteNumber: dnNumber,
        status:          'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: orgId,
      documentType: 'DebitNote',
      documentId:   dn._id,
      title:        dn.debitNoteNumber,
    });

    const result = await buildDnResponse(dn);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: orgId,
      action: AUDIT_ACTIONS.DEBIT_NOTE_DRAFT_SAVED,
      module: AUDIT_MODULES.DEBIT_NOTE,
      resourceType: 'DebitNote',
      resourceId: dn._id,
      description: 'Debit note draft saved',
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { debitNote: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const dn = await DebitNote.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!dn) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { debitNote: null } });
    }
    const result = await buildDnResponse(dn);
    return res.status(200).json({ success: true, data: { debitNote: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid debit note ID'));

    const dn = await DebitNote.findOne({ _id: id, user: req.user._id });
    if (!dn) return next(errorHandler(404, 'Debit note not found'));

    const result = await buildDnResponse(dn);
    return res.status(200).json({ success: true, data: { debitNote: result } });
  } catch (err) {
    return next(err);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid debit note ID'));

    const dn = await DebitNote.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!dn) return next(errorHandler(404, 'Debit note not found'));

    const organization = dn.organization;
    const payload = buildDnPayload(req.body, organization);
    Object.assign(dn, payload);

    const logoUrl = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildDebitNotePdf(dn, organization, logoUrl);

    const key = `debit-notes/${req.user._id}/${dn._id}/${Date.now()}.pdf`;

    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    dn.pdfKey      = key;
    dn.status      = 'GENERATED';
    dn.generatedAt = new Date();
    await dn.save();

    await removeDraftIndex({ documentType: 'DebitNote', documentId: dn._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = dn.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.DEBIT_NOTE_GENERATED,
      module: AUDIT_MODULES.DEBIT_NOTE,
      resourceType: 'DebitNote',
      resourceId: dn._id,
      description: 'Debit note PDF generated',
      metadata: { debitNoteNumber: dn.debitNoteNumber },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'DebitNote',
      resourceId: dn._id,
      description: 'Debit note PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data:    { debitNote: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const dn = await DebitNote.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!dn) return next(errorHandler(404, 'No draft found'));
    await removeDraftIndex({ documentType: 'DebitNote', documentId: dn._id });
    await dn.deleteOne();
    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid debit note ID'));

    const source = await DebitNote.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Debit note not found'));

    const dnNumber = await generateDnNumber();
    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const dn = await DebitNote.create({
      ...clone,
      debitNoteNumber: dnNumber,
      status: 'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: dn.organization,
      documentType: 'DebitNote',
      documentId:   dn._id,
      title:        dn.debitNoteNumber,
    });

    const result = await buildDnResponse(dn);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { debitNote: result } });
  } catch (err) {
    return next(err);
  }
}
