import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Organization  from '../../organization/models/Organization.js';
import { buildPurchaseOrderPdf } from '../services/purchaseOrderPdfService.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';
import { computeGstSummary, resolveOverridable } from '../../shared/utils/gstCalculator.js';

async function generatePoNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PO/${year}/${month}/`;

  const latest = await PurchaseOrder.findOne(
    { purchaseOrderNumber: { $regex: `^${prefix}` } },
    { purchaseOrderNumber: 1 },
    { sort: { purchaseOrderNumber: -1 } }
  ).lean();

  let seq = 1;
  if (latest) {
    const parts = latest.purchaseOrderNumber.split('/');
    seq = (parseInt(parts[3], 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function buildPoPayload(body, organization) {
  const PACKAGE_UNITS = ['BOX', 'BAG', 'ROLL', 'SET', 'PAIR'];

  const items = (body.items || []).map((it) => {
    const qty  = parseFloat(it.quantity)  || 0;
    const price = parseFloat(it.unitPrice) || 0;
    const unit  = (it.unit || '').trim();
    const upp   = parseFloat(it.unitsPerPackage) || null;
    const taxPercent = parseFloat(it.taxPercent) || 0;
    let effQty;
    if (PACKAGE_UNITS.includes(unit) && upp > 0) {
      effQty = qty * upp;
    } else {
      effQty = qty;
    }
    const base      = effQty * price;
    const taxAmount = base * (taxPercent / 100);
    return {
      itemNumber:      (it.itemNumber  || '').trim(),
      productName:     (it.productName || '').trim(),
      description:     (it.description || '').trim(),
      hsCode:          (it.hsCode      || '').trim(),
      quantity:        qty,
      unit,
      unitsPerPackage: upp,
      unitPrice:       price,
      taxPercent,
      taxAmount,
      total:           base + taxAmount,
    };
  });

  const subtotal = items.reduce((s, it) => {
    const upp = parseFloat(it.unitsPerPackage) || null;
    const effQty = PACKAGE_UNITS.includes(it.unit) && upp > 0 ? it.quantity * upp : it.quantity;
    return s + effQty * it.unitPrice;
  }, 0);
  const totalTax = items.reduce((s, it) => s + it.taxAmount, 0);

  const buyerState = (body.buyerDetails?.buyerState || '').trim();
  const currency   = (body.orderDetails?.currency || 'INR').trim();
  const computed = computeGstSummary({
    currency,
    orgGstNumber: organization?.kyc?.gst?.number,
    placeOfSupply: buyerState,
    totalTax,
  });

  const summaryBody = body.summary || {};
  const cgst = resolveOverridable(summaryBody.cgst, computed.cgst);
  const sgst = resolveOverridable(summaryBody.sgst, computed.sgst);
  const igst = resolveOverridable(summaryBody.igst, computed.igst);

  const computedGrandTotal = subtotal + cgst + sgst + igst;
  const grandTotal = resolveOverridable(summaryBody.grandTotal, computedGrandTotal);

  return {
    summary: { subtotal, cgst, sgst, igst, grandTotal },
    buyerDetails: {
      buyerName:       (body.buyerDetails?.buyerName       || '').trim(),
      buyerCompany:    (body.buyerDetails?.buyerCompany    || '').trim(),
      buyerAddress:    (body.buyerDetails?.buyerAddress    || '').trim(),
      buyerCountry:    (body.buyerDetails?.buyerCountry    || '').trim(),
      buyerState:      (body.buyerDetails?.buyerState      || '').trim(),
      buyerCity:       (body.buyerDetails?.buyerCity       || '').trim(),
      buyerPostalCode: (body.buyerDetails?.buyerPostalCode || '').trim(),
      buyerEmail:      (body.buyerDetails?.buyerEmail      || '').trim().toLowerCase(),
      buyerPhone:      (body.buyerDetails?.buyerPhone      || '').trim(),
      buyerGstNumber:  (body.buyerDetails?.buyerGstNumber  || '').trim().toUpperCase(),
    },
    shipToDetails: {
      companyName:   (body.shipToDetails?.companyName   || '').trim(),
      address:       (body.shipToDetails?.address       || '').trim(),
      country:       (body.shipToDetails?.country       || '').trim(),
      state:         (body.shipToDetails?.state         || '').trim(),
      city:          (body.shipToDetails?.city          || '').trim(),
      postalCode:    (body.shipToDetails?.postalCode    || '').trim(),
      contactPerson: (body.shipToDetails?.contactPerson || '').trim(),
      phone:         (body.shipToDetails?.phone         || '').trim(),
      email:         (body.shipToDetails?.email         || '').trim().toLowerCase(),
    },
    orderDetails: {
      poDate:           body.orderDetails?.poDate          || null,
      expectedDelivery: body.orderDetails?.expectedDelivery || null,
      currency:         (body.orderDetails?.currency        || 'INR').trim(),
      paymentTerms:     (body.orderDetails?.paymentTerms    || '').trim(),
      incoterms:        (body.orderDetails?.incoterms       || '').trim(),
      portOfLoading:    (body.orderDetails?.portOfLoading   || '').trim(),
      portOfDischarge:  (body.orderDetails?.portOfDischarge || '').trim(),
      shipmentMode:     (body.orderDetails?.shipmentMode    || '').trim(),
    },
    items,
    bankDetails: {
      bankName:      (body.bankDetails?.bankName      || '').trim(),
      accountName:   (body.bankDetails?.accountName   || '').trim(),
      accountNumber: (body.bankDetails?.accountNumber || '').trim(),
      ifsc:          (body.bankDetails?.ifsc          || '').trim().toUpperCase(),
      swift:         (body.bankDetails?.swift         || '').trim().toUpperCase(),
      branch:        (body.bankDetails?.branch        || '').trim(),
    },
    notes: {
      termsAndConditions:   (body.notes?.termsAndConditions   || '').trim(),
      additionalNotes:      (body.notes?.additionalNotes      || '').trim(),
      signatory:            (body.notes?.signatory            || '').trim(),
      signatoryDesignation: (body.notes?.signatoryDesignation || '').trim(),
    },
  };
}

async function buildPoResponse(po) {
  const pdfUrl = await getSignedUrl(po.pdfKey);
  const obj    = po.toObject ? po.toObject() : { ...po };
  delete obj.pdfKey;
  return { ...obj, pdfUrl };
}

export async function saveDraft(req, res, next) {
  try {
    const userId = req.user._id;

    const org = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const orgId   = org._id;
    const payload = buildPoPayload(req.body, org);

    const documentId = req.body.documentId;
    let po = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      po = await PurchaseOrder.findOne({ _id: documentId, user: userId, status: 'DRAFT' });
    }

    if (po) {
      Object.assign(po, payload);
      await po.save();
    } else {
      const poNumber = await generatePoNumber();
      po = await PurchaseOrder.create({
        user:                userId,
        organization:        orgId,
        purchaseOrderNumber: poNumber,
        status:              'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: orgId,
      documentType: 'PurchaseOrder',
      documentId:   po._id,
      title:        po.purchaseOrderNumber,
    });

    const result = await buildPoResponse(po);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: orgId,
      action: AUDIT_ACTIONS.PURCHASE_ORDER_DRAFT_SAVED,
      module: AUDIT_MODULES.PURCHASE_ORDER,
      resourceType: 'PurchaseOrder',
      resourceId: po._id,
      description: 'Purchase order draft saved',
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { purchaseOrder: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const po = await PurchaseOrder.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!po) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { purchaseOrder: null } });
    }
    const result = await buildPoResponse(po);
    return res.status(200).json({ success: true, data: { purchaseOrder: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid purchase order ID'));

    const po = await PurchaseOrder.findOne({ _id: id, user: req.user._id });
    if (!po) return next(errorHandler(404, 'Purchase order not found'));

    const result = await buildPoResponse(po);
    return res.status(200).json({ success: true, data: { purchaseOrder: result } });
  } catch (err) {
    return next(err);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid purchase order ID'));

    const po = await PurchaseOrder.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!po) return next(errorHandler(404, 'Purchase order not found'));

    const organization = po.organization;
    const logoUrl      = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildPurchaseOrderPdf(po, organization, logoUrl);

    const key = `purchase-orders/${req.user._id}/${po._id}/${Date.now()}.pdf`;

    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    po.pdfKey      = key;
    po.status      = 'GENERATED';
    po.generatedAt = new Date();
    await po.save();

    await removeDraftIndex({ documentType: 'PurchaseOrder', documentId: po._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = po.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.PURCHASE_ORDER_GENERATED,
      module: AUDIT_MODULES.PURCHASE_ORDER,
      resourceType: 'PurchaseOrder',
      resourceId: po._id,
      description: 'Purchase order PDF generated',
      metadata: { purchaseOrderNumber: po.purchaseOrderNumber },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'PurchaseOrder',
      resourceId: po._id,
      description: 'Purchase order PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data:    { purchaseOrder: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const po = await PurchaseOrder.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!po) return next(errorHandler(404, 'No draft found'));
    await removeDraftIndex({ documentType: 'PurchaseOrder', documentId: po._id });
    await po.deleteOne();
    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid purchase order ID'));

    const source = await PurchaseOrder.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Purchase order not found'));

    const poNumber = await generatePoNumber();
    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const po = await PurchaseOrder.create({
      ...clone,
      purchaseOrderNumber: poNumber,
      status: 'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: po.organization,
      documentType: 'PurchaseOrder',
      documentId:   po._id,
      title:        po.purchaseOrderNumber,
    });

    const result = await buildPoResponse(po);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { purchaseOrder: result } });
  } catch (err) {
    return next(err);
  }
}
