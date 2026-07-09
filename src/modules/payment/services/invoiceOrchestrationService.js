import User           from '../../auth/models/User.js';
import BillingAddress from '../models/BillingAddress.js';
import { buildSubscriptionInvoicePdf, sendInvoiceEmail, sendPaymentNotification } from '../email/index.js';
import { uploadFile }  from '../../../services/storage/s3UploadService.js';
import { logPaymentEvent, logPaymentError } from '../utils/paymentLogger.js';
import { getPlanById } from '../config/plans.js';
import { createInvoiceRecord, markCustomerEmailSent, markInternalNotificationSent, markInvoiceProcessing, markInvoiceCompleted, markInvoiceFailed } from './invoicePersistenceService.js';

function buildEmailBody({ invoiceData, currencySymbol, plan }) {
  const { subscription, payment, totals } = invoiceData;
  const planName      = plan?.displayName ?? subscription.planName;
  const startDateStr  = new Date(subscription.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const expiryDateStr = new Date(subscription.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const gstRow        = totals.gstRate > 0
    ? `<tr><td style="padding:10px 16px;color:#666666;font-size:14px;border-top:1px solid #e8e8e8;">GST (${Math.round(totals.gstRate * 100)}%)</td><td style="padding:10px 16px;color:#0a0a0a;font-size:14px;text-align:right;border-top:1px solid #e8e8e8;">${currencySymbol} ${totals.gstAmount.toFixed(2)}</td></tr>`
    : '';

  return `
    <p>Your <strong>${planName}</strong> subscription has been successfully activated.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8f8f8;">
        <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Detail</td>
        <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Value</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#666666;font-size:14px;border-top:1px solid #e8e8e8;">Plan</td>
        <td style="padding:10px 16px;color:#0a0a0a;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e8e8e8;">${planName}</td>
      </tr>
      <tr style="background:#f8f8f8;">
        <td style="padding:10px 16px;color:#666666;font-size:14px;">Valid From</td>
        <td style="padding:10px 16px;color:#0a0a0a;font-size:14px;font-weight:600;text-align:right;">${startDateStr}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#666666;font-size:14px;">Valid Until</td>
        <td style="padding:10px 16px;color:#0a0a0a;font-size:14px;font-weight:600;text-align:right;">${expiryDateStr}</td>
      </tr>
      <tr style="background:#f8f8f8;">
        <td style="padding:10px 16px;color:#666666;font-size:14px;">Payment ID</td>
        <td style="padding:10px 16px;color:#0a0a0a;font-size:14px;font-weight:600;text-align:right;">${payment.paymentId}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#666666;font-size:14px;border-top:1px solid #e8e8e8;">Plan Amount</td>
        <td style="padding:10px 16px;color:#0a0a0a;font-size:14px;text-align:right;border-top:1px solid #e8e8e8;">${currencySymbol} ${totals.planAmount.toFixed(2)}</td>
      </tr>
      ${gstRow}
      <tr style="background:#eff6ff;">
        <td style="padding:12px 16px;color:#1d4ed8;font-size:15px;font-weight:700;border-top:1px solid #bfdbfe;">Total Paid</td>
        <td style="padding:12px 16px;color:#1d4ed8;font-size:15px;font-weight:700;text-align:right;border-top:1px solid #bfdbfe;">${currencySymbol} ${totals.totalAmount.toFixed(2)}</td>
      </tr>
    </table>
    <p style="margin:0;color:#666666;font-size:14px;">Your invoice is attached to this email. For any billing queries, contact <a href="mailto:orbit@blinkus.ai" style="color:#2563eb;">orbit@blinkus.ai</a>.</p>
  `.trim();
}

async function buildInvoiceData(userId, payment, paymentId, activatedSubscription, paymentMethod) {
  const [user, billingAddress] = await Promise.all([
    User.findById(userId).select('name email mobile company').lean(),
    BillingAddress.findOne({ userId, isDefault: true }).lean(),
  ]);

  const plan = getPlanById(activatedSubscription.planName);

  return {
    invoiceNumber: paymentId,
    invoiceDate:   activatedSubscription.startDate,
    customer: {
      name:    user?.name    ?? '',
      email:   user?.email   ?? '',
      company: user?.company ?? '',
      phone:   user?.mobile  ?? '',
    },
    billing: {
      addressLine1: billingAddress?.addressLine1 ?? '',
      addressLine2: billingAddress?.addressLine2 ?? '',
      city:         billingAddress?.city         ?? '',
      state:        billingAddress?.state        ?? '',
      country:      billingAddress?.country      ?? '',
      postalCode:   billingAddress?.postalCode   ?? '',
    },
    subscription: {
      planName:     activatedSubscription.planName,
      displayName:  plan?.displayName ?? activatedSubscription.planName,
      billingCycle: activatedSubscription.billingCycle,
      startDate:    activatedSubscription.startDate,
      expiryDate:   activatedSubscription.expiryDate,
    },
    payment: {
      paymentId: paymentId,
      orderId:   payment.razorpayOrderId,
      method:    paymentMethod,
      currency:  payment.currency,
    },
    totals: {
      planAmount:  payment.planAmount,
      gstRate:     payment.gstRate,
      gstAmount:   payment.gstAmount,
      totalAmount: payment.totalAmount,
    },
  };
}

export async function runInvoiceFlow(userId, payment, paymentId, activatedSubscription, paymentMethod) {
  const uid    = userId.toString();
  const pidStr = String(paymentId ?? '');
  const s3Key       = `subscriptions/invoices/${uid}/${pidStr}.pdf`;
  const pdfFilename = `blinkus-invoice-${pidStr}.pdf`;

  let savedInvoice = null;
  let currentStep  = 'DATA_COLLECTION';

  try {
    logPaymentEvent('INVOICE_FLOW_STARTED', { userId: uid, paymentId: pidStr });

    const invoiceData = await buildInvoiceData(userId, payment, paymentId, activatedSubscription, paymentMethod);
    logPaymentEvent('INVOICE_DATA_COLLECTED', { userId: uid, paymentId: pidStr });

    try {
      savedInvoice = await createInvoiceRecord({
        invoiceData,
        userId,
        paymentRecordId: payment._id,
        subscriptionId:  activatedSubscription._id,
        s3Key,
        pdfFilename,
      });
      logPaymentEvent('INVOICE_PERSISTED', { userId: uid, paymentId: pidStr, invoiceId: savedInvoice._id.toString() });
    } catch (persistErr) {
      logPaymentError('INVOICE_PERSIST_FAILED', persistErr, { userId: uid, paymentId: pidStr });
    }

    if (savedInvoice) {
      try {
        await markInvoiceProcessing(savedInvoice._id);
      } catch (statusErr) {
        logPaymentError('INVOICE_STATUS_UPDATE_FAILED', statusErr, { userId: uid, paymentId: pidStr, targetStatus: 'PROCESSING' });
      }
    }

    currentStep = 'PDF_GENERATION';
    const pdfBuffer = await buildSubscriptionInvoicePdf(invoiceData);
    logPaymentEvent('INVOICE_GENERATED', { userId: uid, paymentId: pidStr });

    currentStep = 'S3_UPLOAD';
    await uploadFile({ buffer: pdfBuffer, mimetype: 'application/pdf', key: s3Key });
    logPaymentEvent('INVOICE_UPLOADED', { userId: uid, paymentId: pidStr, s3Key });

    const currencySymbol = payment.currency === 'INR' ? '₹' : '$';
    const plan           = getPlanById(activatedSubscription.planName);

    currentStep = 'CUSTOMER_EMAIL';
    const customerEmailResult = await sendInvoiceEmail({
      to:          invoiceData.customer.email,
      subject:     `Your Blinkus Subscription is Active — Invoice ${pidStr}`,
      greeting:    `Hi ${invoiceData.customer.name || 'there'},`,
      title:       'Subscription Activated',
      body:        buildEmailBody({ invoiceData, currencySymbol, plan }),
      pdfBuffer,
      pdfFilename,
    });
    logPaymentEvent('INVOICE_EMAIL_SENT', { userId: uid, paymentId: pidStr });

    if (savedInvoice) {
      try {
        await markCustomerEmailSent(savedInvoice._id, { sesMessageId: customerEmailResult?.MessageId ?? null });
      } catch (updateErr) {
        logPaymentError('INVOICE_EMAIL_STATUS_UPDATE_FAILED', updateErr, { userId: uid, paymentId: pidStr });
      }
    }

    logPaymentEvent('INVOICE_FLOW_COMPLETED', { userId: uid, paymentId: pidStr });

    currentStep = 'INTERNAL_NOTIFICATION';
    try {
      logPaymentEvent('PAYMENT_NOTIFICATION_STARTED', { userId: uid, paymentId: pidStr });
      const notifResult = await sendPaymentNotification({ invoiceData, s3Key, userId: uid });
      logPaymentEvent('PAYMENT_NOTIFICATION_SENT', { userId: uid, paymentId: pidStr });

      if (savedInvoice) {
        try {
          await markInternalNotificationSent(savedInvoice._id, { sesMessageId: notifResult?.MessageId ?? null });
        } catch (updateErr) {
          logPaymentError('INVOICE_NOTIF_STATUS_UPDATE_FAILED', updateErr, { userId: uid, paymentId: pidStr });
        }
      }

      if (savedInvoice) {
        try {
          await markInvoiceCompleted(savedInvoice._id);
        } catch (statusErr) {
          logPaymentError('INVOICE_STATUS_UPDATE_FAILED', statusErr, { userId: uid, paymentId: pidStr, targetStatus: 'COMPLETED' });
        }
      }
    } catch (notifErr) {
      logPaymentError('PAYMENT_NOTIFICATION_FAILED', notifErr, { userId: uid, paymentId: pidStr });
      if (savedInvoice) {
        try {
          await markInvoiceFailed(savedInvoice._id, { step: currentStep, reason: notifErr?.message || String(notifErr) });
        } catch (statusErr) {
          logPaymentError('INVOICE_STATUS_UPDATE_FAILED', statusErr, { userId: uid, paymentId: pidStr, targetStatus: 'FAILED' });
        }
      }
    }
  } catch (err) {
    logPaymentError('INVOICE_FLOW_FAILED', err, { userId: uid, paymentId: pidStr });
    if (savedInvoice) {
      try {
        await markInvoiceFailed(savedInvoice._id, { step: currentStep, reason: err?.message || String(err) });
      } catch (statusErr) {
        logPaymentError('INVOICE_STATUS_UPDATE_FAILED', statusErr, { userId: uid, paymentId: pidStr, targetStatus: 'FAILED' });
      }
    }
  }
}
