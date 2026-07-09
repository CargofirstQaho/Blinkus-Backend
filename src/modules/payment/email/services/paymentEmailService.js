import { buildEmailParams, buildRawMime } from '../utils/buildEmailParams.js';
import { paymentEmailTemplate }           from '../templates/paymentEmailTemplate.js';
import { sendViaSes, sendRawViaSes }      from './sesEmailService.js';


export async function sendPaymentEmail({ to, subject, greeting, title, body }) {
  const html   = paymentEmailTemplate({ greeting, title, body });
  const params = buildEmailParams({ to, subject, html });
  await sendViaSes(params);
}

export async function sendInvoiceEmail({ to, subject, greeting, title, body, pdfBuffer, pdfFilename }) {
  const html = paymentEmailTemplate({ greeting, title, body });
  const raw  = buildRawMime({
    from:        process.env.AWS_SES_FROM_ADDRESS,
    to,
    subject,
    html,
    attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
  });
  return sendRawViaSes(raw);
}



