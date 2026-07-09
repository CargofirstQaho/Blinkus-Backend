import crypto from 'crypto';
import PaymentAudit from '../models/PaymentAudit.js';
import { RAZORPAY_CONFIG, PAYMENT_EVENT_TYPES } from '../../../config/paymentConfig.js';
import { logPaymentError, logRazorpayEvent } from '../utils/paymentLogger.js';
import {
  processWebhookEvent,
  extractEntityId,
  isSupportedEvent,
} from '../services/webhookService.js';

function verifyWebhookSignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (!signature || expected.length !== signature.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

export const webhookController = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody   = req.body;

  if (!RAZORPAY_CONFIG.webhookSecret) {
    logPaymentError('WEBHOOK_SECRET_MISSING', new Error('RAZORPAY_WEBHOOK_SECRET is not configured'));
    return res.status(500).json({ success: false, message: 'Webhook not configured' });
  }

  if (!verifyWebhookSignature(rawBody, signature, RAZORPAY_CONFIG.webhookSecret)) {
    logPaymentError('WEBHOOK_SIGNATURE_INVALID', new Error('Signature mismatch'), {
      hasSignature: !!signature,
    });
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  const eventType  = payload?.event;
  const receivedAt = new Date();

  try {
    await PaymentAudit.create({
      eventType: PAYMENT_EVENT_TYPES.WEBHOOK_RECEIVED,
      payload:   { event: eventType, account_id: payload.account_id ?? null },
    });
  } catch (auditErr) {
    logPaymentError('WEBHOOK_RECEIVED_AUDIT_FAILED', auditErr, { eventType });
  }

  if (!isSupportedEvent(eventType)) {
    logRazorpayEvent('WEBHOOK_IGNORED', { eventType });
    return res.status(200).json({ success: true, message: 'Event ignored' });
  }

  const entityId = extractEntityId(payload);

  if (!entityId) {
    logPaymentError('WEBHOOK_ENTITY_MISSING', new Error('Cannot extract entity ID'), { eventType });
    return res.status(200).json({ success: true, message: 'Event received' });
  }

  try {
    const result = await processWebhookEvent({ eventType, entityId, payload, receivedAt });
    return res.status(200).json({ success: true, processed: !result.skipped });
  } catch (err) {
    logPaymentError('WEBHOOK_HANDLER_ERROR', err, { eventType, entityId });
    return res.status(200).json({ success: true, message: 'Received' });
  }
};
