import Subscription from '../models/Subscription.js';
import { SUBSCRIPTION_STATUSES, PAYMENT_EVENT_TYPES } from '../../../config/paymentConfig.js';
import { logPaymentEvent } from '../services/auditService.js';
import { logPaymentError } from '../utils/paymentLogger.js';

const DENY_RESPONSES = Object.freeze({
  SUBSCRIPTION_REQUIRED: {
    code:    'SUBSCRIPTION_REQUIRED',
    message: 'An active Blinkus Premium subscription is required to access this feature.',
  },
  SUBSCRIPTION_EXPIRED: { 
    code:    'SUBSCRIPTION_EXPIRED',
    message: 'Your Blinkus Premium subscription has expired.',
  },
  SUBSCRIPTION_CANCELLED: {
    code:    'SUBSCRIPTION_CANCELLED',
    message: 'Your subscription is no longer active.',
  },
  SUBSCRIPTION_REFUNDED: {
    code:    'SUBSCRIPTION_REFUNDED',
    message: 'Your subscription has been refunded and access is no longer available.',
  },
});

function deny(res, key) {
  const response = DENY_RESPONSES[key] ?? DENY_RESPONSES.SUBSCRIPTION_REQUIRED;
  return res.status(403).json({ success: false, ...response });
}

function fireAudit(eventType, userId, payload, req) {
  logPaymentEvent({
    eventType,
    userId,
    paymentId: null,
    payload,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }).catch((err) => logPaymentError('AUDIT_LOG_FAILED', err, { eventType }));
}

export async function requireActiveTradeSubscription(req, res, next) {
  const userId = req.user._id;
  const now    = new Date();

  let subscription;
  try {
    subscription = await Subscription.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    logPaymentError('TRADE_ACCESS_CHECK_FAILED', err, { userId: userId.toString() });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }

  if (!subscription) {
    fireAudit(PAYMENT_EVENT_TYPES.TRADE_ACCESS_DENIED, userId, { reason: 'SUBSCRIPTION_REQUIRED', path: req.path }, req);
    return deny(res, 'SUBSCRIPTION_REQUIRED');
  }

  if (subscription.status === SUBSCRIPTION_STATUSES.ACTIVE) {
    if (!subscription.expiryDate || subscription.expiryDate <= now) {
      Subscription.findByIdAndUpdate(subscription._id, { status: SUBSCRIPTION_STATUSES.EXPIRED })
        .catch((err) => logPaymentError('SUBSCRIPTION_EXPIRE_UPDATE_FAILED', err, { subscriptionId: subscription._id.toString() }));

      fireAudit(PAYMENT_EVENT_TYPES.SUBSCRIPTION_EXPIRED, userId, {
        subscriptionId: subscription._id,
        planName:       subscription.planName,
        expiryDate:     subscription.expiryDate,
      }, req);

      fireAudit(PAYMENT_EVENT_TYPES.TRADE_ACCESS_DENIED, userId, {
        subscriptionId: subscription._id,
        reason:         'SUBSCRIPTION_EXPIRED',
        path:           req.path,
      }, req);

      return deny(res, 'SUBSCRIPTION_EXPIRED');
    }

    fireAudit(PAYMENT_EVENT_TYPES.TRADE_ACCESS_GRANTED, userId, {
      subscriptionId: subscription._id,
      planName:       subscription.planName,
      path:           req.path,
    }, req);

    req.activeSubscription = subscription;
    return next();
  }

  let denyKey;
  switch (subscription.status) {
    case SUBSCRIPTION_STATUSES.EXPIRED:        denyKey = 'SUBSCRIPTION_EXPIRED';   break;
    case SUBSCRIPTION_STATUSES.CANCELLED:      denyKey = 'SUBSCRIPTION_CANCELLED'; break;
    case SUBSCRIPTION_STATUSES.REFUNDED:       denyKey = 'SUBSCRIPTION_REFUNDED';  break;
    default:                                   denyKey = 'SUBSCRIPTION_REQUIRED';  break;
  }

  fireAudit(PAYMENT_EVENT_TYPES.TRADE_ACCESS_DENIED, userId, {
    subscriptionId: subscription._id,
    reason:         denyKey,
    path:           req.path,
  }, req);

  return deny(res, denyKey);
}

