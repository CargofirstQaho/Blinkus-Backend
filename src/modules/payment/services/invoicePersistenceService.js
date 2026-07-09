import Invoice from '../models/Invoice.js';

const PLAN_TYPE_MAP = {
  MONTHLY:    'monthly',
  SIX_MONTHS: 'sixMonth',
  YEARLY:     'yearly',
};

export async function createInvoiceRecord({ invoiceData, userId, paymentRecordId, subscriptionId, s3Key, pdfFilename }) {
  const { customer, subscription, payment, totals, invoiceNumber, invoiceDate } = invoiceData;

  return Invoice.create({
    userId,
    paymentId:              paymentRecordId,
    subscriptionId,
    invoiceNumber,
    subscriptionType:       'trade',
    planType:               PLAN_TYPE_MAP[subscription.planName] ?? 'monthly',
    amount:                 totals.planAmount,
    currency:               payment.currency,
    issuedAt:               invoiceDate,
    status:                 'issued',

    customerName:           customer.name,
    customerEmail:          customer.email,
    companyName:            customer.company,
    phone:                  customer.phone,

    billingCycle:           subscription.billingCycle,
    subscriptionStartDate:  subscription.startDate,
    subscriptionExpiryDate: subscription.expiryDate,

    razorpayOrderId:        payment.orderId,
    paymentMethod:          payment.method ?? null,
    gstRate:                totals.gstRate,
    gstAmount:              totals.gstAmount,
    totalAmount:            totals.totalAmount,

    invoiceFilename:        pdfFilename,
    s3Key,
    s3Url:                  null,

    customerEmailSent:      false,
    internalNotificationSent: false,
  });
}

export async function markCustomerEmailSent(invoiceId, { sesMessageId }) {
  return Invoice.findByIdAndUpdate(invoiceId, {
    customerEmailSent:    true,
    customerEmailSentAt:  new Date(),
    customerSesMessageId: sesMessageId ?? null,
  });
}

export async function markInternalNotificationSent(invoiceId, { sesMessageId }) {
  return Invoice.findByIdAndUpdate(invoiceId, {
    internalNotificationSent:    true,
    internalNotificationSentAt:  new Date(),
    internalSesMessageId:        sesMessageId ?? null,
  });
}

export async function markInvoiceProcessing(invoiceId) {
  return Invoice.findByIdAndUpdate(invoiceId, {
    processingStatus: 'PROCESSING',
  });
}

export async function markInvoiceCompleted(invoiceId) {
  return Invoice.findByIdAndUpdate(invoiceId, {
    processingStatus: 'COMPLETED',
    completedAt:       new Date(),
  });
}

export async function markInvoiceFailed(invoiceId, { step, reason }) {
  return Invoice.findByIdAndUpdate(invoiceId, {
    processingStatus: 'FAILED',
    failedAt:          new Date(),
    failedStep:        step ?? null,
    failureReason:     reason ?? null,
  });
}
