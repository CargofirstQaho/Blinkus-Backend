import { paymentEmailTemplate }    from '../templates/paymentEmailTemplate.js';
import { buildNotificationBody }  from '../templates/paymentNotificationTemplate.js';
import { buildEmailParams }       from '../utils/buildEmailParams.js';
import { sendViaSes }             from './sesEmailService.js';

const INTERNAL_RECIPIENT = 'orbit@blinkus.ai';

export async function sendPaymentNotification({ invoiceData, s3Key, userId }) {
  const customerName = invoiceData.customer.name || 'Unknown';
  const subject      = `New Subscription Purchased — ${customerName}`;
  const body         = buildNotificationBody({ invoiceData, s3Key, userId });
  const html         = paymentEmailTemplate({
    greeting: 'Internal Team,',
    title:    subject,
    body,
  });
  const params = buildEmailParams({ to: INTERNAL_RECIPIENT, subject, html });
  return sendViaSes(params);
}
