import PDFDocument from 'pdfkit';
import {
  MARGIN, CONTENT,
  fmt, fmtDate, fetchLogoBuffer,
  ensureSpace, sectionHeader, gridBlock, wrappedBox, textSection,
  drawDocumentHeader, drawTable, drawSummaryBox, renderFooter,
} from '../../shared/services/pdfKit.js';

const ITEM_COLS = [
  { key: 'itemName',    label: 'ITEM',        width: 70, align: 'left'   },
  { key: 'description', label: 'DESCRIPTION', width: 90, align: 'left'   },
  { key: 'hsnCode',     label: 'HSN',         width: 45, align: 'center' },
  { key: 'quantity',    label: 'QTY',         width: 32, align: 'right'  },
  { key: 'unit',        label: 'UNIT',        width: 35, align: 'center' },
  { key: 'rate',        label: 'RATE',        width: 56, align: 'right'  },
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
    fmt(item.rate),
    `${fmt(item.taxPercent)}%`,
    fmt(item.taxAmount),
    fmt(item.total),
  ];
}

export async function buildDebitNotePdf(dn, organization, logoUrl) {
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

    const dni     = dn.debitNoteInfo || {};
    const sup     = dn.supplierInfo  || {};
    const summary = dn.summary       || {};
    const items   = dn.lineItems     || [];
    const currency = dni.currency || 'INR';

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
      title: 'DEBIT NOTE',
      orgLines,
      infoLines: [
        { label: 'DN Number', value: dn.debitNoteNumber },
        { label: 'Date',      value: fmtDate(dni.debitNoteDate) },
      ],
    });

    ensureSpace(doc, 24 + 1 * 22 + 10);
    sectionHeader(doc, 'DEBIT NOTE INFORMATION');
    gridBlock(doc, [
      [
        { l: 'Debit Note Number',        v: dn.debitNoteNumber },
        { l: 'Reference Invoice Number', v: dni.referenceInvoiceNumber },
        { l: 'Reference Invoice Date',   v: fmtDate(dni.referenceInvoiceDate) },
        { l: 'Currency',                 v: dni.currency },
      ],
    ]);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'SUPPLIER INFORMATION');
    gridBlock(doc, [
      [
        { l: 'Supplier Name',    v: sup.supplierName },
        { l: 'Supplier Company', v: sup.supplierCompany },
        { l: 'GST Number',       v: sup.gstNumber },
      ],
      [
        { l: 'Email', v: sup.email },
        { l: 'Phone', v: sup.phone },
      ],
    ]);

    wrappedBox(doc, 'Address', sup.address);

    ensureSpace(doc, 24 + 18 + 22);
    sectionHeader(doc, 'ITEM DETAILS');
    drawTable(doc, { columns: ITEM_COLS, rows: items, getCells: getItemCells });
    doc.y += 10;

    drawSummaryBox(doc, [
      { l: 'Subtotal',    v: summary.subtotal },
      { l: 'CGST',        v: summary.cgst },
      { l: 'SGST',        v: summary.sgst },
      { l: 'IGST',        v: summary.igst },
      { l: 'Grand Total', v: summary.grandTotal, bold: true },
      { l: 'Balance Due', v: summary.balanceDue, highlight: true },
    ], currency);

    textSection(doc, 'REASON FOR DEBIT NOTE', dn.reasonForDebitNote);
    textSection(doc, 'NOTES', dn.notes);
    textSection(doc, 'TERMS & CONDITIONS', dn.termsAndConditions);

    renderFooter(doc);
    doc.flushPages();
    doc.end();
  });
}
