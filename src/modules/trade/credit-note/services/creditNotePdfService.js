import PDFDocument from 'pdfkit';
import {
  MARGIN, CONTENT,
  fmt, fmtDate, fetchLogoBuffer,
  ensureSpace, sectionHeader, gridBlock, addressBoxes, textSection,
  drawDocumentHeader, drawTable, drawSummaryBox, renderFooter,
} from '../../shared/services/pdfKit.js';

const ITEM_COLS = [
  { key: 'itemName',    label: 'ITEM',        width: 70, align: 'left'   },
  { key: 'description', label: 'DESCRIPTION', width: 90, align: 'left'   },
  { key: 'hsnCode',     label: 'HSN',         width: 45, align: 'center' },
  { key: 'quantity',    label: 'QTY',         width: 32, align: 'right'  },
  { key: 'unit',        label: 'UNIT',        width: 35, align: 'center' },
  { key: 'unitPrice',   label: 'UNIT PRICE',  width: 56, align: 'right'  },
  { key: 'taxPercent',  label: 'TAX %',       width: 35, align: 'right'  },
  { key: 'taxAmount',   label: 'TAX AMT',     width: 58, align: 'right'  },
  { key: 'total',       label: 'TOTAL',       width: CONTENT - (70 + 90 + 45 + 32 + 35 + 56 + 35 + 58), align: 'right' },
];

function getItemCells(item) {
  return [
    item.itemName    || '—',
    item.description || '—',
    item.hsnCode      || '—',
    fmt(item.quantity),
    item.unit         || '—',
    fmt(item.unitPrice),
    `${fmt(item.taxPercent)}%`,
    fmt(item.taxAmount),
    fmt(item.total),
  ];
}

export async function buildCreditNotePdf(cn, organization, logoUrl) {
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

    const ci      = cn.creditNoteInfo || {};
    const cust    = cn.customerInfo   || {};
    const summary = cn.summary        || {};
    const items   = cn.lineItems      || [];
    const currency = ci.currency || 'INR';

    const orgLines = [
      organization?.contact?.address,
      organization?.kyc?.gst?.number ? `GSTIN: ${organization.kyc.gst.number}` : null,
      organization?.kyc?.pan?.number ? `PAN: ${organization.kyc.pan.number}`   : null,
      organization?.contact?.phone   ? `Ph: ${organization.contact.phone}`     : null,
      organization?.organizationEmail,
    ].filter(Boolean);

    drawDocumentHeader(doc, {
      organization,
      logoBuf,
      title: 'CREDIT NOTE',
      orgLines,
      infoLines: [
        { label: 'CN Number', value: cn.creditNoteNumber },
        { label: 'Date',      value: fmtDate(ci.creditNoteDate) },
      ],
    });

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'CREDIT NOTE INFORMATION');
    gridBlock(doc, [
      [
        { l: 'Credit Note Number', v: cn.creditNoteNumber },
        { l: 'Credit Note Date',   v: fmtDate(ci.creditNoteDate) },
        { l: 'Currency',           v: ci.currency },
      ],
      [
        { l: 'Reference Invoice Number', v: ci.referenceInvoiceNumber },
        { l: 'Reference Invoice Date',   v: fmtDate(ci.referenceInvoiceDate) },
        { l: 'Place of Supply',          v: ci.placeOfSupply },
      ],
    ]);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'CUSTOMER INFORMATION');
    gridBlock(doc, [
      [
        { l: 'Customer Name',    v: cust.customerName },
        { l: 'Customer Company', v: cust.customerCompany },
        { l: 'GST Number',       v: cust.gstNumber },
      ],
      [
        { l: 'Email', v: cust.email },
        { l: 'Phone', v: cust.phone },
      ],
    ]);

    addressBoxes(doc, 'Billing Address', cust.billingAddress, 'Shipping Address', cust.shippingAddress);

    ensureSpace(doc, 24 + 18 + 22);
    sectionHeader(doc, 'ITEM DETAILS');
    drawTable(doc, { columns: ITEM_COLS, rows: items, getCells: getItemCells });
    doc.y += 10;

    drawSummaryBox(doc, [
      { l: 'Sub Total',     v: summary.subTotal },
      { l: 'CGST',          v: summary.cgst },
      { l: 'SGST',          v: summary.sgst },
      { l: 'IGST',          v: summary.igst },
      { l: 'Total',         v: summary.total,        bold: true },
      { l: 'Credit Amount', v: summary.creditAmount, highlight: true },
    ], currency);

    textSection(doc, 'REASON FOR CREDIT NOTE', cn.reasonForCreditNote);
    textSection(doc, 'NOTES', cn.notes);
    textSection(doc, 'TERMS & CONDITIONS', cn.termsAndConditions);

    renderFooter(doc);
    doc.flushPages();
    doc.end();
  });
}
