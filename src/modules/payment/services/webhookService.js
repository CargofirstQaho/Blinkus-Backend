import mongoose from 'mongoose';
import PaymentRecord from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import PaymentAudit from '../models/PaymentAudit.js';
import WebhookEvent from '../models/WebhookEvent.js';
import User from '../../auth/models/User.js';
import {
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  PAYMENT_EVENT_TYPES,
  REFUND_STATUSES,
} from '../../../config/paymentConfig.js';
import { calculateExpiryDate, planNameToTradeType } from '../utils/planUtils.js';
import { logPaymentError, logRazorpayEvent } from '../utils/paymentLogger.js';
import { runInvoiceFlow } from './invoiceOrchestrationService.js';

const SUPPORTED_EVENTS = new Set([
  'payment.authorized',
  'payment.captured',
  'payment.failed',
  'refund.created',
  'refund.processed',
  'order.paid',
]);

export function isSupportedEvent(eventType) {
  return SUPPORTED_EVENTS.has(eventType);
}

export function extractEntityId(payload) {
  const event = payload?.event;
  if (!event) return null;

  if (event.startsWith('payment.')) return payload.payload?.payment?.entity?.id ?? null;
  if (event.startsWith('refund.'))  return payload.payload?.refund?.entity?.id  ?? null;
  if (event.startsWith('order.'))   return payload.payload?.order?.entity?.id   ?? null;
  return null;
}

async function writeAudit(data, session) {
  const doc = new PaymentAudit(data);
  return doc.save({ session });
}

async function handlePaymentAuthorized(payload, session) {
  const entity = payload.payload?.payment?.entity;
  if (!entity?.order_id) return;

  const payment = await PaymentRecord.findOne({ razorpayOrderId: entity.order_id }).session(session);
  if (!payment) return;

  if (
    payment.status === PAYMENT_STATUSES.AUTHORIZED ||
    payment.status === PAYMENT_STATUSES.CAPTURED
  ) return;

  await PaymentRecord.findByIdAndUpdate(
    payment._id,
    { status: PAYMENT_STATUSES.AUTHORIZED },
    { session }
  );

  await writeAudit({
    eventType: PAYMENT_EVENT_TYPES.PAYMENT_AUTHORIZED,
    userId:    payment.userId,
    paymentId: payment._id,
    payload:   { razorpayOrderId: entity.order_id, razorpayPaymentId: entity.id },
  }, session);
}

async function handlePaymentCaptured(payload, session) {
  const entity = payload.payload?.payment?.entity;
  if (!entity?.order_id) return { activated: false };

  const payment = await PaymentRecord.findOne({ razorpayOrderId: entity.order_id }).session(session);
  if (!payment) return { activated: false };

  if (payment.status !== PAYMENT_STATUSES.CAPTURED) {
    await PaymentRecord.findByIdAndUpdate(
      payment._id,
      {
        status:            PAYMENT_STATUSES.CAPTURED,
        razorpayPaymentId: entity.id,
        paymentMethod:     entity.method ?? null,
        paymentDate:       new Date(),
        metadata: {
          status: entity.status ?? null,
          method: entity.method ?? null,
          bank:   entity.bank   ?? null,
          wallet: entity.wallet ?? null,
        },
      },
      { session }
    );

    await writeAudit({
      eventType: PAYMENT_EVENT_TYPES.PAYMENT_CAPTURED,
      userId:    payment.userId,
      paymentId: payment._id,
      payload:   { razorpayOrderId: entity.order_id, razorpayPaymentId: entity.id },
    }, session);
  }

  const subscription = await Subscription.findById(payment.subscriptionId).session(session);
  if (subscription && subscription.status !== SUBSCRIPTION_STATUSES.ACTIVE) {
    const now        = new Date();
    const expiryDate = calculateExpiryDate(now, payment.planName);

    const activatedSubscription = await Subscription.findByIdAndUpdate(
      payment.subscriptionId,
      {
        status:    SUBSCRIPTION_STATUSES.ACTIVE,
        startDate: now,
        expiryDate,
        autoRenew: false,
      },
      { new: true, session }
    );

    await writeAudit({
      eventType: PAYMENT_EVENT_TYPES.SUBSCRIPTION_ACTIVATED,
      userId:    payment.userId,
      paymentId: payment._id,
      payload:   {
        subscriptionId: payment.subscriptionId,
        planName:       payment.planName,
        startDate:      now,
        expiryDate,
      },
    }, session);

    await User.findByIdAndUpdate(
      payment.userId,
      {
        $set: {
          'subscription.trade': {
            planType:        planNameToTradeType(payment.planName),
            status:          'active',
            startDate:       now,
            endDate:         expiryDate,
            unlimitedAccess: true,
          },
        },
      },
      { session }
    );

    return {
      activated:      true,
      userId:         payment.userId,
      payment,
      paymentId:      entity.id,
      activatedSubscription,
      paymentMethod:  entity.method ?? null,
    };
  }

  return { activated: false };
}

