import PaymentAudit from '../models/PaymentAudit.js';

export async function logPaymentEvent({ eventType, userId, paymentId, payload, ipAddress, userAgent }) {
  return PaymentAudit.create({
    eventType,
    userId:    userId    ?? null,
    paymentId: paymentId ?? null,
    payload:   payload   ?? {},
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

export async function getAuditsByPayment(paymentId) {
  return PaymentAudit.find({ paymentId }).sort({ createdAt: -1 });
}

export async function getAuditsByUser(userId) {
  return PaymentAudit.find({ userId }).sort({ createdAt: -1 });
}
