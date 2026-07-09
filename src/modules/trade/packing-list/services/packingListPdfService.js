import PDFDocument from 'pdfkit';
import {
  BRAND, LIGHT, MARGIN, CONTENT, CONTENT_BOTTOM,
  fmt, fmtNum, fmtDate, fetchLogoBuffer,
  fillRect, strokeRect, ensureSpace, sectionHeader, gridBlock, wrappedBox, textSection,
  drawDocumentHeader, drawTable, renderFooter,
} from '../../shared/services/pdfKit.js';

const ITEM_COLS = [
  { key: 'marks', label: 'MARKS & NOS',          width: 70,  align: 'left'   },
  { key: 'goods', label: 'DESCRIPTION OF GOODS', width: 125, align: 'left'   },
  { key: 'hsn',   label: 'HSN CODE',             width: 50,  align: 'center' },
  { key: 'pkgs',  label: 'NO. & TYPE OF PKGS',   width: 68,  align: 'center' },
  { key: 'net',   label: 'NET WT (KG)',          width: 60,  align: 'right'  },
  { key: 'gross', label: 'GROSS WT (KG)',        width: 60,  align: 'right'  },
  { key: 'qty',   label: 'QUANTITY',             width: CONTENT - (70 + 125 + 50 + 68 + 60 + 60), align: 'right' },
];

function getItemCells(item) {
  const goodsText = item.description
    ? `${item.commodity || '—'} — ${item.description}`
    : (item.commodity || '—');

  return [
    item.marksAndNumbers || '—',
    goodsText,
    item.hsnCode || '—',
    `${fmtNum(item.numberOfPackages)} ${item.packagingType || ''}`.trim(),
    fmt(item.netWeight),
    fmt(item.grossWeight),
    `${fmtNum(item.quantity)} ${item.unit || ''}`.trim(),
  ];
}

function drawTotalsRow(doc, totals, table) {
  const rowH = 20;

  if (doc.y + rowH > CONTENT_BOTTOM) {
    doc.addPage();
    table.drawHeader();
  }

  const y = doc.y;
  fillRect(doc, MARGIN, y, CONTENT, rowH, LIGHT);
  strokeRect(doc, MARGIN, y, CONTENT, rowH);

  const labelW = ITEM_COLS[0].width + ITEM_COLS[1].width + ITEM_COLS[2].width;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BRAND)
    .text('TOTAL', MARGIN + 8, y + 5, { width: labelW - 16, align: 'left', lineBreak: false });

  const cells = [
    fmtNum(totals.numberOfPackages),
    fmt(totals.netWeight),
    fmt(totals.grossWeight),
    fmtNum(totals.quantity),
  ];

  let x = MARGIN + labelW;
  [ITEM_COLS[3], ITEM_COLS[4], ITEM_COLS[5], ITEM_COLS[6]].forEach((c, ci) => {
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BRAND)
      .text(cells[ci], x + 4, y + 5, { width: c.width - 8, align: c.align, lineBreak: false });
    x += c.width;
  });

  doc.y = y + rowH + 10;
}

export async function buildPackingListPdf(pl, organization, logoUrl) {
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

    const pli   = pl.packingListInfo  || {};
    const exp   = pl.exporterDetails  || {};
    const buyer = pl.buyerDetails     || {};
    const consignee = pl.consignee    || {};
    const ship  = pl.shippingDetails  || {};
    const items = pl.packingItems     || [];

    const totals = items.reduce((acc, it) => ({
      numberOfPackages: acc.numberOfPackages + (parseFloat(it.numberOfPackages) || 0),
      netWeight:        acc.netWeight        + (parseFloat(it.netWeight)        || 0),
      grossWeight:      acc.grossWeight      + (parseFloat(it.grossWeight)      || 0),
      quantity:         acc.quantity         + (parseFloat(it.quantity)         || 0),
    }), { numberOfPackages: 0, netWeight: 0, grossWeight: 0, quantity: 0 });

    const orgLines = [
      organization?.contact?.address,
      organization?.kyc?.gst?.number ? `GSTIN: ${organization.kyc.gst.number}` : null,
      organization?.contact?.phone   ? `Ph: ${organization.contact.phone}`     : null,
      organization?.organizationEmail,
    ].filter(Boolean);

    drawDocumentHeader(doc, {
      organization,
      logoBuf,
      title: 'PACKING LIST',
      orgLines,
      infoLines: [
        { label: 'PL Number', value: pl.packingListNumber },
        { label: 'Date',      value: fmtDate(pli.date) },
      ],
    });

    ensureSpace(doc, 24 + 1 * 22 + 10);
    sectionHeader(doc, 'PACKING LIST INFORMATION');
    gridBlock(doc, [
      [
        { l: 'PL Number',       v: pl.packingListNumber },
        { l: 'Date',            v: fmtDate(pli.date) },
        { l: 'Contract Number', v: pl.contractNumber },
        { l: 'Status',          v: pl.status },
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
        { l: 'Port of Loading',   v: ship.portOfLoading },
        { l: 'Port of Discharge', v: ship.portOfDischarge },
        { l: 'Vessel',            v: ship.vessel },
      ],
      [
        { l: 'Container Number', v: ship.containerNumber },
        { l: 'Seal Number',      v: ship.sealNumber },
      ],
    ]);

    ensureSpace(doc, 24 + 18 + 22);
    sectionHeader(doc, 'PACKING & GOODS DETAILS');
    const table = drawTable(doc, { columns: ITEM_COLS, rows: items, getCells: getItemCells });
    drawTotalsRow(doc, totals, table);

    textSection(doc, 'REMARKS', pl.remarks);
    textSection(doc, 'TERMS & CONDITIONS', pl.termsAndConditions);

    renderFooter(doc);
    doc.flushPages();
    doc.end();
  });
}
