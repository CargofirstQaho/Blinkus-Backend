import mongoose from 'mongoose';
import CreditNote    from '../models/CreditNote.js';
import Organization  from '../../organization/models/Organization.js';
import { buildCreditNotePdf } from '../services/creditNotePdfService.js';
import { computeSupplyType } from '../utils/gstStates.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';

async function generateCnNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CN/${year}/${month}/`;

  const latest = await CreditNote.findOne(
    { creditNoteNumber: { $regex: `^${prefix}` } },
    { creditNoteNumber: 1 },
    { sort: { creditNoteNumber: -1 } }
  ).lean();

  let seq = 1;
  if (latest) {
    const parts = latest.creditNoteNumber.split('/');
    seq = (parseInt(parts[3], 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function buildCnPayload(body, organization) {
  const lineItems = (body.lineItems || []).map(it => {
    const qty   = parseFloat(it.quantity)   || 0;
    const price = parseFloat(it.unitPrice)  || 0;
    const tax   = parseFloat(it.taxPercent) || 0;
    const base  = qty * price;
    const taxAmount = base * (tax / 100);
    return {
      itemName:    (it.itemName    || '').trim(),
      description: (it.description || '').trim(),
      hsnCode:     (it.hsnCode      || '').trim(),
      quantity:    qty,
      unit:        (it.unit         || '').trim(),
      unitPrice:   price,
      taxPercent:  tax,
      taxAmount,
      total:       base + taxAmount,
    };
  });

  const ci = body.creditNoteInfo || {};

  const subTotal = lineItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const totalTax = lineItems.reduce((s, it) => s + it.taxAmount, 0);

  const supplyType = computeSupplyType(organization?.kyc?.gst?.number, ci.placeOfSupply);

  let computedCgst = 0;
  let computedSgst = 0;
  let computedIgst = 0;
  if (supplyType === 'INTRA') {
    computedCgst = totalTax / 2;
    computedSgst = totalTax / 2;
  } else {
    computedIgst = totalTax;
  }

  const cgst = body.summary?.cgst !== undefined && body.summary?.cgst !== ''
    ? (parseFloat(body.summary.cgst) || 0)
    : computedCgst;
  const sgst = body.summary?.sgst !== undefined && body.summary?.sgst !== ''
    ? (parseFloat(body.summary.sgst) || 0)
    : computedSgst;
  const igst = body.summary?.igst !== undefined && body.summary?.igst !== ''
    ? (parseFloat(body.summary.igst) || 0)
    : computedIgst;

  const total = subTotal + cgst + sgst + igst;
  const creditAmount = body.summary?.creditAmount !== undefined && body.summary?.creditAmount !== ''
    ? (parseFloat(body.summary.creditAmount) || 0)
    : total;

  return {
    creditNoteInfo: {
      creditNoteDate:         ci.creditNoteDate         || null,
      referenceInvoiceNumber: (ci.referenceInvoiceNumber || '').trim(),
      referenceInvoiceDate:   ci.referenceInvoiceDate    || null,
      currency:               (ci.currency               || 'INR').trim(),
      placeOfSupply:          (ci.placeOfSupply          || '').trim(),
    },
    customerInfo: {
      customerName:    (body.customerInfo?.customerName    || '').trim(),
      customerCompany: (body.customerInfo?.customerCompany || '').trim(),
      billingAddress:  (body.customerInfo?.billingAddress  || '').trim(),
      shippingAddress: (body.customerInfo?.shippingAddress || '').trim(),
      gstNumber:       (body.customerInfo?.gstNumber       || '').trim().toUpperCase(),
      email:           (body.customerInfo?.email           || '').trim().toLowerCase(),
      phone:           (body.customerInfo?.phone           || '').trim(),
    },
    lineItems,
    summary: { subTotal, cgst, sgst, igst, total, creditAmount },
    reasonForCreditNote: (body.reasonForCreditNote || '').trim(),
    notes:               (body.notes               || '').trim(),
    termsAndConditions:  (body.termsAndConditions  || '').trim(),
  };
}

async function buildCnResponse(cn) {
  const pdfUrl = cn.pdfKey ? await getSignedUrl(cn.pdfKey) : null;
  const obj    = cn.toObject ? cn.toObject() : { ...cn };
  delete obj.pdfKey;
  return { ...obj, pdfUrl };
}

export async function saveDraft(req, res, next) {
  try {
    const userId = req.user._id;

    const org = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const orgId   = org._id;
    const payload = buildCnPayload(req.body, org);

    const documentId = req.body.documentId;
    let cn = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      cn = await CreditNote.findOne({ _id: documentId, user: userId, status: 'DRAFT' });
    }

    if (cn) {
      Object.assign(cn, payload);
      await cn.save();
    } else {
      const cnNumber = await generateCnNumber();
      cn = await CreditNote.create({
        user:             userId,
        organization:     orgId,
        creditNoteNumber: cnNumber,
        status:           'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: orgId,
      documentType: 'CreditNote',
      documentId:   cn._id,
      title:        cn.creditNoteNumber,
    });

    const result = await buildCnResponse(cn);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: orgId,
      action: AUDIT_ACTIONS.CREDIT_NOTE_DRAFT_SAVED,
      module: AUDIT_MODULES.CREDIT_NOTE,
      resourceType: 'CreditNote',
      resourceId: cn._id,
      description: 'Credit note draft saved',
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { creditNote: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const cn = await CreditNote.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!cn) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { creditNote: null } });
    }
    const result = await buildCnResponse(cn);
    return res.status(200).json({ success: true, data: { creditNote: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid credit note ID'));

    const cn = await CreditNote.findOne({ _id: id, user: req.user._id });
    if (!cn) return next(errorHandler(404, 'Credit note not found'));

    const result = await buildCnResponse(cn);
    return res.status(200).json({ success: true, data: { creditNote: result } });
  } catch (err) {
    return next(err);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid credit note ID'));

    const cn = await CreditNote.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!cn) return next(errorHandler(404, 'Credit note not found'));

    const organization = cn.organization;

    const payload = buildCnPayload(req.body, organization);
    Object.assign(cn, payload);

    const logoUrl = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildCreditNotePdf(cn, organization, logoUrl);

    const key = `credit-notes/${req.user._id}/${cn._id}/${Date.now()}.pdf`;

    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    cn.pdfKey      = key;
    cn.status      = 'GENERATED';
    cn.generatedAt = new Date();
    await cn.save();

    await removeDraftIndex({ documentType: 'CreditNote', documentId: cn._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = cn.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.CREDIT_NOTE_GENERATED,
      module: AUDIT_MODULES.CREDIT_NOTE,
      resourceType: 'CreditNote',
      resourceId: cn._id,
      description: 'Credit note PDF generated',
      metadata: { creditNoteNumber: cn.creditNoteNumber },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'CreditNote',
      resourceId: cn._id,
      description: 'Credit note PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data:    { creditNote: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const cn = await CreditNote.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!cn) return next(errorHandler(404, 'No draft found'));
    await removeDraftIndex({ documentType: 'CreditNote', documentId: cn._id });
    await cn.deleteOne();
    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid credit note ID'));

    const source = await CreditNote.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Credit note not found'));

    const cnNumber = await generateCnNumber();
    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const cn = await CreditNote.create({
      ...clone,
      creditNoteNumber: cnNumber,
      status: 'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: cn.organization,
      documentType: 'CreditNote',
      documentId:   cn._id,
      title:        cn.creditNoteNumber,
    });

    const result = await buildCnResponse(cn);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { creditNote: result } });
  } catch (err) {
    return next(err);
  }
}
