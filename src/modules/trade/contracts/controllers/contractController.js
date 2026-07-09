import mongoose from 'mongoose';
import Contract      from '../models/Contract.js';
import Organization  from '../../organization/models/Organization.js';
import CommercialInvoice from '../../commercial-invoice/models/CommercialInvoice.js';
import ProformaInvoice   from '../../proforma-invoice/models/ProformaInvoice.js';
import PackingList       from '../../packing-list/models/PackingList.js';
import { buildContractPdf } from '../services/contractPdfService.js';
import { uploadFile }   from '../../../../services/storage/s3UploadService.js';
import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { errorHandler } from '../../../../utils/errorHandler.js';
import { createAuditLog } from '../../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/constants/auditActions.js';
import { syncDraftIndex, removeDraftIndex } from '../../drafts/services/draftIndexService.js';
import { isContractActive, contractActivationStatus } from '../utils/contractActivation.js';
import { computeShipmentStatus, computeShipmentProgress, buildShipmentTimeline, FUTURE_DOCUMENT_TYPES } from '../../history/services/shipmentStatusEngine.js';
import { attachPdfUrl } from '../../history/services/documentAggregationService.js';

const ALLOWED_UPLOAD_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_SIGNED_UPLOAD_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_BYTES = parseInt(process.env.MAX_CONTRACT_FILE_SIZE_MB || '10', 10) * 1024 * 1024;

function str(v) { return (v || '').toString().trim(); }
function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }


