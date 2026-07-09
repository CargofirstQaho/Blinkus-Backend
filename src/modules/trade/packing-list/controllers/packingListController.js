import mongoose from 'mongoose';
import PackingList from '../models/PackingList.js';
import Organization from '../../organization/models/Organization.js';
import Contract from '../../contracts/models/Contract.js';
import { buildPackingListPdf } from '../services/packingListPdfService.js';
import { uploadFile } from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';
import { isContractActive } from '../../contracts/utils/contractActivation.js';

async function generatePlNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PL/${year}/${month}/`;

  const latest = await PackingList.findOne(
    { packingListNumber: { $regex: `^${prefix}` } },
    { packingListNumber: 1 },
    { sort: { packingListNumber: -1 } }
  ).lean();

  let seq = 1;
  if (latest) {
    const parts = latest.packingListNumber.split('/');
    seq = (parseInt(parts[3], 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function buildPlPayload(body) {
  const packingItems = (body.packingItems || []).map((it) => ({
    marksAndNumbers:  (it.marksAndNumbers || '').trim(),
    packagingType:    (it.packagingType   || '').trim(),
    numberOfPackages: parseFloat(it.numberOfPackages) || 0,
    commodity:        (it.commodity       || '').trim(),
    description:      (it.description     || '').trim(),
    hsnCode:          (it.hsnCode          || '').trim(),
    netWeight:        parseFloat(it.netWeight)   || 0,
    grossWeight:      parseFloat(it.grossWeight) || 0,
    quantity:         parseFloat(it.quantity)    || 0,
    unit:             (it.unit             || '').trim(),
  }));

  const pli   = body.packingListInfo || {};
  const exp   = body.exporterDetails  || {};
  const buyer = body.buyerDetails     || {};
  const consignee = body.consignee    || {};
  const ship  = body.shippingDetails  || {};

  return {
    packingListInfo: {
      date: pli.date || null,
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
    consignee: {
      name:    (consignee.name    || '').trim(),
      address: (consignee.address || '').trim(),
      country: (consignee.country || '').trim(),
      phone:   (consignee.phone   || '').trim(),
      email:   (consignee.email   || '').trim().toLowerCase(),
    },
    shippingDetails: {
      portOfLoading:   (ship.portOfLoading   || '').trim(),
      portOfDischarge: (ship.portOfDischarge || '').trim(),
      vessel:          (ship.vessel          || '').trim(),
      containerNumber: (ship.containerNumber || '').trim().toUpperCase(),
      sealNumber:      (ship.sealNumber      || '').trim().toUpperCase(),
    },
    packingItems,
    remarks:            (body.remarks            || '').trim(),
    termsAndConditions: (body.termsAndConditions || '').trim(),
  };
}

async function buildPlResponse(pl) {
  const pdfUrl = pl.pdfKey ? await getSignedUrl(pl.pdfKey) : null;
  const obj    = pl.toObject ? pl.toObject() : { ...pl };
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
      return next(errorHandler(400, 'A valid Contract must be selected to create a Packing List.'));
    }

    const contract = await Contract.findOne({ _id: contractId, user: userId }).lean();
    if (!contract) return next(errorHandler(404, 'Selected contract not found.'));
    if (!isContractActive(contract)) {
      return next(errorHandler(400, 'A finalized, signed Contract is required to create a Packing List.'));
    }

    const payload = buildPlPayload(req.body);
    payload.contract       = contract._id;
    payload.contractNumber = contract.contractNumber;

    const documentId = req.body.documentId;
    let pl = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      pl = await PackingList.findOne({ _id: documentId, user: userId, status: 'DRAFT' });
    }

    if (pl) {
      Object.assign(pl, payload);
      await pl.save();
    } else {
      const plNumber = await generatePlNumber();
      pl = await PackingList.create({
        user:              userId,
        organization:      org._id,
        packingListNumber: plNumber,
        status:            'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: org._id,
      documentType: 'PackingList',
      documentId:   pl._id,
      title:        pl.packingListNumber,
    });

    const result = await buildPlResponse(pl);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: org._id,
      action: AUDIT_ACTIONS.PACKING_LIST_DRAFT_SAVED,
      module: AUDIT_MODULES.PACKING_LIST,
      resourceType: 'PackingList',
      resourceId: pl._id,
      description: 'Packing list draft saved',
      metadata: { contractId: pl.contract },
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { packingList: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const pl = await PackingList.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!pl) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { packingList: null } });
    }
    const result = await buildPlResponse(pl);
    return res.status(200).json({ success: true, data: { packingList: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid packing list ID'));

    const pl = await PackingList.findOne({ _id: id, user: req.user._id });
    if (!pl) return next(errorHandler(404, 'Packing list not found'));

    const result = await buildPlResponse(pl);
    return res.status(200).json({ success: true, data: { packingList: result } });
  } catch (err) {
    return next(err);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid packing list ID'));

    const pl = await PackingList.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!pl) return next(errorHandler(404, 'Packing list not found'));

    if (!pl.contract) return next(errorHandler(400, 'A valid Contract must be linked before generating the PDF.'));

    const contract = await Contract.findOne({ _id: pl.contract, user: req.user._id }).lean();
    if (!contract || !isContractActive(contract)) {
      return next(errorHandler(400, 'A finalized, signed Contract is required to generate the Packing List PDF.'));
    }

    const payload = buildPlPayload(req.body);
    payload.contract       = contract._id;
    payload.contractNumber = contract.contractNumber;
    Object.assign(pl, payload);

    const organization = pl.organization;
    const logoUrl       = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildPackingListPdf(pl, organization, logoUrl);

    const key = `packing-lists/${req.user._id}/${pl._id}/${Date.now()}.pdf`;

    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    pl.pdfKey      = key;
    pl.status      = 'GENERATED';
    pl.generatedAt = new Date();
    await pl.save();

    await removeDraftIndex({ documentType: 'PackingList', documentId: pl._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = pl.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.PACKING_LIST_GENERATED,
      module: AUDIT_MODULES.PACKING_LIST,
      resourceType: 'PackingList',
      resourceId: pl._id,
      description: 'Packing list PDF generated',
      metadata: { packingListNumber: pl.packingListNumber, contractId: pl.contract },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'PackingList',
      resourceId: pl._id,
      description: 'Packing list PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data:    { packingList: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const pl = await PackingList.findOne({ user: req.user._id, status: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!pl) return next(errorHandler(404, 'No draft found'));
    await removeDraftIndex({ documentType: 'PackingList', documentId: pl._id });
    await pl.deleteOne();
    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid packing list ID'));

    const source = await PackingList.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Packing list not found'));

    const plNumber = await generatePlNumber();
    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const pl = await PackingList.create({
      ...clone,
      packingListNumber: plNumber,
      status: 'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: pl.organization,
      documentType: 'PackingList',
      documentId:   pl._id,
      title:        pl.packingListNumber,
    });

    const result = await buildPlResponse(pl);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { packingList: result } });
  } catch (err) {
    return next(err);
  }
}
