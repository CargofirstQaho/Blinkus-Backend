import mongoose from 'mongoose';
import CommercialInvoice from '../models/CommercialInvoice.js';
import Organization      from '../../organization/models/Organization.js';
import Contract          from '../../contracts/models/Contract.js';
import { buildCommercialInvoicePdf } from '../services/commercialInvoicePdfService.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';
import { isContractActive } from '../../contracts/utils/contractActivation.js';
import { computeLineItemTax, computeGstSummary, resolveOverridable } from '../../shared/utils/gstCalculator.js';

async function generateCiNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CI/${year}/${month}/`;

  const latest = await CommercialInvoice.findOne(
    { commercialInvoiceNumber: { $regex: `^${prefix}` } },
    { commercialInvoiceNumber: 1 },
    { sort: { commercialInvoiceNumber: -1 } }
  ).lean();

  let seq = 1;
  if (latest) {
    const parts = latest.commercialInvoiceNumber.split('/');
    seq = (parseInt(parts[3], 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function buildCiPayload(body, organization) {
  const goodsItems = (body.goodsItems || []).map((it) => {
    const qty       = parseFloat(it.quantity)  || 0;
    const unitPrice = parseFloat(it.unitPrice) || 0;
    const { taxAmount } = computeLineItemTax(qty, unitPrice, it.taxPercent);
    return {
      commodity:   (it.commodity   || '').trim(),
      hsnCode:     (it.hsnCode     || '').trim(),
      description: (it.description || '').trim(),
      quantity:    qty,
      unit:        (it.unit        || '').trim(),
      unitPrice,
      taxPercent:  parseFloat(it.taxPercent) || 0,
      taxAmount,
      amount:      qty * unitPrice,
    };
  });

  const subTotal = goodsItems.reduce((s, it) => s + it.amount, 0);
  const totalTax = goodsItems.reduce((s, it) => s + it.taxAmount, 0);

  const ii       = body.invoiceInfo     || {};
  const exp      = body.exporterDetails || {};
  const buyer    = body.buyerDetails    || {};
  const notify   = body.notifyParty     || {};
  const consignee = body.consignee      || {};
  const ship     = body.shippingDetails || {};
  const fin      = body.financial       || {};
  const bank     = body.bankDetails     || {};
  const sig      = body.signatory       || {};

  const placeOfSupply = (fin.placeOfSupply || '').trim();
  const computed = computeGstSummary({
    currency: fin.currency || 'USD',
    orgGstNumber: organization?.kyc?.gst?.number,
    placeOfSupply,
    totalTax,
  });

  const cgst = resolveOverridable(fin.cgst, computed.cgst);
  const sgst = resolveOverridable(fin.sgst, computed.sgst);
  const igst = resolveOverridable(fin.igst, computed.igst);

  const freight   = parseFloat(fin.freight)   || 0;
  const insurance = parseFloat(fin.insurance) || 0;
  const computedTotal = subTotal + cgst + sgst + igst + freight + insurance;
  const total = resolveOverridable(fin.total, computedTotal);

  return {
    invoiceInfo: {
      date: ii.date || null,
    },
    exporterDetails: {
      companyName: (exp.companyName || '').trim(),
      address:     (exp.address     || '').trim(),
      country:     (exp.country     || '').trim(),
      email:       (exp.email       || '').trim().toLowerCase(),
      phone:       (exp.phone       || '').trim(),
      taxNumber:   (exp.taxNumber   || '').trim(),
    },
    buyerDetails: {
      companyName:   (buyer.companyName   || '').trim(),
      address:       (buyer.address       || '').trim(),
      country:       (buyer.country       || '').trim(),
      contactPerson: (buyer.contactPerson || '').trim(),
      phone:         (buyer.phone         || '').trim(),
      email:         (buyer.email         || '').trim().toLowerCase(),
      taxNumber:     (buyer.taxNumber     || '').trim(),
    },
    notifyParty: {
      name:    (notify.name    || '').trim(),
      address: (notify.address || '').trim(),
      country: (notify.country || '').trim(),
      phone:   (notify.phone   || '').trim(),
      email:   (notify.email   || '').trim().toLowerCase(),
    },
    consignee: {
      name:    (consignee.name    || '').trim(),
      address: (consignee.address || '').trim(),
      country: (consignee.country || '').trim(),
      phone:   (consignee.phone   || '').trim(),
      email:   (consignee.email   || '').trim().toLowerCase(),
    },
    shippingDetails: {
      vessel:           (ship.vessel           || '').trim(),
      blNumber:         (ship.blNumber         || '').trim().toUpperCase(),
      portOfLoading:    (ship.portOfLoading    || '').trim(),
      portOfDischarge:  (ship.portOfDischarge  || '').trim(),
      finalDestination: (ship.finalDestination || '').trim(),
    },
    goodsItems,
    financial: {
      currency: (fin.currency || 'USD').trim(),
      subTotal,
      placeOfSupply,
      cgst,
      sgst,
      igst,
      freight,
      insurance,
      total,
    },
    bankDetails: {
      bankName:      (bank.bankName      || '').trim(),
      accountNumber: (bank.accountNumber || '').trim(),
      swift:         (bank.swift         || '').trim().toUpperCase(),
      ifsc:          (bank.ifsc          || '').trim().toUpperCase(),
    },
    declaration:        (body.declaration        || '').trim(),
    termsAndConditions: (body.termsAndConditions || '').trim(),
    signatory: {
      name:        (sig.name        || '').trim(),
      designation: (sig.designation || '').trim(),
    },
  };
}

async function buildCiResponse(ci) {
  const pdfUrl = ci.pdfKey ? await getSignedUrl(ci.pdfKey) : null;
  const obj    = ci.toObject ? ci.toObject() : { ...ci };
  delete obj.pdfKey;
  return { ...obj, pdfUrl };
}

export async function saveDraft(req, res, next) {
  try {
    const userId = req.user._id;

    const org = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const contractId = req.body.contract;
    if (!contractId || !mongoose.isValidObjectId(contractId)) {
      return next(errorHandler(400, 'A valid Contract must be selected to create a Commercial Invoice.'));
    }

    const contract = await Contract.findOne({ _id: contractId, user: userId }).lean();
    if (!contract) return next(errorHandler(404, 'Selected contract not found.'));
    if (!isContractActive(contract)) {
      return next(errorHandler(400, 'A finalized, signed Contract is required to create a Commercial Invoice.'));
    }

    const payload = buildCiPayload(req.body, org);
    payload.contract       = contract._id;
    payload.contractNumber = contract.contractNumber;

    const documentId = req.body.documentId;
    let ci = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      ci = await CommercialInvoice.findOne({ _id: documentId, user: userId, status: 'DRAFT' });
    }

    if (ci) {
      Object.assign(ci, payload);
      await ci.save();
    } else {
      const ciNumber = await generateCiNumber();
      ci = await CommercialInvoice.create({
        user:                    userId,
        organization:            org._id,
        commercialInvoiceNumber: ciNumber,
        status:                  'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: org._id,
      documentType: 'CommercialInvoice',
      documentId:   ci._id,
      title:        ci.commercialInvoiceNumber,
    });

    const result = await buildCiResponse(ci);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: org._id,
      action: AUDIT_ACTIONS.COMMERCIAL_INVOICE_DRAFT_SAVED,
      module: AUDIT_MODULES.COMMERCIAL_INVOICE,
      resourceType: 'CommercialInvoice',
      resourceId: ci._id,
      description: 'Commercial invoice draft saved',
      metadata: { contractId: ci.contract },
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { commercialInvoice: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const ci = await CommercialInvoice.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!ci) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { commercialInvoice: null } });
    }
    const result = await buildCiResponse(ci);
    return res.status(200).json({ success: true, data: { commercialInvoice: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid commercial invoice ID'));

    const ci = await CommercialInvoice.findOne({ _id: id, user: req.user._id });
    if (!ci) return next(errorHandler(404, 'Commercial invoice not found'));

    const result = await buildCiResponse(ci);
    return res.status(200).json({ success: true, data: { commercialInvoice: result } });
  } catch (err) {
    return next(err);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid commercial invoice ID'));

    const ci = await CommercialInvoice.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!ci) return next(errorHandler(404, 'Commercial invoice not found'));

    if (!ci.contract) return next(errorHandler(400, 'A valid Contract must be linked before generating the PDF.'));

    const contract = await Contract.findOne({ _id: ci.contract, user: req.user._id }).lean();
    if (!contract || !isContractActive(contract)) {
      return next(errorHandler(400, 'A finalized, signed Contract is required to generate the Commercial Invoice PDF.'));
    }

    const organization = ci.organization;
    const payload = buildCiPayload(req.body, organization);
    payload.contract       = contract._id;
    payload.contractNumber = contract.contractNumber;
    Object.assign(ci, payload);

    const logoUrl = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildCommercialInvoicePdf(ci, organization, logoUrl);

    const key = `commercial-invoices/${req.user._id}/${ci._id}/${Date.now()}.pdf`;

    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    ci.pdfKey      = key;
    ci.status      = 'GENERATED';
    ci.generatedAt = new Date();
    await ci.save();

    await removeDraftIndex({ documentType: 'CommercialInvoice', documentId: ci._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = ci.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.COMMERCIAL_INVOICE_GENERATED,
      module: AUDIT_MODULES.COMMERCIAL_INVOICE,
      resourceType: 'CommercialInvoice',
      resourceId: ci._id,
      description: 'Commercial invoice PDF generated',
      metadata: { commercialInvoiceNumber: ci.commercialInvoiceNumber, contractId: ci.contract },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'CommercialInvoice',
      resourceId: ci._id,
      description: 'Commercial invoice PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data:    { commercialInvoice: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const ci = await CommercialInvoice.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!ci) return next(errorHandler(404, 'No draft found'));
    await removeDraftIndex({ documentType: 'CommercialInvoice', documentId: ci._id });
    await ci.deleteOne();
    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid commercial invoice ID'));

    const source = await CommercialInvoice.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Commercial invoice not found'));

    const ciNumber = await generateCiNumber();
    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const ci = await CommercialInvoice.create({
      ...clone,
      commercialInvoiceNumber: ciNumber,
      status: 'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: ci.organization,
      documentType: 'CommercialInvoice',
      documentId:   ci._id,
      title:        ci.commercialInvoiceNumber,
    });

    const result = await buildCiResponse(ci);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { commercialInvoice: result } });
  } catch (err) {
    return next(err);
  }
}
