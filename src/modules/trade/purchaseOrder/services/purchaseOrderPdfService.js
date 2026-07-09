import PDFDocument from 'pdfkit';
import {
  MARGIN, CONTENT,
  fmt, fmtDate, fetchLogoBuffer,
  ensureSpace, sectionHeader, gridBlock, drawInfoBoxes, textSection,
  drawDocumentHeader, drawTable, drawSummaryBox, renderFooter,
} from '../../shared/services/pdfKit.js';

const BRAND = '#2563eb';

const ITEM_COLS = [
  { key: '#',           label: '#',          width: 24,  align: 'center' },
  { key: 'productName', label: 'PRODUCT',    width: 95,  align: 'left'   },
  { key: 'description', label: 'DESCRIPTION',width: 95,  align: 'left'   },
  { key: 'hsCode',      label: 'HS CODE',    width: 48,  align: 'center' },
  { key: 'quantity',    label: 'QTY',        width: 36,  align: 'right'  },
  { key: 'unit',        label: 'UNIT',       width: 36,  align: 'center' },
  { key: 'unitPrice',   label: 'UNIT PRICE', width: 58,  align: 'right'  },
  { key: 'taxPercent',  label: 'TAX %',      width: 34,  align: 'right'  },
  { key: 'taxAmount',   label: 'TAX AMT',    width: 52,  align: 'right'  },
  { key: 'total',       label: 'TOTAL',      width: CONTENT - (24 + 95 + 95 + 48 + 36 + 36 + 58 + 34 + 52), align: 'right' },
];

function currencySymbol(currency) {
  return currency === 'USD' ? '$' : '₹';
}

const PACKAGE_UNITS = ['BOX', 'BAG', 'ROLL', 'SET', 'PAIR'];

function getEffectiveQty(qty, unit, unitsPerPackage) {
  const q = parseFloat(qty) || 0;
  const upp = parseFloat(unitsPerPackage);
  if (PACKAGE_UNITS.includes(unit) && upp > 0) return q * upp;
  return q;
}

function getItemCells(item, idx) {
  const effQty    = getEffectiveQty(item.quantity, item.unit, item.unitsPerPackage);
  const base      = effQty * (parseFloat(item.unitPrice) || 0);
  const taxAmount = item.taxAmount ?? (base * ((parseFloat(item.taxPercent) || 0) / 100));
  const lineTotal = item.total ?? (base + taxAmount);
  let qtyLabel;
  if (PACKAGE_UNITS.includes(item.unit) && parseFloat(item.unitsPerPackage) > 0) {
    qtyLabel = `${fmt(item.quantity)} ${item.unit}\n(${effQty} PCS)`;
  } else {
    qtyLabel = fmt(item.quantity);
  }
  return [
    String(idx + 1),
    item.productName  || '—',
    item.description  || '—',
    item.hsCode       || '—',
    qtyLabel,
    item.unit         || '—',
    fmt(item.unitPrice),
    `${fmt(item.taxPercent)}%`,
    fmt(taxAmount),
    fmt(lineTotal),
  ];
}

