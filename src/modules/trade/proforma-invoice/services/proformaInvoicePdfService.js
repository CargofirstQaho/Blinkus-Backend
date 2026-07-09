import PDFDocument from 'pdfkit';
import {
  MARGIN, CONTENT,
  fmt, fmtDate, fetchLogoBuffer,
  ensureSpace, sectionHeader, gridBlock, wrappedBox, textSection,
  drawDocumentHeader, drawTable, drawSummaryBox, renderFooter,
} from '../../shared/services/pdfKit.js';

const ITEM_COLS = [
  { key: 'commodity', label: 'COMMODITY', width: 130, align: 'left'   },
  { key: 'hsnCode',   label: 'HSN CODE',  width: 55,  align: 'center' },
  { key: 'quantity',  label: 'QTY',       width: 50,  align: 'right'  },
  { key: 'unit',      label: 'UNIT',      width: 45,  align: 'center' },
  { key: 'rate',      label: 'RATE',      width: 70,  align: 'right'  },
  { key: 'amount',    label: 'AMOUNT',    width: CONTENT - (130 + 55 + 50 + 45 + 70), align: 'right' },
];

function getItemCells(item) {
  return [
    item.commodity || '—',
    item.hsnCode    || '—',
    fmt(item.quantity),
    item.unit       || '—',
    fmt(item.rate),
    fmt(item.amount),
  ];
}

export async function buildProformaInvoicePdf(pi, organization, logoUrl) {
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

    const ii        = pi.invoiceInfo      || {};
    const exp       = pi.exporterDetails  || {};
    const buyer     = pi.buyerDetails     || {};
    const notify    = pi.notifyParty      || {};
    const consignee = pi.consignee        || {};
    const ship      = pi.shippingInfo     || {};
    const fin       = pi.financialInfo    || {};
    const bank      = pi.bankInfo         || {};
    const items     = pi.commercialDetails || [];
    const currency  = ii.currency || 'USD';

    const totalAmount = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

    const orgLines = [
      organization?.contact?.address,
      organization?.kyc?.gst?.number ? `GSTIN: ${organization.kyc.gst.number}` : null,
      organization?.contact?.phone   ? `Ph: ${organization.contact.phone}`     : null,
      organization?.organizationEmail,
    ].filter(Boolean);

    drawDocumentHeader(doc, {
      organization,
      logoBuf,
      title: 'PROFORMA INVOICE',
      orgLines,
      infoLines: [
        { label: 'PI Number',    value: pi.proformaInvoiceNumber },
        { label: 'Invoice Date', value: fmtDate(ii.invoiceDate) },
      ],
    });

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'PROFORMA INVOICE INFORMATION');
    gridBlock(doc, [
      [
        { l: 'PI Number',     v: pi.proformaInvoiceNumber },
        { l: 'Invoice Date',  v: fmtDate(ii.invoiceDate) },
        { l: 'Currency',      v: ii.currency },
      ],
      [
        { l: 'Contract Number', v: pi.contractNumber },
        { l: 'Status',          v: pi.status },
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
    sectionHeader(doc, 'SHIPPING INFORMATION');
    gridBlock(doc, [
      [
        { l: 'Port of Loading',   v: ship.portOfLoading },
        { l: 'Port of Discharge', v: ship.portOfDischarge },
      ],
      [
        { l: 'Final Destination', v: ship.finalDestination },
        { l: 'Country of Origin', v: ship.countryOfOrigin },
      ],
    ]);

    ensureSpace(doc, 24 + 18 + 22);
    sectionHeader(doc, 'COMMERCIAL DETAILS');
    drawTable(doc, { columns: ITEM_COLS, rows: items, getCells: getItemCells });
    doc.y += 10;

    ensureSpace(doc, 24 + 3 * 18 + 14);
    sectionHeader(doc, 'FINANCIAL INFORMATION');
    drawSummaryBox(doc, [
      { l: 'Total Amount', v: totalAmount },
      { l: `Advance (${fmt(fin.advancePercent)}%)`, v: fin.advanceAmount },
      { l: 'Balance Amount', v: fin.balanceAmount, highlight: true },
    ], currency);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'BANK INFORMATION');
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

    textSection(doc, 'NOTES', pi.notes);
    textSection(doc, 'TERMS & CONDITIONS', pi.termsAndConditions);

    renderFooter(doc);
    doc.flushPages();
    doc.end();
  });
}
