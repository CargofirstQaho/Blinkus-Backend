import { isContractActive } from '../../contracts/utils/contractActivation.js';

export const MANDATORY_DOCUMENT_TYPES = [
  { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
  { type: 'PROFORMA_INVOICE',   label: 'Proforma Invoice' },
  { type: 'PACKING_LIST',       label: 'Packing List' },
];

export const FUTURE_DOCUMENT_TYPES = [
  { type: 'QUALITY_INSPECTION',      label: 'Quality Inspection' },
  { type: 'CERTIFICATE_OF_ORIGIN',   label: 'Certificate of Origin' },
  { type: 'BILL_OF_LADING',          label: 'Bill of Lading' },
  { type: 'INSURANCE',               label: 'Insurance' },
  { type: 'SHIPPING',                label: 'Shipping' },
  { type: 'PAYMENT',                 label: 'Payment' },
  { type: 'CUSTOMS',                 label: 'Customs' },
];

export function computeShipmentStatus(contract, { hasCI, hasPI, hasPL }) {
  if (contract.shipmentStatus) return contract.shipmentStatus;
  if (contract.status !== 'FINALIZED') return 'DRAFT';
  if (!isContractActive(contract)) return 'WAITING_FOR_SIGNATURE';
  if (!hasCI && !hasPI && !hasPL) return 'ACTIVE';
  if (hasCI && hasPI && hasPL) return 'READY';
  return 'DOCUMENTS_IN_PROGRESS';
}

export function computeShipmentProgress({ contract, hasCI, hasPI, hasPL }) {
  const checkpoints = [
    !!contract.generatedAt,
    isContractActive(contract),
    hasCI,
    hasPI,
    hasPL,
  ];
  const completed = checkpoints.filter(Boolean).length;
  return Math.round((completed / checkpoints.length) * 100);
}

export function buildShipmentTimeline(contract, { hasCI, hasPI, hasPL, latestCI, latestPI, latestPL } = {}) {
  const active = isContractActive(contract);
  const stages = [
    { stage: 'DRAFT_CREATED',    label: 'Draft Created',              completed: true,                  date: contract.createdAt },
    { stage: 'CONTRACT_GENERATED', label: 'Contract Generated',       completed: !!contract.generatedAt, date: contract.generatedAt },
    { stage: 'WAITING_SIGNATURE', label: 'Waiting for Signed Contract', completed: active,               date: contract.generatedAt },
    { stage: 'SIGNED_UPLOADED',  label: 'Signed Contract Uploaded',   completed: !!contract.signedContract?.uploadedAt, date: contract.signedContract?.uploadedAt },
    { stage: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice',       completed: hasCI,                  date: latestCI?.generatedAt || latestCI?.updatedAt },
    { stage: 'PACKING_LIST',     label: 'Packing List',               completed: hasPL,                  date: latestPL?.generatedAt || latestPL?.updatedAt },
    { stage: 'PROFORMA_INVOICE', label: 'Proforma Invoice',           completed: hasPI,                  date: latestPI?.generatedAt || latestPI?.updatedAt },
    ...FUTURE_DOCUMENT_TYPES.map((doc) => ({ stage: doc.type, label: doc.label, completed: false, date: null })),
    { stage: 'SHIPMENT_COMPLETED', label: 'Shipment Completed',       completed: contract.shipmentStatus === 'COMPLETED', date: null },
  ];
  return stages;
}
