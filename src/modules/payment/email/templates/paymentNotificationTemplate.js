function r(label, value, alt = false) {
  const bg = alt ? 'background:#f8f8f8;' : '';
  const v  = (value !== null && value !== undefined && value !== '') ? value : '—';
  return `<tr style="${bg}"><td style="padding:8px 14px;color:#888888;font-size:12px;width:42%;border-top:1px solid #f0f0f0;">${label}</td><td style="padding:8px 14px;color:#0a0a0a;font-size:12px;font-weight:500;border-top:1px solid #f0f0f0;word-break:break-all;">${v}</td></tr>`;
}

function block(title, rows) {
  return `<p style="margin:20px 0 6px;font-size:10px;font-weight:700;color:#aaaaaa;text-transform:uppercase;letter-spacing:1px;">${title}</p><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">${rows}</table>`;
}

export function buildNotificationBody({ invoiceData, s3Key, userId }) {
  const { customer, subscription, payment, totals, billing, invoiceNumber, invoiceDate } = invoiceData;

  const fd = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const fm = (n) => typeof n === 'number' ? `${payment.currency === 'INR' ? '₹' : '$'} ${n.toFixed(2)}` : '—';

  const customerBlock = block('Customer Information', [
    r('Name',    customer.name,    false),
    r('Email',   customer.email,   true),
    r('Mobile',  customer.phone,   false),
    r('Company', customer.company, true),
  ].join(''));

  const subscriptionBlock = block('Subscription', [
    r('Plan',          subscription.displayName,          false),
    r('Billing Cycle', subscription.billingCycle,         true),
    r('Start Date',    fd(subscription.startDate),        false),
    r('Expiry Date',   fd(subscription.expiryDate),       true),
  ].join(''));

  const paymentBlock = block('Payment', [
    r('Razorpay Payment ID', payment.paymentId,                                   false),
    r('Razorpay Order ID',   payment.orderId,                                     true),
    r('Payment Method',      payment.method,                                       false),
    r('Currency',            payment.currency,                                     true),
    r('Plan Amount',         fm(totals.planAmount),                               false),
    r('GST',                 totals.gstRate > 0 ? fm(totals.gstAmount) : '—',    true),
    r('Total Paid',          fm(totals.totalAmount),                              false),
    r('Payment Time',        fd(invoiceDate),                                      true),
  ].join(''));

  const billingBlock = block('Billing Address', [
    r('Full Name',   customer.name,                                                                false),
    r('Company',     customer.company,                                                             true),
    r('Address',     [billing.addressLine1, billing.addressLine2].filter(Boolean).join(', '),      false),
    r('City',        billing.city,                                                                 true),
    r('State',       billing.state,                                                                false),
    r('Country',     billing.country,                                                              true),
    r('Postal Code', billing.postalCode,                                                           false),
  ].join(''));

  const systemBlock = block('System', [
    r('User ID',           userId,          false),
    r('Invoice Reference', invoiceNumber,   true),
    r('S3 Invoice Key',    s3Key,           false),
  ].join(''));

  return `<p style="margin:0 0 4px;font-size:13px;color:#444444;">A new subscription payment has been successfully completed.</p>${customerBlock}${subscriptionBlock}${paymentBlock}${billingBlock}${systemBlock}`;
}

