import { body, param } from 'express-validator';
import { PLAN_NAMES } from '../../../config/paymentConfig.js';
import { validateCurrency } from '../utils/currency.js';

const PAID_PLANS = [PLAN_NAMES.MONTHLY, PLAN_NAMES.SIX_MONTHS, PLAN_NAMES.YEARLY];

export const createOrderValidator = [
  body('planType')
    .trim()
    .notEmpty().withMessage('Plan type is required')
    .isIn(PAID_PLANS).withMessage(`Plan must be one of: ${PAID_PLANS.join(', ')}`),
  body('billingAddressId')
    .trim()
    .notEmpty().withMessage('Billing address is required')
    .isMongoId().withMessage('Invalid billing address ID'),
];

export const cancelSubscriptionValidator = [
  param('subscriptionId')
    .notEmpty().withMessage('Subscription ID is required')
    .isMongoId().withMessage('Invalid subscription ID'),
  body('cancelReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancel reason cannot exceed 500 characters'),
];

export const attachOrganizationValidator = [
  param('subscriptionId')
    .notEmpty().withMessage('Subscription ID is required')
    .isMongoId().withMessage('Invalid subscription ID'),
  body('organizationId')
    .notEmpty().withMessage('Organization ID is required')
    .isMongoId().withMessage('Invalid organization ID'),
];

export const validateAmountField = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
];

export const validateCurrencyField = [
  body('currency')
    .notEmpty().withMessage('Currency is required')
    .custom((value) => validateCurrency(value)).withMessage('Currency must be one of: USD, INR'),
];

export const validateUserIdField = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
];

export const verifyPaymentValidator = [
  body('razorpay_order_id')
    .trim()
    .notEmpty().withMessage('Razorpay order ID is required')
    .isString().withMessage('Invalid order ID'),
  body('razorpay_payment_id')
    .trim()
    .notEmpty().withMessage('Razorpay payment ID is required')
    .isString().withMessage('Invalid payment ID'),
  body('razorpay_signature')
    .trim()
    .notEmpty().withMessage('Razorpay signature is required')
    .isString().withMessage('Invalid signature'),
];