export async function buildPurchaseOrderPdf(po, organization, logoUrl) {
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

    const od    = po.orderDetails  || {};
    const bd    = po.buyerDetails  || {};
    const st    = po.shipToDetails || {};
    const bank  = po.bankDetails   || {};
    const notes = po.notes         || {};
    const items   = po.items    || [];
    const summary = po.summary  || {};
    const currency    = od.currency || 'INR';
    const currSym     = currencySymbol(currency);

    const gstDisplay = organization?.gstNumber || organization?.kyc?.gst?.number;

    const orgLines = [
      organization?.contact?.address,
      [organization?.regionalInformation?.country, organization?.contact?.pinCode].filter(Boolean).join(', '),
      gstDisplay ? `GST: ${gstDisplay}` : null,
      organization?.contact?.phone   ? `Ph: ${organization.contact.phone}`   : null,
      organization?.organizationEmail,
    ].filter(Boolean);

    const infoLines = [
      { label: 'PO Number', value: po.purchaseOrderNumber },
      { label: 'PO Date',   value: fmtDate(od.poDate) },
    ];
    if (od.expectedDelivery) {
      infoLines.push({ label: 'Expected Delivery', value: fmtDate(od.expectedDelivery) });
    }
 
    drawDocumentHeader(doc, {
      organization,
      logoBuf,
      title: 'PURCHASE ORDER',
      orgLines,
      infoLines,
    });

    const buyerFields = [
      { l: 'COMPANY',     v: bd.buyerCompany },
      { l: 'CONTACT',     v: bd.buyerName    },
      { l: 'ADDRESS',     v: [bd.buyerAddress, bd.buyerCity, bd.buyerState, bd.buyerCountry].filter(Boolean).join(', ') },
      { l: 'POSTAL CODE', v: bd.buyerPostalCode },
      { l: 'GST',         v: bd.buyerGstNumber  },
      { l: 'EMAIL',       v: bd.buyerEmail      },
      { l: 'PHONE',       v: bd.buyerPhone      },
    ];

    const shipFields = [
      { l: 'COMPANY',     v: st.companyName   },
      { l: 'CONTACT',     v: st.contactPerson },
      { l: 'ADDRESS',     v: [st.address, st.city, st.state, st.country].filter(Boolean).join(', ') },
      { l: 'POSTAL CODE', v: st.postalCode    },
      { l: 'EMAIL',       v: st.email         },
      { l: 'PHONE',       v: st.phone         },
    ];

    drawInfoBoxes(doc, [
      { title: 'BILL TO / BUYER DETAILS', fields: buyerFields },
      { title: 'SHIP TO DETAILS',         fields: shipFields  },
    ]);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'ORDER DETAILS');
    gridBlock(doc, [
      [
        { l: 'Currency',      v: `${currSym} ${currency}` },
        { l: 'Payment Terms', v: od.paymentTerms          },
        { l: 'Incoterms',     v: od.incoterms             },
      ],
      [
        { l: 'Port of Loading',   v: od.portOfLoading   },
        { l: 'Port of Discharge', v: od.portOfDischarge },
        { l: 'Shipment Mode',     v: od.shipmentMode    },
      ],
    ]);

    ensureSpace(doc, 24 + 18 + 22);
    sectionHeader(doc, 'ITEMS');
    drawTable(doc, { columns: ITEM_COLS, rows: items, getCells: getItemCells });
    doc.y += 10;

    drawSummaryBox(doc, [
      { l: 'Subtotal',    v: summary.subtotal },
      { l: 'CGST',        v: summary.cgst },
      { l: 'SGST',        v: summary.sgst },
      { l: 'IGST',        v: summary.igst },
      { l: 'Grand Total', v: summary.grandTotal, highlight: true },
    ], currSym);

    const hasBankData = Object.values(bank).some((v) => v && String(v).trim());
    if (hasBankData) {
      ensureSpace(doc, 24 + 2 * 22 + 10);
      sectionHeader(doc, 'BANK DETAILS');
      gridBlock(doc, [
        [
          { l: 'Bank Name',      v: bank.bankName      },
          { l: 'Account Name',   v: bank.accountName   },
          { l: 'Account Number', v: bank.accountNumber },
        ],
        [
          { l: 'IFSC Code',  v: bank.ifsc   },
          { l: 'SWIFT Code', v: bank.swift  },
          { l: 'Branch',     v: bank.branch },
        ],
      ]);
    }

    textSection(doc, 'TERMS & CONDITIONS', notes.termsAndConditions);
    textSection(doc, 'ADDITIONAL NOTES', notes.additionalNotes);

    ensureSpace(doc, 24 + 22 + 10);
    sectionHeader(doc, 'AUTHORIZED SIGNATORY');
    gridBlock(doc, [
      [
        { l: 'Signatory',   v: notes.signatory            },
        { l: 'Designation', v: notes.signatoryDesignation },
      ],
    ]);

    renderFooter(doc);
    doc.end();
  });
}
