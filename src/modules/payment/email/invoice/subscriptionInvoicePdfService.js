import PDFDocument from 'pdfkit';
import {
  MARGIN, CONTENT,
  fmt, fmtDate, str,
  ensureSpace, sectionHeader, gridBlock,
  drawDocumentHeader, drawInfoBoxes, drawTable, drawSummaryBox,
  textSection, renderFooter,
} from '../../../../modules/trade/shared/services/pdfKit.js';
import {
  formatCurrencySymbol,
  formatGstRate,
  formatPaymentMethod,
} from '../utils/invoiceFormatter.js';

const BLINKUS_ORG = { organizationName: 'Blinkus AI' };
const BLINKUS_ORG_LINES = [
  'The Intelligence Engine for Global Trade',
  'orbit@blinkus.ai',
];


export function buildSubscriptionInvoicePdf(data) {
  const { invoiceNumber, invoiceDate, customer, billing, subscription, payment, totals } = data;

  const currSym = formatCurrencySymbol(payment.currency);

  const ITEM_COLS = [
    { key: '#',      label: '#',                   width: 24,                          align: 'center' },
    { key: 'desc',   label: 'DESCRIPTION',         width: 210,                         align: 'left'   },
    { key: 'period', label: 'PERIOD',              width: 170,                         align: 'left'   },
    { key: 'amount', label: `AMOUNT (${currSym})`, width: CONTENT - (24 + 210 + 170), align: 'right'  },
  ]; 

  const lineItem = {
    description: `Blinkus Trade Plan — ${subscription.displayName}`,
    period:      `${fmtDate(subscription.startDate)} – ${fmtDate(subscription.expiryDate)}`,
    amount:      totals.planAmount,
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:     'A4',
      margins:  { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawDocumentHeader(doc, {
      organization: BLINKUS_ORG,
      logoBuf:      null,
      title:        'TAX INVOICE',
      orgLines:     BLINKUS_ORG_LINES,
      infoLines:    [
        { label: 'Invoice No.',  value: str(invoiceNumber)    },
        { label: 'Invoice Date', value: fmtDate(invoiceDate)  },
      ],
    });

    drawInfoBoxes(doc, [
      {
        title:  'CUSTOMER DETAILS',
        fields: [
          { l: 'Name',    v: customer.name    },
          { l: 'Email',   v: customer.email   },
          { l: 'Company', v: customer.company },
          { l: 'Phone',   v: customer.phone   },
        ],
      },
      {
        title:  'BILLING ADDRESS',
        fields: [
          { l: 'Address',      v: [billing.addressLine1, billing.addressLine2].filter(Boolean).join(', ') },
          { l: 'City / State', v: [billing.city, billing.state].filter(Boolean).join(', ')               },
          { l: 'Country',      v: billing.country    },
          { l: 'Postal Code',  v: billing.postalCode },
        ],
      },
    ]);

    ensureSpace(doc, 24 + 2 * 22 + 10);
    sectionHeader(doc, 'SUBSCRIPTION DETAILS');
    gridBlock(doc, [
      [
        { l: 'Plan Name',     v: subscription.displayName  },
        { l: 'Start Date',    v: fmtDate(subscription.startDate)  },
        { l: 'Valid Until',   v: fmtDate(subscription.expiryDate) },
      ],
      [
        { l: 'Billing Cycle', v: subscription.billingCycle },
        { l: 'Currency',      v: payment.currency          },
        { l: 'Status',        v: 'Active'                  },
      ],
    ]);

    ensureSpace(doc, 24 + 22 + 10);
    sectionHeader(doc, 'PAYMENT DETAILS');
    gridBlock(doc, [
      [
        { l: 'Payment ID',     v: str(payment.paymentId)             },
        { l: 'Order ID',       v: str(payment.orderId)               },
        { l: 'Payment Method', v: formatPaymentMethod(payment.method) },
      ],
    ]);

    ensureSpace(doc, 24 + 40);
    sectionHeader(doc, 'SERVICES');
    drawTable(doc, {
      columns:  ITEM_COLS,
      rows:     [lineItem],
      getCells: (row, idx) => [
        String(idx + 1),
        row.description,
        row.period,
        fmt(row.amount),
      ],
    });

    doc.y += 10;

    const summaryRows = [
      { l: `Plan Amount (${payment.currency})`, v: totals.planAmount },
    ];
    if (totals.gstRate > 0) {
      summaryRows.push({
        l:    `GST (${formatGstRate(totals.gstRate)})`,
        v:    totals.gstAmount,
        bold: true,
      });
    }
    summaryRows.push({ l: 'Grand Total', v: totals.totalAmount, highlight: true });

    drawSummaryBox(doc, summaryRows, currSym);

    textSection(
      doc,
      'NOTE',
      'Thank you for choosing Blinkus. This is a system-generated invoice and does not require a physical signature. For any billing queries, please contact orbit@blinkus.ai.',
    );

    renderFooter(doc);
    doc.end();
  });
}
