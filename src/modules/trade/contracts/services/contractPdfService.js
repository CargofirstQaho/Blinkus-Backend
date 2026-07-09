import PDFDocument from 'pdfkit';
import {
  BRAND, DARK, MUTED, GRAY,
  MARGIN, CONTENT,
  fmt, fmtDate, fetchLogoBuffer,
  fillRect, strokeRect, hRule, ensureSpace,
  sectionHeader, gridBlock, drawInfoBoxes, textSection,
  drawDocumentHeader, renderFooter,
} from '../../shared/services/pdfKit.js';

// Single clause: title + content, kept together when they fit on one page.
function clauseSection(doc, number, title, content) {
  const text = (content || '').toString().trim();
  if (!text) return;

  const titleH = 14;

  doc.fontSize(8.5).font('Helvetica');
  const textH  = doc.heightOfString(text, { width: CONTENT - 12, lineGap: 2 });
  const blockH = titleH + textH + 10;

  ensureSpace(doc, blockH);

  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND)
    .text(`${number}. ${title}`, MARGIN, doc.y);
  doc.y += titleH;

  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(text, MARGIN + 12, doc.y, { width: CONTENT - 12, lineGap: 2 });
  doc.y += 10;
}

export async function buildContractPdf(contract, organization, logoUrl) {
  const logoBuf = await fetchLogoBuffer(logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
    });
    const chunks = [];
    doc.on('data',  c  => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const orgLines = [
      organization?.contact?.address,
      organization?.kyc?.gst?.number ? `GST: ${organization.kyc.gst.number}` : null,
      organization?.contact?.phone   ? `Ph: ${organization.contact.phone}`   : null,
      organization?.organizationEmail,
    ].filter(Boolean);

    drawDocumentHeader(doc, {
      organization,
      logoBuf,
      title: (contract.contractType || 'TRADE CONTRACT').toUpperCase(),
      orgLines,
      infoLines: [
        { label: 'Contract No', value: contract.contractNumber },
        { label: 'Date',        value: fmtDate(contract.contractDate) },
      ],
    });

    // ── Parties ─────────────────────────────────────────────────────────────
    const buyer  = contract.buyer  || {};
    const seller = contract.seller || {};

    const buyerFields = [
      { l: 'COMPANY',        v: buyer.companyName   },
      { l: 'ADDRESS',        v: buyer.address       },
      { l: 'COUNTRY',        v: buyer.country       },
      { l: 'CONTACT PERSON', v: buyer.contactPerson },
      { l: 'PHONE',          v: buyer.phone         },
      { l: 'EMAIL',          v: buyer.email         },
      { l: 'TAX / VAT NO.',  v: buyer.taxNumber     },
    ];

    const sellerFields = [
      { l: 'COMPANY',        v: seller.companyName   },
      { l: 'ADDRESS',        v: seller.address       },
      { l: 'COUNTRY',        v: seller.country       },
      { l: 'CONTACT PERSON', v: seller.contactPerson },
      { l: 'PHONE',          v: seller.phone         },
      { l: 'EMAIL',          v: seller.email         },
      { l: 'TAX / VAT NO.',  v: seller.taxNumber     },
    ];

    drawInfoBoxes(doc, [
      { title: 'BUYER DETAILS',  fields: buyerFields  },
      { title: 'SELLER DETAILS', fields: sellerFields },
    ]);

    // ── Commodity ────────────────────────────────────────────────────────────
    const com = contract.commodity || {};
    const comRow = [
      { l: 'Commodity',         v: com.commodity     },
      { l: 'HS Code',           v: com.hsCode        },
      { l: 'Country of Origin', v: com.originCountry },
    ].filter(c => c.v);

    ensureSpace(doc, 24 + 32 + 10);
    sectionHeader(doc, 'COMMODITY DETAILS');
    gridBlock(doc, [comRow.length ? comRow : [{ l: '—', v: '' }]]);

    // Quality Specification rendered as its own full-width dynamic section
    // so long content wraps cleanly instead of overflowing a table column.
    textSection(doc, 'QUALITY SPECIFICATION', com.qualitySpecification);

    // ── Shipment ─────────────────────────────────────────────────────────────
    const ship = contract.shipment || {};
    const shipRow1 = [
      { l: 'Incoterm',         v: ship.incoterm        },
      { l: 'Loading Port',     v: ship.loadingPort     },
      { l: 'Destination Port', v: ship.destinationPort },
      { l: 'Quantity',         v: ship.quantity != null ? `${ship.quantity} ${ship.unit}` : null },
    ].filter(c => c.v);

    const shipRow2 = [
      { l: 'Partial Shipment', v: ship.partialShipment },
      { l: 'Transshipment',    v: ship.transshipment   },
    ].filter(c => c.v);

    const shipRows = [shipRow1, shipRow2].filter(r => r.length);
    if (shipRows.length) {
      ensureSpace(doc, 24 + shipRows.length * 22 + 20);
      sectionHeader(doc, 'SHIPMENT TERMS');
      gridBlock(doc, shipRows);
    }

    // ── Price & Payment ───────────────────────────────────────────────────────
    const price = contract.price       || {};
    const pmt   = contract.paymentTerms || {};

    const priceRow1 = [
      { l: 'Currency',             v: price.currency           },
      { l: 'Unit Price',           v: price.unitPrice    != null ? `${price.currency} ${fmt(price.unitPrice)}` : null },
      { l: 'Total Contract Value', v: price.totalContractValue != null ? `${price.currency} ${fmt(price.totalContractValue)}` : null },
    ].filter(c => c.v);

    const priceRow2 = [
      { l: 'Advance %',      v: pmt.advancePercent != null ? `${pmt.advancePercent}%` : null },
      { l: 'Balance %',      v: pmt.balancePercent != null ? `${pmt.balancePercent}%` : null },
      { l: 'Payment Method', v: pmt.paymentMethod },
    ].filter(c => c.v);

    const priceRows = [priceRow1, priceRow2].filter(r => r.length);
    if (priceRows.length) {
      ensureSpace(doc, 24 + priceRows.length * 22 + 20);
      sectionHeader(doc, 'PRICE & PAYMENT TERMS');
      gridBlock(doc, priceRows);
    }

    // ── Packing, Inspection & Insurance ──────────────────────────────────────
    const pack = contract.packing    || {};
    const ins  = contract.inspection || {};
    const insu = contract.insurance  || {};

    const piRow = [
      { l: 'Packaging Type',           v: pack.packagingType   },
      { l: 'Bag Marking',              v: pack.bagMarking      },
      { l: 'Inspection Agency',        v: ins.inspectionAgency },
      { l: 'Insurance Responsibility', v: insu.responsibility  },
    ].filter(c => c.v);

    if (piRow.length) {
      ensureSpace(doc, 24 + 32 + 10);
      sectionHeader(doc, 'PACKING, INSPECTION & INSURANCE');
      gridBlock(doc, [piRow]);
    }

    // Inspection Requirement rendered as its own full-width dynamic section.
    textSection(doc, 'INSPECTION REQUIREMENT', ins.inspectionRequirement);

    // ── Clauses ───────────────────────────────────────────────────────────────
    const stdMap = [
      { key: 'forceMajeure',      label: 'Force Majeure'      },
      { key: 'arbitration',       label: 'Arbitration'        },
      { key: 'qualityClaims',     label: 'Quality Claims'     },
      { key: 'insurance',         label: 'Insurance'          },
      { key: 'inspection',        label: 'Inspection'         },
      { key: 'paymentDefault',    label: 'Payment Default'    },
      { key: 'disputeResolution', label: 'Dispute Resolution' },
    ];

    const stdClauses = contract.standardClauses || {};
    const clauseEntries = [];

    stdMap.forEach(({ key, label }) => {
      const sc = stdClauses[key];
      if (sc?.enabled && sc?.content) clauseEntries.push({ label, content: sc.content });
    });

    if (contract.forceMajeure) clauseEntries.push({ label: 'Force Majeure',  content: contract.forceMajeure });
    if (contract.arbitration)  clauseEntries.push({ label: 'Arbitration',    content: contract.arbitration  });
    if (contract.governingLaw) clauseEntries.push({ label: 'Governing Law',  content: contract.governingLaw });

    const customClauses = (contract.clauses || []).slice().sort((a, b) => a.order - b.order);
    customClauses.forEach(cl => {
      if (cl.title && cl.content) clauseEntries.push({ label: cl.title, content: cl.content });
    });

    // Reserve space for the section header together with the first clause so
    // the heading is never left stranded at the bottom of a page.
    const clausesHeaderH = 24;
    if (clauseEntries.length) {
      doc.fontSize(8.5).font('Helvetica');
      const firstTextH  = doc.heightOfString(clauseEntries[0].content, { width: CONTENT - 12, lineGap: 2 });
      const firstBlockH = 14 + firstTextH + 10;
      ensureSpace(doc, clausesHeaderH + firstBlockH);
    } else {
      ensureSpace(doc, clausesHeaderH);
    }
    sectionHeader(doc, 'CONTRACT CLAUSES');

    let clauseNum = 1;
    clauseEntries.forEach(({ label, content }) => {
      clauseSection(doc, clauseNum++, label, content);
    });

    // ── Signature Block ───────────────────────────────────────────────────────
    const sigW = (CONTENT - 20) / 2;
    ensureSpace(doc, 64 + 10);

    const drawSig = (x, y, partyName) => {
      fillRect(doc, x, y, sigW, 64, GRAY);
      strokeRect(doc, x, y, sigW, 64);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(BRAND)
        .text(`FOR ${partyName.toUpperCase()}`, x + 10, y + 8, { width: sigW - 20 });
      hRule(doc, y + 40);
      doc.fontSize(6.5).font('Helvetica').fillColor(MUTED)
        .text('Authorized Signatory', x + 10, y + 44, { width: sigW - 20 });
      doc.text('Date: ________________', x + 10, y + 54, { width: sigW - 20 });
    };

    const sigY = doc.y;
    drawSig(MARGIN,             sigY, contract.buyerName  || 'Buyer');
    drawSig(MARGIN + sigW + 20, sigY, contract.sellerName || 'Seller');
    doc.y = sigY + 64 + 10;

    renderFooter(doc);
    doc.flushPages();
    doc.end();
  });
}
