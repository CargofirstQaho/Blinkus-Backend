import { body, param } from 'express-validator';

const addressBodyRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 150 }).withMessage('Full name cannot exceed 150 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[+\d\s\-()]{7,20}$/).withMessage('Must be a valid phone number'),

  body('companyName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Company name cannot exceed 200 characters'),

  body('country')
    .trim()
    .notEmpty().withMessage('Country is required')
    .isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

  body('postalCode')
    .trim()
    .notEmpty().withMessage('Postal code is required')
    .isLength({ max: 20 }).withMessage('Postal code cannot exceed 20 characters'),

  body('addressLine1')
    .trim()
    .notEmpty().withMessage('Address line 1 is required')
    .isLength({ max: 300 }).withMessage('Address line 1 cannot exceed 300 characters'),

  body('addressLine2')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 }).withMessage('Address line 2 cannot exceed 300 characters'),

  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault must be a boolean'),
];

export const createBillingAddressValidator = [...addressBodyRules];

export const updateBillingAddressValidator = [
  param('billingAddressId')
    .notEmpty().withMessage('Billing address ID is required')
    .isMongoId().withMessage('Invalid billing address ID'),
  ...addressBodyRules,
];

export const billingAddressIdValidator = [
  param('billingAddressId')
    .notEmpty().withMessage('Billing address ID is required')
    .isMongoId().withMessage('Invalid billing address ID'),
];

export const calculateSummaryValidator = [
  body('planType')
    .trim()
    .notEmpty().withMessage('Plan type is required'),

  body('billingAddressId')
    .trim()
    .notEmpty().withMessage('Billing address ID is required')
    .isMongoId().withMessage('Invalid billing address ID'),
];
