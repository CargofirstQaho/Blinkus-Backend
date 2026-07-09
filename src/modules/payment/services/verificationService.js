import crypto from 'crypto';
import mongoose from 'mongoose';
import PaymentRecord from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import PaymentAudit from '../models/PaymentAudit.js';
import User from '../../auth/models/User.js';
import { razorpay } from '../config/razorpay.js';
import {
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  PAYMENT_EVENT_TYPES,
  RAZORPAY_CONFIG,
} from '../../../config/paymentConfig.js';
import { calculateExpiryDate, planNameToTradeType } from '../utils/planUtils.js';
import { logPaymentError, logRazorpayEvent } from '../utils/paymentLogger.js';
import { getValidActiveSubscription } from './subscriptionService.js';
import { runInvoiceFlow }            from './invoiceOrchestrationService.js';
import { errorHandler } from '../../../utils/errorHandler.js';

function isSignatureValid(orderId, paymentId, signature) {
  const secret = RAZORPAY_CONFIG.keySecret;
  if (!secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expected.length !== signature.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

async function fetchRazorpayPaymentDetails(razorpayPaymentId) {
  if (!razorpay) return null;
  try {
    return await razorpay.payments.fetch(razorpayPaymentId);
  } catch (err) {
    logPaymentError('RAZORPAY_PAYMENT_FETCH_FAILED', err, { razorpayPaymentId });
    return null;
  }
}

async function writeAudit(data, session = null) {
  try {
    const doc = new PaymentAudit(data);
    await doc.save(session ? { session } : undefined);
  } catch (err) {
    logPaymentError('AUDIT_LOG_FAILED', err, { eventType: data.eventType });
  }
}

export async function verifyPayment({ userId, orderId, paymentId, signature, ipAddress, userAgent }) {
  const payment = await PaymentRecord.findOne({ razorpayOrderId: orderId }).select('+razorpaySignature');

  if (!payment) {
    throw errorHandler(404, 'Payment order not found');
  }

  if (payment.userId.toString() !== userId.toString()) {
    throw errorHandler(403, 'Access denied to this payment order');
  }

  if (payment.status === PAYMENT_STATUSES.CAPTURED) {
    const existingSubscription = await Subscription.findById(payment.subscriptionId);

    logRazorpayEvent('PAYMENT_VERIFY_IDEMPOTENT_REPLAY', {
      orderId,
      paymentId,
      userId: userId.toString(),
    });

    return {
      success:        true,
      paymentId:      payment._id,
      subscriptionId: existingSubscription?._id ?? payment.subscriptionId,
      planName:       payment.planName,
      status:         PAYMENT_STATUSES.CAPTURED,
      startDate:      existingSubscription?.startDate  ?? null,
      expiryDate:     existingSubscription?.expiryDate ?? null,
    };
  }

  if (payment.status === PAYMENT_STATUSES.FAILED) {
    throw errorHandler(409, 'This payment order has failed and cannot be verified');
  }

  const existingActiveSub = await getValidActiveSubscription(userId);
  if (existingActiveSub) {
    throw errorHandler(409, 'An active subscription already exists for this account');
  }

  await writeAudit({
    eventType:  PAYMENT_EVENT_TYPES.PAYMENT_VERIFICATION_STARTED,
    userId,
    paymentId:  payment._id,
    payload:    { razorpayOrderId: orderId, razorpayPaymentId: paymentId },
    ipAddress:  ipAddress ?? null,
    userAgent:  userAgent ?? null,
  });

  const signatureValid = isSignatureValid(orderId, paymentId, signature);

  if (!signatureValid) {
    try {
      await PaymentRecord.findByIdAndUpdate(payment._id, { status: PAYMENT_STATUSES.FAILED });
    } catch (dbErr) {
      logPaymentError('PAYMENT_FAILED_UPDATE_ERROR', dbErr, { paymentId: payment._id.toString() });
    }

    await writeAudit({
      eventType: PAYMENT_EVENT_TYPES.PAYMENT_VERIFICATION_FAILED,
      userId,
      paymentId: payment._id,
      payload:   { reason: 'Signature mismatch', razorpayOrderId: orderId },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    throw errorHandler(400, 'Payment verification failed: invalid signature');
  }

  const rzpDetails = await fetchRazorpayPaymentDetails(paymentId);

  if (rzpDetails) {
    const validStates = ['captured', 'authorized'];
    if (!validStates.includes(rzpDetails.status)) {
      await writeAudit({
        eventType: PAYMENT_EVENT_TYPES.PAYMENT_VERIFICATION_FAILED,
        userId,
        paymentId: payment._id,
        payload:   { reason: `Invalid Razorpay payment status: ${rzpDetails.status}` },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw errorHandler(400, `Payment cannot be verified: status is ${rzpDetails.status}`);
    }

    if (payment.inrAmount > 0) {
      const expectedPaise = Math.round(payment.inrAmount * 100);
      if (Math.abs(rzpDetails.amount - expectedPaise) > 1) {
        await writeAudit({
          eventType: PAYMENT_EVENT_TYPES.PAYMENT_VERIFICATION_FAILED,
          userId,
          paymentId: payment._id,
          payload:   { reason: 'Amount mismatch', expected: expectedPaise, received: rzpDetails.amount },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        });
        throw errorHandler(400, 'Payment amount mismatch');
      }
    }

    if (rzpDetails.currency !== payment.currency) {
      await writeAudit({
        eventType: PAYMENT_EVENT_TYPES.PAYMENT_VERIFICATION_FAILED,
        userId,
        paymentId: payment._id,
        payload:   { reason: 'Currency mismatch', expected: payment.currency, received: rzpDetails.currency },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw errorHandler(400, 'Payment currency mismatch');
    }
  }

  const session = await mongoose.startSession();
  let activatedSubscription;

  try {
    session.startTransaction();

    const now        = new Date();
    const expiryDate = calculateExpiryDate(now, payment.planName);

    await PaymentRecord.findByIdAndUpdate(
      payment._id,
      {
        status:            PAYMENT_STATUSES.CAPTURED,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        paymentMethod:     rzpDetails?.method ?? null,
        paymentDate:       now,
        metadata:          rzpDetails ? { status: rzpDetails.status, method: rzpDetails.method, bank: rzpDetails.bank ?? null, wallet: rzpDetails.wallet ?? null } : {},
      },
      { session }
    );

    activatedSubscription = await Subscription.findByIdAndUpdate(
      payment.subscriptionId,
      {
        status:    SUBSCRIPTION_STATUSES.ACTIVE,
        startDate: now,
        expiryDate,
        autoRenew: false,
      },
      { new: true, session }
    );

    if (!activatedSubscription) {
      throw new Error('Subscription record not found during activation');
    }

    const successAudit = new PaymentAudit({
      eventType:  PAYMENT_EVENT_TYPES.PAYMENT_VERIFICATION_SUCCESS,
      userId,
      paymentId:  payment._id,
      payload: {
        razorpayOrderId:   orderId,
        razorpayPaymentId: paymentId,
        planName:          payment.planName,
      },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
    await successAudit.save({ session });

    const activationAudit = new PaymentAudit({
      eventType:  PAYMENT_EVENT_TYPES.SUBSCRIPTION_ACTIVATED,
      userId,
      paymentId:  payment._id,
      payload: {
        subscriptionId: activatedSubscription._id,
        planName:       payment.planName,
        startDate:      now,
        expiryDate,
      },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
    await activationAudit.save({ session });

    await session.commitTransaction();
  } catch (txErr) {
    await session.abortTransaction();
    logPaymentError('TRANSACTION_FAILED', txErr, {
      userId:    userId.toString(),
      paymentId: payment._id.toString(),
    });
    throw errorHandler(500, 'Payment verification failed due to an internal error. Please contact support.');
  } finally {
    await session.endSession();
  }

  logRazorpayEvent('PAYMENT_VERIFIED', {
    orderId,
    paymentId,
    planName: payment.planName,
    userId:   userId.toString(),
  });

  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        'subscription.trade': {
          planType:        planNameToTradeType(payment.planName),
          status:          'active',
          startDate:       activatedSubscription.startDate,
          endDate:         activatedSubscription.expiryDate,
          unlimitedAccess: true,
        },
      },
    });
  } catch (syncErr) {
    logPaymentError('USER_SUBSCRIPTION_SYNC_FAILED', syncErr, { userId: userId.toString() });
  }

  try {
    await runInvoiceFlow(userId, payment, paymentId, activatedSubscription, rzpDetails?.method ?? null);
  } catch (invoiceErr) {
    logPaymentError('INVOICE_FLOW_UNEXPECTED', invoiceErr, { userId: userId.toString() });
  }

  return {
    success:        true,
    paymentId:      payment._id,
    subscriptionId: activatedSubscription._id,
    planName:       payment.planName,
    status:         PAYMENT_STATUSES.CAPTURED,
    startDate:      activatedSubscription.startDate,
    expiryDate:     activatedSubscription.expiryDate,
  };
}