function normalizeContractNumber(v) {
  return (v || '').toString().toUpperCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildPayload(body) {
  return {
    contractNumber: normalizeContractNumber(body.contractNumber),
    contractDate:   body.contractDate || null,
    contractType:   str(body.contractType),
    buyerName:      str(body.buyerName),
    sellerName:     str(body.sellerName),

    buyer: {
      companyName:   str(body.buyer?.companyName),
      address:       str(body.buyer?.address),
      country:       str(body.buyer?.country),
      contactPerson: str(body.buyer?.contactPerson),
      phone:         str(body.buyer?.phone),
      email:         str(body.buyer?.email).toLowerCase(),
      taxNumber:     str(body.buyer?.taxNumber),
    },

    seller: {
      companyName:   str(body.seller?.companyName),
      address:       str(body.seller?.address),
      country:       str(body.seller?.country),
      contactPerson: str(body.seller?.contactPerson),
      phone:         str(body.seller?.phone),
      email:         str(body.seller?.email).toLowerCase(),
      taxNumber:     str(body.seller?.taxNumber),
    },

    commodity: {
      commodity:            str(body.commodity?.commodity),
      hsCode:               str(body.commodity?.hsCode),
      originCountry:        str(body.commodity?.originCountry),
      qualitySpecification: str(body.commodity?.qualitySpecification),
    },

    shipment: {
      incoterm:        str(body.shipment?.incoterm),
      loadingPort:     str(body.shipment?.loadingPort),
      destinationPort: str(body.shipment?.destinationPort),
      partialShipment: str(body.shipment?.partialShipment) || 'No',
      transshipment:   str(body.shipment?.transshipment)   || 'No',
      quantity:        num(body.shipment?.quantity),
      unit:            str(body.shipment?.unit),
    },

    price: {
      currency:           str(body.price?.currency) || 'USD',
      unitPrice:          num(body.price?.unitPrice),
      totalContractValue: num(body.price?.totalContractValue),
    },

    paymentTerms: {
      advancePercent: num(body.paymentTerms?.advancePercent),
      balancePercent: num(body.paymentTerms?.balancePercent),
      paymentMethod:  str(body.paymentTerms?.paymentMethod),
    },

    packing: {
      packagingType: str(body.packing?.packagingType),
      bagMarking:    str(body.packing?.bagMarking),
    },

    inspection: {
      inspectionAgency:      str(body.inspection?.inspectionAgency),
      inspectionRequirement: str(body.inspection?.inspectionRequirement),
    },

    insurance: {
      responsibility: str(body.insurance?.responsibility) || 'Seller',
    },

    forceMajeure: str(body.forceMajeure),
    arbitration:  str(body.arbitration),
    governingLaw: str(body.governingLaw),

    clauses: Array.isArray(body.clauses)
      ? body.clauses.map((c, i) => ({
          order:   typeof c.order === 'number' ? c.order : i,
          title:   str(c.title),
          content: str(c.content),
        })).filter(c => c.title && c.content)
      : [],

    standardClauses: {
      forceMajeure:      { enabled: !!body.standardClauses?.forceMajeure?.enabled,      content: str(body.standardClauses?.forceMajeure?.content)      },
      arbitration:       { enabled: !!body.standardClauses?.arbitration?.enabled,       content: str(body.standardClauses?.arbitration?.content)       },
      qualityClaims:     { enabled: !!body.standardClauses?.qualityClaims?.enabled,     content: str(body.standardClauses?.qualityClaims?.content)     },
      insurance:         { enabled: !!body.standardClauses?.insurance?.enabled,         content: str(body.standardClauses?.insurance?.content)         },
      inspection:        { enabled: !!body.standardClauses?.inspection?.enabled,        content: str(body.standardClauses?.inspection?.content)        },
      paymentDefault:    { enabled: !!body.standardClauses?.paymentDefault?.enabled,    content: str(body.standardClauses?.paymentDefault?.content)    },
      disputeResolution: { enabled: !!body.standardClauses?.disputeResolution?.enabled, content: str(body.standardClauses?.disputeResolution?.content) },
    },
  };
}

async function assertContractNumberUnique(orgId, contractNumber, excludeId = null) {
  const normalized = normalizeContractNumber(contractNumber);
  if (!normalized) return;
  const query = {
    organization: orgId,
    contractNumber: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Contract.findOne(query).lean();
  if (existing) throw errorHandler(409, `Contract number "${normalized}" already exists for your organization`);
}

export async function checkContractNumber(req, res, next) {
  try {
    const userId = req.user._id;
    const contractNumber = normalizeContractNumber(req.query.contractNumber);

    if (!contractNumber) {
      return res.status(200).json({ success: true, data: { available: true } });
    }

    const org = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const query = {
      organization: org._id,
      contractNumber: { $regex: `^${escapeRegExp(contractNumber)}$`, $options: 'i' },
    };

    const excludeId = req.query.excludeId;
    if (excludeId && mongoose.isValidObjectId(excludeId)) {
      query._id = { $ne: excludeId };
    }

    const existing = await Contract.findOne(query).lean();
    return res.status(200).json({ success: true, data: { available: !existing } });
  } catch (err) {
    return next(err);
  }
}

async function buildContractResponse(contract) {
  const obj = contract.toObject ? contract.toObject() : { ...contract };
  if (obj.pdfKey) {
    obj.pdfUrl = await getSignedUrl(obj.pdfKey);
    delete obj.pdfKey;
  }
  if (obj.documentS3Key) {
    obj.documentUrl = await getSignedUrl(obj.documentS3Key);
  }
  obj.activationStatus = contractActivationStatus(contract);
  if (obj.signedContract?.s3Key) {
    obj.signedContract = {
      fileName:   obj.signedContract.fileName,
      mimeType:   obj.signedContract.mimeType,
      size:       obj.signedContract.size,
      uploadedAt: obj.signedContract.uploadedAt,
      uploadedBy: obj.signedContract.uploadedBy,
      url:        await getSignedUrl(obj.signedContract.s3Key),
    };
  } else {
    obj.signedContract = null;
  }
  return obj;
}

export async function saveDraft(req, res, next) {
  try {
    const userId = req.user._id;
    const org    = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const payload    = buildPayload(req.body);
    const documentId = req.body.documentId;

    let contract = null;
    if (documentId && mongoose.isValidObjectId(documentId)) {
      contract = await Contract.findOne({ _id: documentId, user: userId, status: 'DRAFT', contractMode: 'DRAFT' });
    }

    if (payload.contractNumber) {
      await assertContractNumberUnique(org._id, payload.contractNumber, contract?._id);
    }

    if (contract) {
      Object.assign(contract, payload);
      await contract.save();
    } else {
      contract = await Contract.create({
        user:         userId,
        organization: org._id,
        contractMode: 'DRAFT',
        status:       'DRAFT',
        ...payload,
      });
    }

    await syncDraftIndex({
      user:         userId,
      organization: org._id,
      documentType: 'Contract',
      documentId:   contract._id,
      title:        contract.contractNumber || 'Untitled Contract',
    });

    const result = await buildContractResponse(contract);

    await createAuditLog({
      req,
      userId: userId,
      organizationId: org._id,
      action: AUDIT_ACTIONS.CONTRACT_DRAFT_SAVED,
      module: AUDIT_MODULES.CONTRACT,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Contract draft saved',
    });

    return res.status(200).json({ success: true, message: 'Draft saved', data: { contract: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getLatestDraft(req, res, next) {
  try {
    const contract = await Contract.findOne({ user: req.user._id, status: 'DRAFT', contractMode: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!contract) {
      return res.status(200).json({ success: true, message: 'No draft found', data: { contract: null } });
    }
    const result = await buildContractResponse(contract);
    return res.status(200).json({ success: true, data: { contract: result } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid contract ID'));

    const contract = await Contract.findOne({ _id: id, user: req.user._id });
    if (!contract) return next(errorHandler(404, 'Contract not found'));

    const result = await buildContractResponse(contract);
    return res.status(200).json({ success: true, data: { contract: result } });
  } catch (err) {
    return next(err);
  }
}

export async function listFinalized(req, res, next) {
  try {
    const contracts = await Contract.find({ user: req.user._id, status: 'FINALIZED' })
      .sort({ createdAt: -1 })
      .lean();

    const includeAll = req.query.all === 'true';
    const list = includeAll ? contracts : contracts.filter(isContractActive);

    const results = await Promise.all(list.map(async (c) => {
      if (c.documentS3Key) {
        c.documentUrl = await getSignedUrl(c.documentS3Key);
      }
      c.activationStatus = contractActivationStatus(c);
      delete c.pdfKey;
      delete c.documentS3Key;
      delete c.signedContract;
      return c;
    }));

    return res.status(200).json({ success: true, data: { contracts: results } });
  } catch (err) {
    return next(err);
  }
}

export async function finalizeAndGeneratePdf(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid contract ID'));

    const contract = await Contract.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!contract) return next(errorHandler(404, 'Contract not found'));

    if (contract.status === 'FINALIZED') return next(errorHandler(400, 'Contract is already finalized and cannot be modified'));

    const payload = buildPayload(req.body);

    await assertContractNumberUnique(contract.organization._id, payload.contractNumber, id);

    Object.assign(contract, payload);
    contract.status = 'FINALIZED';

    const organization = contract.organization;
    const logoUrl      = organization?.logoKey ? await getSignedUrl(organization.logoKey) : null;

    const pdfBuffer = await buildContractPdf(contract, organization, logoUrl);

    const key = `contracts/${req.user._id}/${contract._id}/${Date.now()}.pdf`;
    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key });

    contract.pdfKey      = key;
    contract.generatedAt = new Date();
    await contract.save();

    await removeDraftIndex({ documentType: 'Contract', documentId: contract._id });

    const pdfUrl = await getSignedUrl(key);
    const obj    = contract.toObject();
    delete obj.pdfKey;

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: contract.organization?._id || null,
      action: AUDIT_ACTIONS.CONTRACT_GENERATED,
      module: AUDIT_MODULES.CONTRACT,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Contract finalized and PDF generated',
      metadata: { contractNumber: contract.contractNumber, contractId: contract._id },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: contract.organization?._id || null,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Contract PDF uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'Contract finalized and PDF generated',
      data:    { contract: { ...obj, pdfUrl } },
    });
  } catch (err) {
    return next(err);
  }
}

export async function uploadContract(req, res, next) {
  try {
    const userId = req.user._id;
    const org    = await Organization.findOne({ user: userId }).lean();
    if (!org) return next(errorHandler(400, 'No organization found. Please set up your organization first.'));

    const { buyerName, sellerName } = req.body;
    const contractNumber = normalizeContractNumber(req.body.contractNumber);

    if (!contractNumber)         return next(errorHandler(400, 'Contract number is required'));
    if (!buyerName?.trim())      return next(errorHandler(400, 'Buyer name is required'));
    if (!sellerName?.trim())     return next(errorHandler(400, 'Seller name is required'));

    if (!req.file) return next(errorHandler(400, 'Contract document is required'));

    if (!ALLOWED_UPLOAD_MIMES.includes(req.file.mimetype)) {
      return next(errorHandler(400, 'Only PDF, DOC, and DOCX files are allowed'));
    }

    if (req.file.size > MAX_FILE_BYTES) {
      return next(errorHandler(400, `File size must not exceed ${process.env.MAX_CONTRACT_FILE_SIZE_MB || 10}MB`));
    }

    await assertContractNumberUnique(org._id, contractNumber);

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const key = `contracts/${userId}/uploads/${Date.now()}.${ext}`;

    await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype, key });

    const documentUrl = await getSignedUrl(key);

    const contract = await Contract.create({
      user:           userId,
      organization:   org._id,
      contractNumber: contractNumber,
      contractMode:   'UPLOAD',
      status:         'FINALIZED',
      buyerName:      buyerName.trim(),
      sellerName:     sellerName.trim(),
      documentS3Key:  key,
      documentUrl,
    });

    const obj = contract.toObject();
    delete obj.documentS3Key;
    obj.documentUrl = documentUrl;

    await createAuditLog({
      req,
      userId: userId,
      organizationId: org._id,
      action: AUDIT_ACTIONS.CONTRACT_UPLOADED,
      module: AUDIT_MODULES.CONTRACT,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Contract document uploaded',
      metadata: { contractNumber },
    });

    await createAuditLog({
      req,
      userId: userId,
      organizationId: org._id,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Contract document uploaded to S3',
      metadata: { key },
    });

    return res.status(201).json({
      success: true,
      message: 'Contract uploaded and saved',
      data:    { contract: obj },
    });
  } catch (err) {
    return next(err);
  }
}

export async function uploadSignedContract(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid contract ID'));

    const contract = await Contract.findOne({ _id: id, user: req.user._id });
    if (!contract) return next(errorHandler(404, 'Contract not found'));

    if (contract.contractMode !== 'DRAFT' || contract.status !== 'FINALIZED') {
      return next(errorHandler(400, 'A generated contract PDF is required before uploading the signed contract'));
    }

    if (contract.signedContract?.s3Key) {
      return next(errorHandler(409, 'Signed contract already uploaded and cannot be replaced'));
    }

    if (!req.file) return next(errorHandler(400, 'Signed contract document is required'));

    if (!ALLOWED_SIGNED_UPLOAD_MIMES.includes(req.file.mimetype)) {
      return next(errorHandler(400, 'Only PDF and DOCX files are allowed'));
    }

    if (req.file.size > MAX_FILE_BYTES) {
      return next(errorHandler(400, `File size must not exceed ${process.env.MAX_CONTRACT_FILE_SIZE_MB || 10}MB`));
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const key = `contracts/${req.user._id}/${contract._id}/signed/${Date.now()}.${ext}`;

    await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype, key });

    contract.signedContract = {
      s3Key:      key,
      fileName:   req.file.originalname,
      mimeType:   req.file.mimetype,
      size:       req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };
    await contract.save();

    const result = await buildContractResponse(contract);

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: contract.organization,
      action: AUDIT_ACTIONS.CONTRACT_SIGNED_UPLOADED,
      module: AUDIT_MODULES.CONTRACT,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Signed contract uploaded',
      metadata: { contractNumber: contract.contractNumber, contractId: contract._id },
    });

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId: contract.organization,
      action: AUDIT_ACTIONS.S3_UPLOAD_SUCCESS,
      module: AUDIT_MODULES.STORAGE,
      resourceType: 'Contract',
      resourceId: contract._id,
      description: 'Signed contract uploaded to S3',
      metadata: { key },
    });

    return res.status(200).json({
      success: true,
      message: 'Signed contract uploaded. Contract is now active.',
      data:    { contract: result },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getShipment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid contract ID'));

    const contract = await Contract.findOne({ _id: id, user: req.user._id }).populate('organization');
    if (!contract) return next(errorHandler(404, 'Contract not found'));

    const [commercialInvoices, proformaInvoices, packingLists] = await Promise.all([
      CommercialInvoice.find({ contract: id, user: req.user._id }).lean(),
      ProformaInvoice.find({ contract: id, user: req.user._id }).lean(),
      PackingList.find({ contract: id, user: req.user._id }).lean(),
    ]);

    await Promise.all([
      ...commercialInvoices.map(attachPdfUrl),
      ...proformaInvoices.map(attachPdfUrl),
      ...packingLists.map(attachPdfUrl),
    ]);

    const hasCI = commercialInvoices.length > 0;
    const hasPI = proformaInvoices.length > 0;
    const hasPL = packingLists.length > 0;

    const contractResult = await buildContractResponse(contract);
    contractResult.businessStatus = computeShipmentStatus(contract, { hasCI, hasPI, hasPL });
    contractResult.progress = computeShipmentProgress({ contract, hasCI, hasPI, hasPL });

    const timeline = buildShipmentTimeline(contract, {
      hasCI, hasPI, hasPL,
      latestCI: commercialInvoices[0],
      latestPI: proformaInvoices[0],
      latestPL: packingLists[0],
    });

    return res.status(200).json({
      success: true,
      data: {
        contract: contractResult,
        commercialInvoices,
        proformaInvoices,
        packingLists,
        timeline,
        futureDocuments: FUTURE_DOCUMENT_TYPES,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateShipmentStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid contract ID'));

    const { status } = req.body;
    if (status !== null && status !== 'COMPLETED' && status !== 'CANCELLED') {
      return next(errorHandler(400, 'status must be COMPLETED, CANCELLED, or null'));
    }

    const contract = await Contract.findOne({ _id: id, user: req.user._id });
    if (!contract) return next(errorHandler(404, 'Contract not found'));

    contract.shipmentStatus = status;
    await contract.save();

    const result = await buildContractResponse(contract);

    return res.status(200).json({ success: true, message: 'Shipment status updated', data: { contract: result } });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const contract = await Contract.findOne({ user: req.user._id, status: 'DRAFT', contractMode: 'DRAFT' }).sort({ updatedAt: -1 });
    if (!contract) return next(errorHandler(404, 'No draft found'));
    const contractId = contract._id;
    const organizationId = contract.organization;
    await removeDraftIndex({ documentType: 'Contract', documentId: contractId });
    await contract.deleteOne();

    await createAuditLog({
      req,
      userId: req.user._id,
      organizationId,
      action: AUDIT_ACTIONS.CONTRACT_DRAFT_DELETED,
      module: AUDIT_MODULES.CONTRACT,
      resourceType: 'Contract',
      resourceId: contractId,
      description: 'Contract draft deleted',
    });

    return res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(errorHandler(400, 'Invalid contract ID'));

    const source = await Contract.findOne({ _id: id, user: req.user._id });
    if (!source) return next(errorHandler(404, 'Contract not found'));

    const clone = source.toObject();
    delete clone._id;
    delete clone.__v;
    delete clone.pdfKey;
    delete clone.documentS3Key;
    delete clone.generatedAt;
    delete clone.createdAt;
    delete clone.updatedAt;

    const contract = await Contract.create({
      ...clone,
      contractNumber: '',
      contractMode:   'DRAFT',
      status:         'DRAFT',
    });

    await syncDraftIndex({
      user:         req.user._id,
      organization: contract.organization,
      documentType: 'Contract',
      documentId:   contract._id,
      title:        contract.contractNumber || 'Untitled Contract',
    });

    const result = await buildContractResponse(contract);
    return res.status(201).json({ success: true, message: 'Draft duplicated', data: { contract: result } });
  } catch (err) {
    return next(err);
  }
}
