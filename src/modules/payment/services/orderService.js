import { razorpay } from '../config/razorpay.js';
import { PAYMENT_EVENT_TYPES, RAZORPAY_CONFIG } from '../../../config/paymentConfig.js';
import { getPlanById } from '../config/plans.js';
import { logPaymentError, logRazorpayEvent } from '../utils/paymentLogger.js';
import { createPendingSubscription, getValidActiveSubscription } from './subscriptionService.js';
import { createPaymentRecord } from './paymentService.js';
import { logPaymentEvent } from './auditService.js';
import { calculateBillingSummary } from './billingSummaryService.js';
import { errorHandler } from '../../../utils/errorHandler.js';

export async function createOrder({ userId, planType, billingAddressId, ipAddress, userAgent }) {
  const plan = getPlanById(planType);
  if (!plan || plan.amount === 0) {
    throw errorHandler(400, 'Invalid or unsupported plan selected');
  }

  const activeSubscription = await getValidActiveSubscription(userId);
  if (activeSubscription) {
    try {
      await logPaymentEvent({
        eventType: PAYMENT_EVENT_TYPES.ACTIVE_SUBSCRIPTION_BLOCKED,
        userId,
        paymentId: null,
        payload:   { subscriptionId: activeSubscription._id, planName: activeSubscription.planName, requestedPlan: planType },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
    } catch (auditErr) {
      logPaymentError('AUDIT_LOG_FAILED', auditErr, { userId: userId.toString() });
    }
    const err = errorHandler(409, 'You already have an active subscription.');
    err.errorCode = 'ACTIVE_SUBSCRIPTION_EXISTS';
    throw err;
  }

  if (!razorpay) {
    throw errorHandler(503, 'Payment service is currently unavailable');
  }

  const pricing = await calculateBillingSummary({ planType, billingAddressId, userId });

  const amountInSmallestUnit = Math.round(pricing.totalAmount * 100);

  const receipt = `r_${Date.now().toString(36)}_${userId.toString().slice(-6)}`.slice(0, 40);
 
  let rzpOrder;
  try {
    rzpOrder = await razorpay.orders.create({
      amount:   amountInSmallestUnit,
      currency: pricing.currency,
      receipt,
      notes: {
        planName: planType,
        userId:   userId.toString(),
      },
    });
  } catch (rzpErr) {
    logPaymentError('RAZORPAY_ORDER_CREATE_FAILED', rzpErr, { userId: userId.toString(), planType });
    throw errorHandler(502, 'Failed to initiate payment order. Please try again.');
  }

  const subscription = await createPendingSubscription({
    userId,
    planName:     planType,
    billingCycle: planType,
  });

  const payment = await createPaymentRecord({
    userId,
    subscriptionId:  subscription._id,
    planName:        planType,
    currency:        pricing.currency,
    exchangeRate:    pricing.exchangeRate,
    planAmount:      pricing.planAmount,
    gstRate:         pricing.gstRate,
    gstAmount:       pricing.gstAmount,
    totalAmount:     pricing.totalAmount,
    inrAmount:       pricing.totalAmount,
    razorpayOrderId: rzpOrder.id,
  });

  try {
    await logPaymentEvent({
      eventType:  PAYMENT_EVENT_TYPES.PAYMENT_ORDER_CREATED,
      userId,
      paymentId:  payment._id,
      payload: {
        planName:             planType,
        currency:             pricing.currency,
        planAmount:           pricing.planAmount,
        gstAmount:            pricing.gstAmount,
        totalAmount:          pricing.totalAmount,
        exchangeRate:         pricing.exchangeRate,
        amountInSmallestUnit,
        razorpayOrderId:      rzpOrder.id,
      },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
  } catch (auditErr) {
    logPaymentError('AUDIT_LOG_FAILED', auditErr, { userId: userId.toString() });
  }

  logRazorpayEvent('ORDER_CREATED', {
    orderId:             rzpOrder.id,
    planName:            planType,
    currency:            pricing.currency,
    amountInSmallestUnit,
    userId:              userId.toString(),
  });

  return {
    success:             true,
    orderId:             rzpOrder.id,
    planType,
    currency:            pricing.currency,
    planAmount:          pricing.planAmount,
    gstRate:             pricing.gstRate,
    gstAmount:           pricing.gstAmount,
    totalAmount:         pricing.totalAmount,
    exchangeRate:        pricing.exchangeRate,
    amountInSmallestUnit,
    razorpayKeyId:       RAZORPAY_CONFIG.keyId,
  };
}
