import PaymentRecord from '../models/Payment.js';
import { PAYMENT_STATUSES, REFUND_STATUSES } from '../../../config/paymentConfig.js';
import { getPlanPrice } from '../utils/planUtils.js';

export async function createPaymentRecord({ userId, subscriptionId, planName, currency = 'USD', exchangeRate = 1, planAmount = 0, gstRate = 0, gstAmount = 0, totalAmount = 0, inrAmount = 0, razorpayOrderId = null }) {
  const amount = getPlanPrice(planName);
  return PaymentRecord.create({
    userId,
    subscriptionId,
    planName,
    amount,
    currency,
    exchangeRate,
    planAmount,
    gstRate,
    gstAmount,
    totalAmount,
    inrAmount,
    razorpayOrderId,
    status: PAYMENT_STATUSES.CREATED,
  });
}

export async function attachRazorpayOrder(paymentId, razorpayOrderId) {
  return PaymentRecord.findByIdAndUpdate(
    paymentId,
    { razorpayOrderId },
    { new: true }
  );
}

export async function capturePayment(paymentId, { razorpayPaymentId, razorpaySignature, paymentMethod } = {}) {
  return PaymentRecord.findByIdAndUpdate(
    paymentId,
    {
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod: paymentMethod ?? null,
      status:        PAYMENT_STATUSES.CAPTURED,
      paymentDate:   new Date(),
    },
    { new: true }
  );
}

export async function markPaymentFailed(paymentId) {
  return PaymentRecord.findByIdAndUpdate(
    paymentId,
    { status: PAYMENT_STATUSES.FAILED },
    { new: true }
  );
}

export async function initiateRefund(paymentId, refundAmount) {
  return PaymentRecord.findByIdAndUpdate(
    paymentId,
    { refundStatus: REFUND_STATUSES.INITIATED, refundAmount },
    { new: true }
  );
}

export async function processRefund(paymentId) {
  return PaymentRecord.findByIdAndUpdate(
    paymentId,
    { refundStatus: REFUND_STATUSES.PROCESSED, status: PAYMENT_STATUSES.REFUNDED },
    { new: true }
  );
}

export async function failRefund(paymentId) {
  return PaymentRecord.findByIdAndUpdate(
    paymentId,
    { refundStatus: REFUND_STATUSES.FAILED },
    { new: true }
  );
}

export async function getPaymentById(paymentId) {
  return PaymentRecord.findById(paymentId);
}

export async function getPaymentByRazorpayOrderId(razorpayOrderId) {
  return PaymentRecord.findOne({ razorpayOrderId });
}

export async function getPaymentsByUser(userId) {
  return PaymentRecord.find({ userId }).sort({ createdAt: -1 });
}

export async function getPaymentHistoryPaginated(userId, skip, limit) {
  const [payments, total] = await Promise.all([
    PaymentRecord.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentRecord.countDocuments({ userId }),
  ]);
  return { payments, total };
}
