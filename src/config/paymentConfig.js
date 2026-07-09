const isProd = process.env.NODE_ENV === "production";

const key_id = isProd ? process.env.RAZORPAY_KEY_ID : process.env.TEST_RAZORPAY_KEY_ID;
const key_secret = isProd ? process.env.RAZORPAY_KEY_SECRET : process.env.TEST_RAZORPAY_KEY_SECRET;
const webhook_secret = isProd ? process.env.RAZORPAY_WEBHOOK_SECRET : process.env.TEST_RAZORPAY_WEBHOOK_SECRET;

function num(val, fallback) {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const PLAN_NAMES = Object.freeze({
  FREE:       'FREE',
  MONTHLY:    'MONTHLY',
  SIX_MONTHS: 'SIX_MONTHS',
  YEARLY:     'YEARLY',
});

export const BILLING_CYCLES = Object.freeze({
  FREE:       'FREE',
  MONTHLY:    'MONTHLY',
  SIX_MONTHS: 'SIX_MONTHS',
  YEARLY:     'YEARLY',
});

export const SUBSCRIPTION_STATUSES = Object.freeze({
  FREE:            'FREE',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACTIVE:          'ACTIVE',
  EXPIRED:         'EXPIRED',
  CANCELLED:       'CANCELLED',
  PAYMENT_FAILED:  'PAYMENT_FAILED',
  REFUNDED:        'REFUNDED',
});

export const PAYMENT_STATUSES = Object.freeze({
  CREATED:    'CREATED',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED:   'CAPTURED',
  FAILED:     'FAILED',
  REFUNDED:   'REFUNDED',
});

export const REFUND_STATUSES = Object.freeze({
  NONE:      'NONE',
  INITIATED: 'INITIATED',
  PROCESSED: 'PROCESSED',
  FAILED:    'FAILED',
});

export const PAYMENT_EVENT_TYPES = Object.freeze({
  ORDER_CREATED:                  'ORDER_CREATED',
  PAYMENT_ORDER_CREATED:          'PAYMENT_ORDER_CREATED',
  PAYMENT_AUTHORIZED:             'PAYMENT_AUTHORIZED',
  PAYMENT_CAPTURED:               'PAYMENT_CAPTURED',
  PAYMENT_FAILED:                 'PAYMENT_FAILED',
  PAYMENT_VERIFICATION_STARTED:   'PAYMENT_VERIFICATION_STARTED',
  PAYMENT_VERIFICATION_SUCCESS:   'PAYMENT_VERIFICATION_SUCCESS',
  PAYMENT_VERIFICATION_FAILED:    'PAYMENT_VERIFICATION_FAILED',
  REFUND_INITIATED:               'REFUND_INITIATED',
  REFUND_PROCESSED:               'REFUND_PROCESSED',
  REFUND_FAILED:                  'REFUND_FAILED',
  WEBHOOK_RECEIVED:               'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED:              'WEBHOOK_PROCESSED',
  SUBSCRIPTION_ACTIVATED:         'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_CANCELLED:         'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_EXPIRED:           'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_REFUNDED:          'SUBSCRIPTION_REFUNDED',
  REFUND_CREATED:                 'REFUND_CREATED',
  TRADE_ACCESS_GRANTED:           'TRADE_ACCESS_GRANTED',
  TRADE_ACCESS_DENIED:            'TRADE_ACCESS_DENIED',
  ACTIVE_SUBSCRIPTION_BLOCKED:    'ACTIVE_SUBSCRIPTION_BLOCKED',
});

export const PLAN_PRICES = Object.freeze({
  [PLAN_NAMES.FREE]:       0,
  [PLAN_NAMES.MONTHLY]:    num(process.env.MONTHLY_PLAN_PRICE, 31),
  [PLAN_NAMES.SIX_MONTHS]: num(process.env.SIX_MONTH_PLAN_PRICE, 136),
  [PLAN_NAMES.YEARLY]:     num(process.env.YEARLY_PLAN_PRICE, 230),
});

export const PLAN_DURATION_DAYS = Object.freeze({
  [PLAN_NAMES.FREE]:       null,
  [PLAN_NAMES.MONTHLY]:    30,
  [PLAN_NAMES.SIX_MONTHS]: 210,
  [PLAN_NAMES.YEARLY]:     420,
});

export const RAZORPAY_CONFIG = Object.freeze({
  keyId:         key_id,
  keySecret:     key_secret,
  webhookSecret: webhook_secret,
});
