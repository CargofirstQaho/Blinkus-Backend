import { sendPaymentEmail } from './index.js';

export async function sendTestPaymentEmail(to = 'iq@cargofirst.net') {
  await sendPaymentEmail({
    to,
    subject:  'Blinkus — SES Payment Email Layer Test',
    greeting: 'Hi there,',
    title:    'SES Configuration Verified',
    body: `
      <p>This is a test email confirming that the Blinkus payment email infrastructure
      is correctly connected to AWS Simple Email Service.</p>
      <p>If you received this message, SES is configured and the payment module email
      layer is ready for Phase 2 integration.</p>
      <p style="margin-top:24px;padding:16px;background:#f8f8f8;border-radius:8px;font-size:13px;color:#666666;">
        Environment: <strong>${process.env.NODE_ENV ?? 'unknown'}</strong><br/>
        SES From: <strong>${process.env.AWS_SES_FROM_ADDRESS ?? 'NOT SET — check .env'}</strong><br/>
        Sent at: <strong>${new Date().toISOString()}</strong>
      </p>
    `,
  });

  console.log(`[SES TEST] Test email sent successfully to ${to}`);
}