async function handlePaymentFailed(payload, session) {
  const entity = payload.payload?.payment?.entity;
  if (!entity?.order_id) return;

  const payment = await PaymentRecord.findOne({ razorpayOrderId: entity.order_id }).session(session);
  if (!payment) return;

  if (payment.status === PAYMENT_STATUSES.FAILED) return;

  await PaymentRecord.findByIdAndUpdate(
    payment._id,
    { status: PAYMENT_STATUSES.FAILED },
    { session }
  );

  const subscription = await Subscription.findById(payment.subscriptionId).session(session);
  if (subscription && subscription.status !== SUBSCRIPTION_STATUSES.ACTIVE) {
    await Subscription.findByIdAndUpdate(
      payment.subscriptionId,
      { status: SUBSCRIPTION_STATUSES.PAYMENT_FAILED },
      { session }
    );
  }

  await writeAudit({
    eventType: PAYMENT_EVENT_TYPES.PAYMENT_FAILED,
    userId:    payment.userId,
    paymentId: payment._id,
    payload: {
      razorpayOrderId:  entity.order_id,
      razorpayPaymentId: entity.id,
      errorCode:         entity.error_code        ?? null,
      errorDescription:  entity.error_description ?? null,
    },
  }, session);
}

async function handleRefundCreated(payload, session) {
  const entity = payload.payload?.refund?.entity;
  if (!entity?.payment_id) return;

  const payment = await PaymentRecord.findOne({ razorpayPaymentId: entity.payment_id }).session(session);
  if (!payment) return;

  await PaymentRecord.findByIdAndUpdate(
    payment._id,
    {
      refundStatus: REFUND_STATUSES.INITIATED,
      refundAmount: Math.round((entity.amount ?? 0) / 100),
    },
    { session }
  );

  await writeAudit({
    eventType: PAYMENT_EVENT_TYPES.REFUND_CREATED,
    userId:    payment.userId,
    paymentId: payment._id,
    payload:   { refundId: entity.id, razorpayPaymentId: entity.payment_id, amountPaise: entity.amount },
  }, session);
}

async function handleRefundProcessed(payload, session) {
  const entity = payload.payload?.refund?.entity;
  if (!entity?.payment_id) return;

  const payment = await PaymentRecord.findOne({ razorpayPaymentId: entity.payment_id }).session(session);
  if (!payment) return;

  await PaymentRecord.findByIdAndUpdate(
    payment._id,
    {
      refundStatus: REFUND_STATUSES.PROCESSED,
      status:       PAYMENT_STATUSES.REFUNDED,
    },
    { session }
  );

  await Subscription.findByIdAndUpdate(
    payment.subscriptionId,
    { status: SUBSCRIPTION_STATUSES.REFUNDED, autoRenew: false },
    { session }
  );

  await writeAudit({
    eventType: PAYMENT_EVENT_TYPES.REFUND_PROCESSED,
    userId:    payment.userId,
    paymentId: payment._id,
    payload:   { refundId: entity.id, razorpayPaymentId: entity.payment_id, amountPaise: entity.amount },
  }, session);

  await writeAudit({
    eventType: PAYMENT_EVENT_TYPES.SUBSCRIPTION_REFUNDED,
    userId:    payment.userId,
    paymentId: payment._id,
    payload:   { subscriptionId: payment.subscriptionId, refundId: entity.id },
  }, session);
}

