import mongoose from 'mongoose';
import ProformaInvoice from '../models/ProformaInvoice.js';
import Organization     from '../../organization/models/Organization.js';
import Contract         from '../../contracts/models/Contract.js';
import { buildProformaInvoicePdf } from '../services/proformaInvoicePdfService.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';
import { isContractActive } from '../../contracts/utils/contractActivation.js';

async function generatePiNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PI/${year}/${month}/`;

  const latest = await ProformaInvoice.findOne(
    { proformaInvoiceNumber: { $regex: `^${prefix}` } },
    { proformaInvoiceNumber: 1 },
    { sort: { proformaInvoiceNumber: -1 } }
  ).lean();

  let seq = 1;
  if (latest) {
    const parts = latest.proformaInvoiceNumber.split('/');
    seq = (parseInt(parts[3], 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function buildPiPayload(body) {
  const lineItems = (body.commercialDetails || []).map((it) => {
    const qty  = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.rate)     || 0;
    return {
      commodity: (it.commodity || '').trim(),
      hsnCode:   (it.hsnCode   || '').trim(),
      quantity:  qty,
      unit:      (it.unit      || '').trim(),
      rate,
      amount:    qty * rate,
    };
  });

  const totalAmount = lineItems.reduce((s, it) => s + it.amount, 0);

  const ii      = body.invoiceInfo    || {};
  const exp     = body.exporterDetails || {};
  const buyer   = body.buyerDetails    || {};
  const notify  = body.notifyParty     || {};
  const consignee = body.consignee     || {};
  const ship    = body.shippingInfo    || {};
  const fin     = body.financialInfo   || {};
  const bank    = body.bankInfo        || {};

  const advancePercent  = parseFloat(fin.advancePercent) || 0;
  const advanceAmountRaw = fin.advanceAmount;
  const advanceAmount = advanceAmountRaw !== undefined && advanceAmountRaw !== null && advanceAmountRaw !== ''
    ? parseFloat(advanceAmountRaw) || 0
    : totalAmount * (advancePercent / 100);
  const balanceAmount = totalAmount - advanceAmount;

  return {
    invoiceInfo: {
      invoiceDate: ii.invoiceDate || null,
      currency:    (ii.currency || 'USD').trim(),
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
    shippingInfo: {
      portOfLoading:    (ship.portOfLoading    || '').trim(),
      portOfDischarge:  (ship.portOfDischarge  || '').trim(),
      finalDestination: (ship.finalDestination || '').trim(),
      countryOfOrigin:  (ship.countryOfOrigin  || '').trim(),
    },
    commercialDetails: lineItems,
    financialInfo: { advancePercent, advanceAmount, balanceAmount },
    bankInfo: {
      bankName:      (bank.bankName      || '').trim(),
      accountNumber: (bank.accountNumber || '').trim(),
      ifsc:          (bank.ifsc          || '').trim().toUpperCase(),
      swift:         (bank.swift         || '').trim().toUpperCase(),
    },
    notes:              (body.notes              || '').trim(),
    termsAndConditions: (body.termsAndConditions || '').trim(),
  };
}

async function buildPiResponse(pi) {
  const pdfUrl = pi.pdfKey ? await getSignedUrl(pi.pdfKey) : null;
  const obj    = pi.toObject ? pi.toObject() : { ...pi };
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
      return next(errorHandler(400, 'A valid Contract must be selected to create a Proforma Invoice.'));
    }

    const contract = await Contract.findOne({ _id: contractId, user: userId }).lean();
    if (!contract) return next(errorHandler(404, 'Selected contract not found.'));
    if (!isContractActive(contract)) {
      return next(errorHandler(400, 'A finalized, signed Contract is required to create a Proforma Invoice.'));
    }

    const payload = buildPiPayload(req.body);
    payload.contract       = contract._id;
    payload.contractNumber = contract.contractNumber;

    const documentId = req.body.documentId;
    let pi = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      pi = await ProformaInvoice.findOne({ _id: documentId, user: userId, status: 'DRAFT' });
    }

    if (pi) {
      Object.assign(pi, payload);
      await pi.save();
    } else {
      const piNumber = await generatePiNumber();
      pi = await ProformaInvoice.create({
        user:                  userId,
        organization:          org._id,
        proformaInvoiceNumber: piNumber,
        status:                'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: org._id,
      documentType: 'ProformaInvoice',
      documentId:   pi._id,
      title:        pi.proformaInvoiceNumber,
    });

    const result = await buildPiResponse(pi);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: org._id,
      action: AUDIT_ACTIONS.PROFORMA_INVOICE_DRAFT_SAVED,
      module: AUDIT_MODULES.PROFORMA_INVOICE,
      resourceType: 'ProformaInvoice',
      resourceId: pi._id,
      description: 'Proforma invoice draft saved',
      metadata: { contractId: pi.contract },
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { proformaInvoice: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const pi = await ProformaInvoice.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!pi) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { proformaInvoice: null } });
    }
    const result = await buildPiResponse(pi);
    return res.status(200).json({ success: true, data: { proformaInvoice: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid proforma invoice ID'));

    const pi = await ProformaInvoice.findOne({ _id: id, user: req.user._id });
    if (!pi) return next(errorHandler(404, 'Proforma invoice not found'));

    const result = await buildPiResponse(pi);
    return res.status(200).json({ success: true, data: { proformaInvoice: result } });
  } catch (err) {
    return next(err);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid proforma invoice ID'));

    const pi = await ProformaInvoice.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!pi) return next(errorHandler(404, 'Proforma invoice not found'));

    if (!pi.contract) return next(errorHandler(400, 'A valid Contract must be linked before generating the PDF.'));

    const contract = await Contract.findOne({ _id: pi.contract, user: req.user._id }).lean();
    if (!contract || !isContractActive(contract)) {
      return next(errorHandler(400, 'A finalized, signed Contract is required to generate the Proforma Invoice PDF.'));
    }

    const payload = buildPiPayload(req.body);
    payload.contract       = contract._id;
    payload.contractNumber = contract.contractNumber;
    Object.assign(pi, payload);

    const organization = pi.organization;
    const logoUrl       = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildProformaInvoicePdf(pi, organization, logoUrl);

    const key = `proforma-invoices/${req.user._id}/${pi._id}/${Date.now()}.pdf`;

    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    pi.pdfKey      = key;
    pi.status      = 'GENERATED';
    pi.generatedAt = new Date();
    await pi.save();

    await removeDraftIndex({ documentType: 'ProformaInvoice', documentId: pi._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = pi.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.PROFORMA_INVOICE_GENERATED,
      module: AUDIT_MODULES.PROFORMA_INVOICE,
      resourceType: 'ProformaInvoice',
      resourceId: pi._id,
      description: 'Proforma invoice PDF generated',
      metadata: { proformaInvoiceNumber: pi.proformaInvoiceNumber, contractId: pi.contract },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'ProformaInvoice',
      resourceId: pi._id,
      description: 'Proforma invoice PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data:    { proformaInvoice: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const pi = await ProformaInvoice.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!pi) return next(errorHandler(404, 'No draft found'));
    await removeDraftIndex({ documentType: 'ProformaInvoice', documentId: pi._id });
    await pi.deleteOne();
    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid proforma invoice ID'));

    const source = await ProformaInvoice.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Proforma invoice not found'));

    const piNumber = await generatePiNumber();
    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const pi = await ProformaInvoice.create({
      ...clone,
      proformaInvoiceNumber: piNumber,
      status: 'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: pi.organization,
      documentType: 'ProformaInvoice',
      documentId:   pi._id,
      title:        pi.proformaInvoiceNumber,
    });

    const result = await buildPiResponse(pi);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { proformaInvoice: result } });
  } catch (err) {
    return next(err);
  }
}
