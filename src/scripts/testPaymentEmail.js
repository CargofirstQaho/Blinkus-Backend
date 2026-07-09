import 'dotenv/config';
import { sendTestPaymentEmail } from '../modules/payment/email/testEmail.js';

async function run() {
  if (!process.env.AWS_REGION)          throw new Error('AWS_REGION is not set');
  if (!process.env.AWS_ACCESS_KEY_ID)   throw new Error('AWS_ACCESS_KEY_ID is not set');
  if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error('AWS_SECRET_ACCESS_KEY is not set');
  if (!process.env.AWS_SES_FROM_ADDRESS)    throw new Error('AWS_SES_FROM_ADDRESS is not set');

  const recipient = process.argv[2] ?? 'iq@cargofirst.net';

  console.log(`[SES TEST] Sending to ${recipient} from ${process.env.AWS_SES_FROM_ADDRESS} via ${process.env.AWS_REGION}`);

  await sendTestPaymentEmail(recipient);
}

run().catch((err) => {
  console.error('[SES TEST] Failed:', err.message);
  process.exit(1);
});
