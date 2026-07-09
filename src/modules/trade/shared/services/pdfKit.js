export const BRAND  = '#2563eb';
export const BRAND2 = '#1d4ed8';
export const DARK   = '#0f172a';
export const MUTED  = '#64748b';
export const LIGHT  = '#eff6ff';
export const WHITE  = '#ffffff';
export const BORDER = '#bfdbfe';
export const GRAY   = '#f8fafc';

export const PAGE_W  = 595.28;
export const PAGE_H  = 841.89;
export const MARGIN  = 45;

export const FOOTER_RESERVE = 24;

export const CONTENT        = PAGE_W - MARGIN * 2;
export const CONTENT_BOTTOM = PAGE_H - MARGIN - FOOTER_RESERVE;
export const MAX_SECTION_H  = CONTENT_BOTTOM - MARGIN;

export const TITLE_SIZE = 14;

export function fmt(n) { return (parseFloat(n) || 0).toFixed(2); }

export function fmtNum(n) {
  const v = parseFloat(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function str(v) { return (v === undefined || v === null || v === '') ? '—' : v; }

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function fetchLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export function fillRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

export function strokeRect(doc, x, y, w, h, color = BORDER) {
  doc.save().rect(x, y, w, h).stroke(color).restore();
}

export function hRule(doc, y, color = BORDER, x1 = MARGIN, x2 = MARGIN + CONTENT) {
  doc.save().strokeColor(color).lineWidth(0.5)
    .moveTo(x1, y).lineTo(x2, y).stroke().restore();
}

// Move to a fresh page if `height` doesn't fit in the remaining space on the
// current page — but only when the whole block would actually fit on a
// fresh page. This implements "smart page breaks": a section either fits in
// the remaining space, or moves entirely to the next page. Sections taller
// than a full page are left to flow/paginate naturally.
export function ensureSpace(doc, height) {
  if (height <= MAX_SECTION_H && doc.y + height > CONTENT_BOTTOM) {
    doc.addPage();
  }
}

export function sectionHeader(doc, title) {
  const y = doc.y;
  fillRect(doc, MARGIN, y, CONTENT, 16, BRAND);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
    .text(title, MARGIN + 8, y + 4, { width: CONTENT - 16, lineBreak: false });
  doc.y = y + 16 + 8;
}

export function labelVal(doc, x, y, label, value, w = 120) {
  doc.fontSize(6.5).font('Helvetica').fillColor(MUTED)
    .text(String(label || '').toUpperCase(), x, y, { width: w, height: 9, ellipsis: true });
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(str(value), x, y + 9, { width: w, height: 11, ellipsis: true });
}

// Fixed-height grid of label/value cells. `rows` is an array of rows, each
// row an array of { l, v } cells spread evenly across the content width.
export function gridBlock(doc, rows) {
  const rowH = 22;
  const h = rows.length * rowH + 10;
  const y = doc.y;
  fillRect(doc, MARGIN, y, CONTENT, h, GRAY);
  strokeRect(doc, MARGIN, y, CONTENT, h);
  rows.forEach((row, ri) => {
    const w = CONTENT / row.length;
    row.forEach((c, ci) => {
      labelVal(doc, MARGIN + ci * w + 8, y + 6 + ri * rowH, c.l, c.v, w - 16);
    });
  });
  doc.y = y + h + 10;
}

// Full-width dynamic-height box for a single long free-text field. Renders
// a label + wrapped value, growing to fit the content with no clipping.
export function wrappedBox(doc, label, value) {
  const padX = 8;
  const padY = 6;
  const innerW = CONTENT - padX * 2;

  doc.fontSize(8.5).font('Helvetica');
  const textH = doc.heightOfString(str(value), { width: innerW, lineGap: 1 });
  const boxH  = textH + 17 + padY;

  ensureSpace(doc, boxH + 8);
  const y = doc.y;

  fillRect(doc, MARGIN, y, CONTENT, boxH, GRAY);
  strokeRect(doc, MARGIN, y, CONTENT, boxH);
  doc.fontSize(6.5).font('Helvetica').fillColor(MUTED)
    .text(String(label).toUpperCase(), MARGIN + padX, y + 6, { width: innerW });
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(str(value), MARGIN + padX, y + 17, { width: innerW, lineGap: 1 });

  doc.y = y + boxH + 10;
}

// Two side-by-side dynamic-height boxes (e.g. billing / shipping address).
export function addressBoxes(doc, leftLabel, leftValue, rightLabel, rightValue) {
  const colW = (CONTENT - 10) / 2;
  const innerW = colW - 16;

  doc.fontSize(8.5).font('Helvetica');
  const lH = doc.heightOfString(str(leftValue),  { width: innerW, lineGap: 1 });
  const rH = doc.heightOfString(str(rightValue), { width: innerW, lineGap: 1 });
  const boxH = Math.max(lH, rH, 11) + 28;

  ensureSpace(doc, boxH + 10);
  const y = doc.y;

  fillRect(doc, MARGIN, y, colW, boxH, GRAY);
  strokeRect(doc, MARGIN, y, colW, boxH);
  doc.fontSize(6.5).font('Helvetica').fillColor(MUTED)
    .text(String(leftLabel).toUpperCase(), MARGIN + 8, y + 6, { width: innerW });
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(str(leftValue), MARGIN + 8, y + 17, { width: innerW, lineGap: 1 });

  const x2 = MARGIN + colW + 10;
  fillRect(doc, x2, y, colW, boxH, GRAY);
  strokeRect(doc, x2, y, colW, boxH);
  doc.fontSize(6.5).font('Helvetica').fillColor(MUTED)
    .text(String(rightLabel).toUpperCase(), x2 + 8, y + 6, { width: innerW });
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(str(rightValue), x2 + 8, y + 17, { width: innerW, lineGap: 1 });

  doc.y = y + boxH + 14;
}

// One or two side-by-side info boxes with a title band and a dynamic-height
// list of label/value fields (e.g. buyer / ship-to party details). Each
// box grows to fit its tallest field's wrapped value, and both boxes share
// the height of the taller box so their borders line up.
export function drawInfoBoxes(doc, boxes) {
  const n     = boxes.length;
  const colW  = n === 2 ? (CONTENT - 10) / 2 : CONTENT;
  const padX  = 8;
  const innerW = colW - padX * 2;
  const titleH = 16;

  const computed = boxes.map((box) => {
    const fields = (box.fields || []).filter((f) => f.v);
    const heights = fields.map((f) => {
      doc.fontSize(8.5).font('Helvetica');
      const vH = doc.heightOfString(str(f.v), { width: innerW, lineGap: 1 });
      return Math.max(vH + 9, 18) + 3;
    });
    return { ...box, fields, heights, bodyH: heights.reduce((s, h) => s + h, 8) };
  });

  const maxBodyH = Math.max(...computed.map((b) => b.bodyH), 0);
  const totalH   = titleH + maxBodyH;

  ensureSpace(doc, totalH + 14);
  const y = doc.y;

  computed.forEach((box, bi) => {
    const x = bi === 0 ? MARGIN : MARGIN + colW + 10;

    fillRect(doc, x, y, colW, titleH, BRAND);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE)
      .text(box.title, x + padX, y + 4, { width: colW - padX * 2, lineBreak: false });

    fillRect(doc, x, y + titleH, colW, maxBodyH, GRAY);
    strokeRect(doc, x, y, colW, totalH);

    let fy = y + titleH + 6;
    box.fields.forEach((f, fi) => {
      doc.fontSize(6.5).font('Helvetica').fillColor(MUTED)
        .text(String(f.l).toUpperCase(), x + padX, fy, { width: innerW, lineBreak: false });
      doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
        .text(str(f.v), x + padX, fy + 9, { width: innerW, lineGap: 1 });
      fy += box.heights[fi];
    });
  });

  doc.y = y + totalH + 14;
}

// Full-width dynamic-height section for long free-text fields (terms,
// notes, declarations, etc.). Renders as its own full-width block with
// automatic wrapping, no clipping, and a smart page break that keeps the
// section header with its content.
export function textSection(doc, title, content) {
  const text = (content || '').toString().trim();
  if (!text) return;

  const padX = 10;
  const padY = 8;
  const innerW = CONTENT - padX * 2;

  doc.fontSize(8.5).font('Helvetica');
  const textH   = doc.heightOfString(text, { width: innerW, lineGap: 2 });
  const headerH = 16 + 8;
  const blockH  = headerH + textH + padY * 2 + 10;

  ensureSpace(doc, blockH);
  sectionHeader(doc, title);

  const boxY    = doc.y;
  const fitsBox = (textH + padY * 2) <= (MAX_SECTION_H - headerH);

  doc.fontSize(8.5).font('Helvetica').fillColor(DARK);

  if (fitsBox) {
    fillRect(doc, MARGIN, boxY, CONTENT, textH + padY * 2, GRAY);
    strokeRect(doc, MARGIN, boxY, CONTENT, textH + padY * 2);
    doc.text(text, MARGIN + padX, boxY + padY, { width: innerW, lineGap: 2 });
    doc.y = boxY + textH + padY * 2 + 10;
  } else {
    // Content too large for a single page — let it flow and paginate
    // naturally; pdfkit keeps doc.y correct across the page break.
    doc.text(text, MARGIN + padX, boxY + padY, { width: innerW, lineGap: 2 });
    doc.y += padY + 10;
  }
}

// Three-column document header: organization branding (left), document
// title centered (center), key reference fields right-aligned (right).
// Fixed-width columns mean the centered title never shifts or collides
// with the left/right content regardless of company name length, and the
// header height grows to fit the tallest column so nothing overlaps below.
//
// The logo is sized from its own real pixel dimensions (never a fixed box):
// it is fit, preserving aspect ratio, inside a "side-by-side" envelope next
// to the org name/address; if that would leave too little room for the text
// (a wide/landscape logo), the layout instead stacks the logo above the org
// text, using the full column width. Either way the header's own height
// grows to match, so nothing below it ever overlaps.
export function drawDocumentHeader(doc, { organization, logoBuf, title, orgLines = [], infoLines = [] }) {
  const leftW   = CONTENT * 0.34;
  const rightW  = CONTENT * 0.30;
  const centerW = CONTENT - leftW - rightW;

  const leftX   = MARGIN;
  const centerX = MARGIN + leftW;
  const rightX  = MARGIN + leftW + centerW;

  const padX = 10;
  const padY = 12;
  const logoGap = 8;

  const LOGO_MAX_H      = 70;
  const LOGO_SIDE_MAX_W = leftW * 0.42;
  const STACK_MAX_H     = 90;
  const stackMaxW       = leftW - padX * 2;

  let logoDims = null;
  if (logoBuf) {
    try {
      const img = doc.openImage(logoBuf);
      if (img?.width && img?.height) logoDims = { width: img.width, height: img.height };
    } catch (_) {
      logoDims = null;
    }
  }

  // A logo is only kept beside the text if, sized to a sensible header
  // height, it's also narrow enough not to crowd the org name/address out —
  // otherwise (wide/landscape logos) it moves above the text instead, using
  // the full column width. Narrow (tall/portrait) logos naturally pass the
  // width check and keep the full height budget, so they aren't compressed.
  let logoLayout = null;
  if (logoDims) {
    const naturalSideW = logoDims.width * (LOGO_MAX_H / logoDims.height);

    if (naturalSideW <= LOGO_SIDE_MAX_W) {
      logoLayout = { mode: 'side', w: naturalSideW, h: LOGO_MAX_H };
    } else {
      const stackScale = Math.min(stackMaxW / logoDims.width, STACK_MAX_H / logoDims.height);
      logoLayout = { mode: 'stack', w: logoDims.width * stackScale, h: logoDims.height * stackScale };
    }
  }

  const logoOffset = logoLayout?.mode === 'side' ? logoLayout.w + logoGap : 0;
  const leftTextX  = leftX + padX + logoOffset;
  const leftTextW  = leftW - padX * 2 - logoOffset;

  const orgName     = organization?.organizationName || 'Organization';
  const orgLinesTxt = orgLines.filter(Boolean).join('  |  ');

  doc.fontSize(12).font('Helvetica-Bold');
  const nameH = doc.heightOfString(orgName, { width: leftTextW });

  doc.fontSize(7).font('Helvetica');
  const orgInfoH = orgLinesTxt ? doc.heightOfString(orgLinesTxt, { width: leftTextW, lineGap: 1 }) : 0;

  const textBlockH = nameH + (orgInfoH ? orgInfoH + 4 : 0);

  let leftH;
  let textOffsetY;
  if (logoLayout?.mode === 'stack') {
    textOffsetY = logoLayout.h + logoGap;
    leftH       = textOffsetY + textBlockH;
  } else {
    textOffsetY = 0;
    leftH       = Math.max(textBlockH, logoLayout ? logoLayout.h : 0);
  }

  const rightLineH = 22;
  const rightH     = infoLines.length * rightLineH;

  doc.fontSize(TITLE_SIZE).font('Helvetica-Bold');
  const titleH = doc.heightOfString(title, { width: centerW - padX * 2, align: 'center' });

  const headerH = Math.max(leftH, rightH, titleH, 40) + padY * 2;

  ensureSpace(doc, headerH + 14);
  const y = doc.y;

  fillRect(doc, MARGIN, y, CONTENT, headerH, LIGHT);
  strokeRect(doc, MARGIN, y, CONTENT, headerH);
  doc.save().strokeColor(BORDER).lineWidth(0.5)
    .moveTo(centerX, y).lineTo(centerX, y + headerH)
    .moveTo(rightX,  y).lineTo(rightX,  y + headerH)
    .stroke().restore();

  if (logoBuf && logoLayout) {
    try {
      if (logoLayout.mode === 'stack') {
        const logoX = leftX + padX + (stackMaxW - logoLayout.w) / 2;
        doc.image(logoBuf, logoX, y + padY, { fit: [logoLayout.w, logoLayout.h], align: 'center', valign: 'top' });
      } else {
        doc.image(logoBuf, leftX + padX, y + padY, { fit: [logoLayout.w, logoLayout.h], align: 'left', valign: 'top' });
      }
    } catch (_) {}
  }

  const textY = y + padY + textOffsetY;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK)
    .text(orgName, leftTextX, textY, { width: leftTextW });
  if (orgLinesTxt) {
    doc.fontSize(7).font('Helvetica').fillColor(MUTED)
      .text(orgLinesTxt, leftTextX, textY + nameH + 4, { width: leftTextW, lineGap: 1 });
  }

  doc.fontSize(TITLE_SIZE).font('Helvetica-Bold').fillColor(BRAND)
    .text(title, centerX + padX, y + (headerH - titleH) / 2, { width: centerW - padX * 2, align: 'center' });

  let ry = y + padY;
  infoLines.forEach(({ label, value }) => {
    doc.fontSize(7).font('Helvetica').fillColor(MUTED)
      .text(String(label).toUpperCase(), rightX, ry, { width: rightW - padX, align: 'right', lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
      .text(str(value), rightX, ry + 10, { width: rightW - padX, align: 'right', lineBreak: false });
    ry += rightLineH;
  });

  doc.y = y + headerH + 14;
}

// Reusable table engine: header labels wrap onto multiple lines instead of
// being clipped, every row's height grows to fit its tallest cell, rows are
// border-safe with internal padding, and the table automatically breaks to
// a new page (repeating the header) when it runs out of room.
export function drawTable(doc, { columns, rows, getCells, headerColor = BRAND2, minRowH = 11 }) {
  const PAD_X = 4;
  const PAD_Y = 4;
  const HEADER_FONT = 7;
  const CELL_FONT   = 8;

  function drawHeader() {
    doc.fontSize(HEADER_FONT).font('Helvetica-Bold');
    let headerH = 0;
    columns.forEach((c) => {
      const h = doc.heightOfString(c.label, { width: c.width - PAD_X * 2, align: c.align, lineGap: 1 });
      if (h > headerH) headerH = h;
    });
    headerH += PAD_Y * 2;

    ensureSpace(doc, headerH + minRowH + PAD_Y * 2);

    const y = doc.y;
    fillRect(doc, MARGIN, y, CONTENT, headerH, headerColor);

    let x = MARGIN;
    columns.forEach((c) => {
      doc.fontSize(HEADER_FONT).font('Helvetica-Bold').fillColor(WHITE)
        .text(c.label, x + PAD_X, y + PAD_Y, { width: c.width - PAD_X * 2, align: c.align, lineGap: 1 });
      x += c.width;
    });

    doc.y = y + headerH;
  }

  drawHeader();

  rows.forEach((row, idx) => {
    const cells = getCells(row, idx);

    doc.fontSize(CELL_FONT).font('Helvetica');
    let rowH = 0;
    cells.forEach((cell, ci) => {
      const h = doc.heightOfString(String(cell), { width: columns[ci].width - PAD_X * 2, lineGap: 1 });
      if (h > rowH) rowH = h;
    });
    rowH = Math.max(rowH, minRowH) + PAD_Y * 2;

    if (doc.y + rowH > CONTENT_BOTTOM) {
      doc.addPage();
      drawHeader();
    }

    const y  = doc.y;
    const bg = idx % 2 === 0 ? WHITE : GRAY;
    fillRect(doc, MARGIN, y, CONTENT, rowH, bg);
    strokeRect(doc, MARGIN, y, CONTENT, rowH);

    let x = MARGIN;
    cells.forEach((cell, ci) => {
      doc.fontSize(CELL_FONT).font('Helvetica').fillColor(DARK)
        .text(String(cell), x + PAD_X, y + PAD_Y, { width: columns[ci].width - PAD_X * 2, align: columns[ci].align, lineGap: 1 });
      x += columns[ci].width;
    });

    doc.y = y + rowH;
  });

  return { drawHeader };
}

// Right-aligned summary box (Sub Total / Tax / Total / etc.) with dynamic
// row heights so long labels never clip or overlap their borders.
export function drawSummaryBox(doc, rows, currency) {
  const totalW   = 230;
  const totalX   = MARGIN + CONTENT - totalW;
  const labelW   = 120;
  const valueW   = totalW - 118;
  const padX     = 8;
  const padY     = 4;

  doc.fontSize(9);
  const computed = rows.map((r) => {
    const valueText = `${currency} ${fmt(r.v)}`;
    const fontSize  = r.highlight ? 9 : 8;
    doc.fontSize(fontSize);
    const h = Math.max(
      doc.heightOfString(r.l, { width: labelW - padX, lineGap: 1 }),
      doc.heightOfString(valueText, { width: valueW - padX, lineGap: 1 }),
      9
    ) + padY * 2;
    return { ...r, h, valueText };
  });

  const blockH = computed.reduce((s, r) => s + r.h, 0) + 10;
  ensureSpace(doc, blockH);

  let y = doc.y;
  computed.forEach((r) => {
    const bg     = r.highlight ? LIGHT : (r.bold ? GRAY : WHITE);
    const fontFn = r.highlight || r.bold ? 'Helvetica-Bold' : 'Helvetica';
    fillRect(doc, totalX, y, totalW, r.h, bg);
    strokeRect(doc, totalX, y, totalW, r.h);
    doc.fontSize(r.highlight ? 9 : 8).font(fontFn)
      .fillColor(r.highlight ? BRAND : (r.bold ? DARK : MUTED))
      .text(r.l, totalX + padX, y + padY, { width: labelW - padX, align: 'left', lineGap: 1 });
    doc.fontSize(r.highlight ? 9 : 8).font(fontFn)
      .fillColor(r.highlight ? BRAND : DARK)
      .text(r.valueText, totalX + 110, y + padY, { width: valueW, align: 'right', lineGap: 1 });
    y += r.h;
  });
  doc.y = y + 14;
}

// Footer rendered on every buffered page: page numbers (top-right),
// "Generated By Blinkus" (bottom-left) and a generation timestamp
// (bottom-center), with a hairline rule separating the footer band.
// Must be called before `doc.flushPages()`.
export function renderFooter(doc) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  for (let i = range.start; i < range.start + total; i++) {
    doc.switchToPage(i);

    doc.fontSize(8).font('Helvetica').fillColor(MUTED)
      .text(`Page ${i - range.start + 1} of ${total}`, MARGIN, 20, { width: CONTENT, align: 'right', lineBreak: false });

    hRule(doc, CONTENT_BOTTOM + 3, BORDER);

    doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
      .text('Generated by Blinkus.AI', MARGIN, CONTENT_BOTTOM + 8, { width: CONTENT / 3, lineBreak: false });

    doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
      .text(`Generated on ${timestamp}`, MARGIN, CONTENT_BOTTOM + 8, { width: CONTENT, align: 'center', lineBreak: false });
  }
}
