import PDFDocument from 'pdfkit';
import {
  MARGIN, CONTENT,
  fmt, fmtDate, fetchLogoBuffer,
  ensureSpace, sectionHeader, gridBlock, wrappedBox, textSection,
  drawDocumentHeader, drawTable, drawSummaryBox, renderFooter,
} from '../../shared/services/pdfKit.js';

const ITEM_COLS = [
  { key: 'commodity',   label: 'COMMODITY',   width: 75,  align: 'left'   },
  { key: 'hsnCode',     label: 'HSN CODE',    width: 48,  align: 'center' },
  { key: 'description', label: 'DESCRIPTION', width: 120, align: 'left'   },
  { key: 'quantity',    label: 'QTY',         width: 40,  align: 'right'  },
  { key: 'unit',        label: 'UNIT',        width: 38,  align: 'center' },
  { key: 'unitPrice',   label: 'UNIT PRICE',  width: 60,  align: 'right'  },
  { key: 'amount',      label: 'AMOUNT',      width: CONTENT - (75 + 48 + 120 + 40 + 38 + 60), align: 'right' },
];

function getItemCells(item) {
  return [
    item.commodity    || '—',
    item.hsnCode      || '—',
    item.description  || '—',
    fmt(item.quantity),
    item.unit         || '—',
    fmt(item.unitPrice),
    fmt(item.amount),
  ];
}

export async function buildCommercialInvoicePdf(ci, organization, logoUrl) {
  const logoBuf = await fetchLogoBuffer(logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
    });
    const chunks = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ii        = ci.invoiceInfo     || {};
    const exp       = ci.exporterDetails || {};
    const buyer     = ci.buyerDetails    || {};
    const notify    = ci.notifyParty     || {};
    const consignee = ci.consignee       || {};
    const ship      = ci.shippingDetails || {};
    const fin       = ci.financial       || {};
    const bank      = ci.bankDetails     || {};
    const sig       = ci.signatory       || {};
    const items     = ci.goodsItems      || [];
    const currency  = fin.currency || 'USD';

    const orgLines = [
      organization?.contact?.address,
      organization?.kyc?.gst?.number ? `GSTIN: ${organization.kyc.gst.number}` : null,
      organization?.contact?.phone   ? `Ph: ${organization.contact.phone}`     : null,
      organization?.organizationEmail,
    ].filter(Boolean);

    drawDocumentHeader(doc, {
      organization,
      logoBuf,
      title: 'COMMERCIAL INVOICE',
      orgLines,
      infoLines: [
        { label: 'Invoice Number', value: ci.commercialInvoiceNumber },
        { label: 'Invoice Date',   value: fmtDate(ii.date) },
      ],
    });

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'COMMERCIAL INVOICE INFORMATION');
    gridBlock(doc, [
      [
        { l: 'Invoice Number', v: ci.commercialInvoiceNumber },
        { l: 'Invoice Date',   v: fmtDate(ii.date) },
        { l: 'Currency',       v: currency },
      ],
      [
        { l: 'Contract Number', v: ci.contractNumber },
        { l: 'Status',          v: ci.status },
      ],
    ]);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'EXPORTER DETAILS');
    gridBlock(doc, [
      [
        { l: 'Company Name', v: exp.companyName },
        { l: 'Country',      v: exp.country },
        { l: 'Tax Number',   v: exp.taxNumber },
      ],
      [
        { l: 'Email', v: exp.email },
        { l: 'Phone', v: exp.phone },
      ],
    ]);
    wrappedBox(doc, 'Address', exp.address);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'BUYER DETAILS');
    gridBlock(doc, [
      [
        { l: 'Company Name',   v: buyer.companyName },
        { l: 'Contact Person', v: buyer.contactPerson },
        { l: 'Country',        v: buyer.country },
      ],
      [
        { l: 'Email',      v: buyer.email },
        { l: 'Phone',      v: buyer.phone },
        { l: 'Tax Number', v: buyer.taxNumber },
      ],
    ]);
    wrappedBox(doc, 'Address', buyer.address);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'NOTIFY PARTY');
    gridBlock(doc, [
      [
        { l: 'Name',    v: notify.name },
        { l: 'Country', v: notify.country },
      ],
      [
        { l: 'Phone', v: notify.phone },
        { l: 'Email', v: notify.email },
      ],
    ]);
    wrappedBox(doc, 'Address', notify.address);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'CONSIGNEE');
    gridBlock(doc, [
      [
        { l: 'Name',    v: consignee.name },
        { l: 'Country', v: consignee.country },
      ],
      [
        { l: 'Phone', v: consignee.phone },
        { l: 'Email', v: consignee.email },
      ],
    ]);
    wrappedBox(doc, 'Address', consignee.address);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'SHIPPING DETAILS');
    gridBlock(doc, [
      [
        { l: 'Vessel',          v: ship.vessel },
        { l: 'BL Number',       v: ship.blNumber },
        { l: 'Port of Loading', v: ship.portOfLoading },
      ],
      [
        { l: 'Port of Discharge', v: ship.portOfDischarge },
        { l: 'Final Destination', v: ship.finalDestination },
      ],
    ]);

    ensureSpace(doc, 24 + 18 + 22);
    sectionHeader(doc, 'GOODS DETAILS');
    drawTable(doc, { columns: ITEM_COLS, rows: items, getCells: getItemCells });
    doc.y += 10;

    ensureSpace(doc, 24 + 5 * 18 + 14);
    sectionHeader(doc, 'FINANCIAL INFORMATION');
    drawSummaryBox(doc, [
      { l: 'Sub Total', v: fin.subTotal },
      { l: 'CGST',      v: fin.cgst },
      { l: 'SGST',      v: fin.sgst },
      { l: 'IGST',      v: fin.igst },
      { l: 'Freight',   v: fin.freight },
      { l: 'Insurance', v: fin.insurance },
      { l: 'Total',     v: fin.total, highlight: true },
    ], currency);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'BANK DETAILS');
    gridBlock(doc, [
      [
        { l: 'Bank Name',      v: bank.bankName },
        { l: 'Account Number', v: bank.accountNumber },
      ],
      [
        { l: 'IFSC',  v: bank.ifsc },
        { l: 'SWIFT', v: bank.swift },
      ],
    ]);

    textSection(doc, 'DECLARATION', ci.declaration);
    textSection(doc, 'TERMS & CONDITIONS', ci.termsAndConditions);

    ensureSpace(doc, 24 + 22 + 10);
    sectionHeader(doc, 'SIGNATURE');
    gridBlock(doc, [
      [
        { l: 'Authorized Signatory', v: sig.name },
        { l: 'Designation',          v: sig.designation },
      ],
    ]);

    renderFooter(doc);
    doc.flushPages();
    doc.end();
  });
}
