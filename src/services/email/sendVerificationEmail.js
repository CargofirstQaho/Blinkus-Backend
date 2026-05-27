import { transporter } from './transporter.js';
import { verificationTemplate } from './templates/verificationTemplate.js';

export async function sendVerificationEmail(email, otp) {
  await transporter.sendMail({
    from:    `"Blinkus" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Verify your Blinkus account — your code is inside',
    html:    verificationTemplate(otp),
  });
}
