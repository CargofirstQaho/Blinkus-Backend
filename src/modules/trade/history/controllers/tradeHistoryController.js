import Contract from '../../contracts/models/Contract.js';
import Organization from '../../organization/models/Organization.js';
import CommercialInvoice from '../../commercial-invoice/models/CommercialInvoice.js';
import ProformaInvoice from '../../proforma-invoice/models/ProformaInvoice.js';
import PackingList from '../../packing-list/models/PackingList.js';
import PurchaseOrder from '../../purchaseOrder/models/PurchaseOrder.js';
import CreditNote from '../../credit-note/models/CreditNote.js';
import DebitNote from '../../debit-note/models/DebitNote.js';
import { computeShipmentProgress, MANDATORY_DOCUMENT_TYPES } from '../services/shipmentStatusEngine.js';
import { filterSortPaginate, groupDocumentsByContract, mapDomesticDocument, DOCUMENT_TYPE_SEARCH_TOKENS } from '../services/documentAggregationService.js';

const STATUS_PRIORITY = {
  DRAFT: 0,
  WAITING_FOR_SIGNATURE: 1,
  ACTIVE: 2,
  DOCUMENTS_IN_PROGRESS: 3,
  READY: 4,
  COMPLETED: 5,
  CANCELLED: 6,
};

export async function listShipments(req, res, next) {
  try {
    const userId = req.user._id;
    const { status, documentType, dateFrom, dateTo, country, commodity, buyer, seller, search, sort, page, limit } = req.query;

    const [contracts, cis, pis, pls] = await Promise.all([
      Contract.find({ user: userId }).lean(),
      CommercialInvoice.find({ user: userId }).lean(),
      ProformaInvoice.find({ user: userId }).lean(),
      PackingList.find({ user: userId }).lean(),
    ]);

    const groups = groupDocumentsByContract(contracts, cis, pis, pls);

    const shipments = groups.map(({ contract, ciList, piList, plList, hasCI, hasPI, hasPL, businessStatus, buyerValue, sellerValue, commodityValue, countryValue }) => {
      const progress = computeShipmentProgress({ contract, hasCI, hasPI, hasPL });

      const pendingDocumentTypes = MANDATORY_DOCUMENT_TYPES.filter((d) => {
        if (d.type === 'COMMERCIAL_INVOICE') return !hasCI;
        if (d.type === 'PROFORMA_INVOICE') return !hasPI;
        if (d.type === 'PACKING_LIST') return !hasPL;
        return false;
      }).map((d) => d.label);

      const documentsCount = 1 + (contract.signedContract?.s3Key ? 1 : 0) + ciList.length + piList.length + plList.length;

      return {
        contractId: contract._id,
        contractNumber: contract.contractNumber,
        buyer: buyerValue,
        seller: sellerValue,
        commodity: commodityValue,
        country: countryValue,
        status: businessStatus,
        documentType: 'SHIPMENT',
        documentTypes: [
          'CONTRACT',
          ...(hasCI ? ['COMMERCIAL_INVOICE'] : []),
          ...(hasPI ? ['PROFORMA_INVOICE'] : []),
          ...(hasPL ? ['PACKING_LIST'] : []),
        ],
        documentsCount,
        pendingDocumentTypes,
        progress,
        signedContractStatus: contract.signedContract?.s3Key || contract.contractMode === 'UPLOAD' ? 'UPLOADED' : 'PENDING',
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        sortPriority: STATUS_PRIORITY[businessStatus] ?? 0,
        searchText: [
          contract.contractNumber, buyerValue, sellerValue, commodityValue,
          ...ciList.map((c) => c.commercialInvoiceNumber),
          ...piList.map((p) => p.proformaInvoiceNumber),
          ...plList.map((p) => p.packingListNumber),
        ].filter(Boolean).join(' '),
      };
    });

    const { items, pagination } = filterSortPaginate(shipments, {
      filters: { status, documentType, dateFrom, dateTo, country, commodity, buyer, seller, search },
      sort, page, limit,
    });

    return res.status(200).json({ success: true, data: { shipments: items, pagination } });
  } catch (err) {
    return next(err);
  }
}

export async function listDomesticDocuments(req, res, next) {
  try {
    const userId = req.user._id;
    const { status, documentType, dateFrom, dateTo, search, sort, page, limit } = req.query;

    const [pos, cns, dns] = await Promise.all([
      PurchaseOrder.find({ user: userId }).lean(),
      CreditNote.find({ user: userId }).lean(),
      DebitNote.find({ user: userId }).lean(),
    ]);

    const documents = [
      ...pos.map((d) => mapDomesticDocument(
        d, 'PURCHASE_ORDER', 'purchaseOrderNumber',
        d.buyerDetails?.buyerName || d.buyerDetails?.buyerCompany || '',
        d.buyerDetails?.buyerCountry || d.shipToDetails?.country || ''
      )),
      ...cns.map((d) => mapDomesticDocument(
        d, 'CREDIT_NOTE', 'creditNoteNumber',
        d.customerInfo?.customerName || d.customerInfo?.customerCompany || '', ''
      )),
      ...dns.map((d) => mapDomesticDocument(
        d, 'DEBIT_NOTE', 'debitNoteNumber',
        d.supplierInfo?.supplierName || d.supplierInfo?.supplierCompany || '', ''
      )),
    ];

    const { items, pagination } = filterSortPaginate(documents, {
      filters: { status, documentType, dateFrom, dateTo, search },
      sort, page, limit,
    });

    return res.status(200).json({ success: true, data: { documents: items, pagination } });
  } catch (err) {
    return next(err);
  }
}

