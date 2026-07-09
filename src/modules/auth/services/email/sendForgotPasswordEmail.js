import { transporter } from './transporter.js';
import { forgotPasswordTemplate } from './templates/forgotPasswordTemplate.js';

export async function sendForgotPasswordEmail(email, otp) {
  await transporter.sendMail({
    from:    `"Blinkus" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Reset your Blinkus password — your code is inside',
    html:    forgotPasswordTemplate(otp),
  });
}
