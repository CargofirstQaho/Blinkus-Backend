import PurchaseOrder     from '../../purchaseOrder/models/PurchaseOrder.js';
import CreditNote        from '../../credit-note/models/CreditNote.js';
import DebitNote         from '../../debit-note/models/DebitNote.js';
import CommercialInvoice from '../../commercial-invoice/models/CommercialInvoice.js';
import ProformaInvoice   from '../../proforma-invoice/models/ProformaInvoice.js';
import PackingList       from '../../packing-list/models/PackingList.js';
import Contract          from '../../contracts/models/Contract.js';

export const DRAFT_DOCUMENT_TYPES = {
  PurchaseOrder: {
    Model:       PurchaseOrder,
    numberField: 'purchaseOrderNumber',
    finalStatus: 'GENERATED',
  },
  CreditNote: {
    Model:       CreditNote,
    numberField: 'creditNoteNumber',
    finalStatus: 'GENERATED',
  },
  DebitNote: {
    Model:       DebitNote,
    numberField: 'debitNoteNumber',
    finalStatus: 'GENERATED',
  },
  CommercialInvoice: {
    Model:       CommercialInvoice,
    numberField: 'commercialInvoiceNumber',
    finalStatus: 'GENERATED',
  },
  ProformaInvoice: {
    Model:       ProformaInvoice,
    numberField: 'proformaInvoiceNumber',
    finalStatus: 'GENERATED',
  },
  PackingList: {
    Model:       PackingList,
    numberField: 'packingListNumber',
    finalStatus: 'GENERATED',
  },
  Contract: {
    Model:       Contract,
    numberField: 'contractNumber',
    finalStatus: 'FINALIZED',
  },
};

export function resolveDraftDocumentType(documentType) {
  return DRAFT_DOCUMENT_TYPES[documentType] || null;
}

export const DRAFT_TYPE_SEARCH_TOKENS = {
  Contract:           'Contract CTR Agreement',
  PurchaseOrder:      'Purchase Order PO',
  CommercialInvoice:  'Commercial Invoice CI',
  PackingList:        'Packing List PL',
  ProformaInvoice:    'Proforma Invoice PI',
  CreditNote:         'Credit Note CN',
  DebitNote:          'Debit Note DN',
};