function mapContractRow({ contract, hasCI, hasPI, hasPL, businessStatus, buyerValue, sellerValue, commodityValue, countryValue }, organizationName) {
  return {
    documentType: 'CONTRACT',
    id: contract._id,
    number: contract.contractNumber,
    status: businessStatus,
    organization: organizationName,
    buyer: buyerValue,
    seller: sellerValue,
    commodity: commodityValue,
    country: countryValue,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    sortPriority: STATUS_PRIORITY[businessStatus] ?? 0,
    searchText: [contract.contractNumber, buyerValue, sellerValue, commodityValue, DOCUMENT_TYPE_SEARCH_TOKENS.CONTRACT].filter(Boolean).join(' '),
  };
}

function mapLinkedDocumentRow(doc, type, numberField, contract, sellerValue, organizationName) {
  const buyerValue = doc.buyerDetails?.companyName || '';
  const commodityValue = doc.goodsItems?.[0]?.commodity || doc.commercialDetails?.[0]?.commodity || '';
  const countryValue = doc.buyerDetails?.country || '';
  const status = doc.status === 'GENERATED' ? 'GENERATED' : 'DRAFT';

  return {
    documentType: type,
    id: doc._id,
    number: doc[numberField],
    status,
    organization: organizationName,
    buyer: buyerValue,
    seller: sellerValue,
    commodity: commodityValue,
    country: countryValue,
    contractId: contract._id,
    contractNumber: contract.contractNumber,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    sortPriority: doc.status === 'DRAFT' ? 0 : 1,
    searchText: [doc[numberField], buyerValue, commodityValue, contract.contractNumber, DOCUMENT_TYPE_SEARCH_TOKENS[type]].filter(Boolean).join(' '),
  };
}

function mapDomesticRow(doc, organizationName) {
  return {
    documentType: doc.documentType,
    id: doc.id,
    number: doc.number,
    status: doc.status,
    organization: organizationName,
    buyer: doc.counterpartyName,
    seller: '',
    commodity: '',
    country: doc.country,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    sortPriority: doc.sortPriority,
    searchText: doc.searchText,
  };
}

export async function listUnifiedHistory(req, res, next) {
  try {
    const userId = req.user._id;
    const { status, documentType, dateFrom, dateTo, country, commodity, buyer, seller, search, sort, page, limit } = req.query;

    const [organization, contracts, cis, pis, pls, pos, cns, dns] = await Promise.all([
      Organization.findOne({ user: userId }).select('organizationName').lean(),
      Contract.find({ user: userId }).lean(),
      CommercialInvoice.find({ user: userId }).lean(),
      ProformaInvoice.find({ user: userId }).lean(),
      PackingList.find({ user: userId }).lean(),
      PurchaseOrder.find({ user: userId }).lean(),
      CreditNote.find({ user: userId }).lean(),
      DebitNote.find({ user: userId }).lean(),
    ]);
    const organizationName = organization?.organizationName || '';

    const groups = groupDocumentsByContract(contracts, cis, pis, pls);

    const items = [];
    for (const group of groups) {
      items.push(mapContractRow(group, organizationName));
      for (const ci of group.ciList) items.push(mapLinkedDocumentRow(ci, 'COMMERCIAL_INVOICE', 'commercialInvoiceNumber', group.contract, group.sellerValue, organizationName));
      for (const pi of group.piList) items.push(mapLinkedDocumentRow(pi, 'PROFORMA_INVOICE', 'proformaInvoiceNumber', group.contract, group.sellerValue, organizationName));
      for (const pl of group.plList) items.push(mapLinkedDocumentRow(pl, 'PACKING_LIST', 'packingListNumber', group.contract, group.sellerValue, organizationName));
    }

    const domesticItems = [
      ...pos.map((d) => mapDomesticDocument(
        d, 'PURCHASE_ORDER', 'purchaseOrderNumber',
        d.buyerDetails?.buyerName || d.buyerDetails?.buyerCompany || '',
        d.buyerDetails?.buyerCountry || d.shipToDetails?.country || ''
      )),
      ...cns.map((d) => mapDomesticDocument(
        d, 'CREDIT_NOTE', 'creditNoteNumber',
        d.customerInfo?.customerName || d.customerInfo?.customerCompany || '', ''
      )),
      ...dns.map((d) => mapDomesticDocument(
        d, 'DEBIT_NOTE', 'debitNoteNumber',
        d.supplierInfo?.supplierName || d.supplierInfo?.supplierCompany || '', ''
      )),
    ].map((d) => mapDomesticRow(d, organizationName));

    const allItems = items.concat(domesticItems);

    const { items: pageItems, pagination } = filterSortPaginate(allItems, {
      filters: { status, documentType, dateFrom, dateTo, country, commodity, buyer, seller, search },
      sort, page, limit,
    });

    return res.status(200).json({ success: true, data: { documents: pageItems, pagination } });
  } catch (err) {
    return next(err);
  }
}
