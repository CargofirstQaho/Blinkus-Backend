import { getSignedUrl } from '../../../../services/storage/s3SignedUrlService.js';
import { computeShipmentStatus } from './shipmentStatusEngine.js';

export async function attachPdfUrl(doc) {
  if (doc?.pdfKey) {
    doc.pdfUrl = await getSignedUrl(doc.pdfKey);
    delete doc.pdfKey;
  }
  return doc;
}

function groupByContract(list) {
  const map = new Map();
  for (const doc of list) {
    const key = String(doc.contract);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return map;
}

export function groupDocumentsByContract(contracts, cis, pis, pls) {
  const ciMap = groupByContract(cis);
  const piMap = groupByContract(pis);
  const plMap = groupByContract(pls);

  return contracts.map((contract) => {
    const key = String(contract._id);
    const ciList = ciMap.get(key) || [];
    const piList = piMap.get(key) || [];
    const plList = plMap.get(key) || [];
    const hasCI = ciList.length > 0;
    const hasPI = piList.length > 0;
    const hasPL = plList.length > 0;

    return {
      contract,
      ciList, piList, plList,
      hasCI, hasPI, hasPL,
      businessStatus: computeShipmentStatus(contract, { hasCI, hasPI, hasPL }),
      buyerValue: contract.buyerName || contract.buyer?.companyName || '',
      sellerValue: contract.sellerName || contract.seller?.companyName || '',
      commodityValue: contract.commodity?.commodity || ciList[0]?.goodsItems?.[0]?.commodity || piList[0]?.commercialDetails?.[0]?.commodity || '',
      countryValue: contract.buyer?.country || contract.commodity?.originCountry || '',
    };
  });
}

export const DOCUMENT_TYPE_SEARCH_TOKENS = {
  CONTRACT:           'Contract CTR Agreement',
  COMMERCIAL_INVOICE: 'Commercial Invoice CI',
  PROFORMA_INVOICE:   'Proforma Invoice PI',
  PACKING_LIST:       'Packing List PL',
  PURCHASE_ORDER:     'Purchase Order PO',
  CREDIT_NOTE:        'Credit Note CN',
  DEBIT_NOTE:         'Debit Note DN',
};

export function mapDomesticDocument(doc, type, numberField, counterpartyName, country) {
  return {
    documentType: type,
    id: doc._id,
    number: doc[numberField],
    status: doc.status,
    organization: doc.organization,
    counterpartyName,
    country,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    generatedAt: doc.generatedAt,
    sortPriority: doc.status === 'DRAFT' ? 0 : 1,
    searchText: [doc[numberField], counterpartyName, DOCUMENT_TYPE_SEARCH_TOKENS[type]].filter(Boolean).join(' '),
  };
}

const SORTERS = {
  newest:          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest:          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  recentlyUpdated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  pendingFirst:    (a, b) => (a.sortPriority ?? 0) - (b.sortPriority ?? 0),
  completedFirst:  (a, b) => (b.sortPriority ?? 0) - (a.sortPriority ?? 0),
};

export function filterSortPaginate(items, { filters = {}, sort = 'newest', page = 1, limit = 20 } = {}) {
  let result = items;

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    result = result.filter((i) => statuses.includes(i.status));
  }
  if (filters.documentType) {
    const types = Array.isArray(filters.documentType) ? filters.documentType : [filters.documentType];
    result = result.filter((i) => types.includes(i.documentType) || (i.documentTypes || []).some((t) => types.includes(t)));
  }
  if (filters.country) {
    const country = filters.country.toLowerCase();
    result = result.filter((i) => (i.country || '').toLowerCase() === country);
  }
  if (filters.commodity) {
    const commodity = filters.commodity.toLowerCase();
    result = result.filter((i) => (i.commodity || '').toLowerCase().includes(commodity));
  }
  if (filters.buyer) {
    const buyer = filters.buyer.toLowerCase();
    result = result.filter((i) => (i.buyer || '').toLowerCase().includes(buyer));
  }
  if (filters.seller) {
    const seller = filters.seller.toLowerCase();
    result = result.filter((i) => (i.seller || '').toLowerCase().includes(seller));
  }
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const to   = filters.dateTo ? new Date(filters.dateTo) : null;
    result = result.filter((i) => {
      const d = new Date(i.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }
  if (filters.search) {
    const q = filters.search.trim().replace(/\s+/g, ' ').toLowerCase();
    if (q) result = result.filter((i) => (i.searchText || '').toLowerCase().includes(q));
  }

  result = [...result].sort(SORTERS[sort] || SORTERS.newest);

  const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const total    = result.length;
  const totalPages = Math.max(Math.ceil(total / limitNum), 1);
  const start    = (pageNum - 1) * limitNum;

  return {
    items: result.slice(start, start + limitNum),
    pagination: { total, page: pageNum, limit: limitNum, totalPages },
  };
}