async function handleOrderPaid(payload, session) {
  const orderEntity   = payload.payload?.order?.entity;
  const paymentEntity = payload.payload?.payment?.entity;
  if (!orderEntity?.id) return;

  const payment = await PaymentRecord.findOne({ razorpayOrderId: orderEntity.id }).session(session);
  if (!payment) return;

  if (!payment.razorpayPaymentId && paymentEntity?.id) {
    await PaymentRecord.findByIdAndUpdate(
      payment._id,
      { razorpayPaymentId: paymentEntity.id },
      { session }
    );
  }

  await writeAudit({
    eventType: PAYMENT_EVENT_TYPES.PAYMENT_ORDER_CREATED,
    userId:    payment.userId,
    paymentId: payment._id,
    payload:   {
      razorpayOrderId:   orderEntity.id,
      razorpayPaymentId: paymentEntity?.id ?? null,
    },
  }, session);
}

export async function processWebhookEvent({ eventType, entityId, payload, receivedAt }) {
  const existing = await WebhookEvent.findOne({ eventType, entityId });
  if (existing?.processed) {
    logRazorpayEvent('WEBHOOK_DUPLICATE', { eventType, entityId });
    return { skipped: true };
  }

  const session = await mongoose.startSession();
  let captureResult = null;

  try {
    session.startTransaction();

    switch (eventType) {
      case 'payment.authorized': await handlePaymentAuthorized(payload, session);          break;
      case 'payment.captured':   captureResult = await handlePaymentCaptured(payload, session); break;
      case 'payment.failed':     await handlePaymentFailed(payload, session);              break;
      case 'refund.created':     await handleRefundCreated(payload, session);              break;
      case 'refund.processed':   await handleRefundProcessed(payload, session);            break;
      case 'order.paid':         await handleOrderPaid(payload, session);                  break;
      default: break;
    }

    await WebhookEvent.findOneAndUpdate(
      { eventType, entityId },
      {
        $set: {
          payload,
          processed:   true,
          processedAt: new Date(),
          receivedAt,
          error:       null,
        },
      },
      { upsert: true, session, new: true }
    );

    await session.commitTransaction();

    try {
      await PaymentAudit.create({
        eventType: PAYMENT_EVENT_TYPES.WEBHOOK_PROCESSED,
        payload:   { webhookEventType: eventType, entityId },
      });
    } catch (auditErr) {
      logPaymentError('WEBHOOK_PROCESSED_AUDIT_FAILED', auditErr, { eventType, entityId });
    }

    logRazorpayEvent('WEBHOOK_PROCESSED', { eventType, entityId });

    if (captureResult?.activated) {
      try {
        await runInvoiceFlow(
          captureResult.userId,
          captureResult.payment,
          captureResult.paymentId,
          captureResult.activatedSubscription,
          captureResult.paymentMethod
        );
      } catch (invoiceErr) {
        logPaymentError('INVOICE_FLOW_UNEXPECTED', invoiceErr, {
          userId: captureResult.userId?.toString(),
          eventType,
          entityId,
        });
      }
    }

    return { skipped: false };
  } catch (err) {
    await session.abortTransaction();

    if (err.code === 11000) {
      logRazorpayEvent('WEBHOOK_DUPLICATE_CONCURRENT', { eventType, entityId });
      return { skipped: true };
    }

    logPaymentError('WEBHOOK_PROCESSING_FAILED', err, { eventType, entityId });

    try {
      await WebhookEvent.findOneAndUpdate(
        { eventType, entityId },
        {
          $set: {
            payload,
            processed: false,
            receivedAt,
            error:     err.message,
          },
        },
        { upsert: true, new: true }
      );
    } catch (saveErr) {
      logPaymentError('WEBHOOK_EVENT_SAVE_FAILED', saveErr, { eventType, entityId });
    }

    throw err;
  } finally {
    await session.endSession();
  }
}
