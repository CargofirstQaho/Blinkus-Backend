import { body } from 'express-validator';
import { buildGstFieldValidators } from '../../shared/validators/gstFieldValidators.js';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const GST_RE   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const HS_RE    = /^\d{4,8}$/;

export const saveDraftValidator = [
  body('buyerDetails.buyerCompany')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: 150 })
    .withMessage('Buyer company must be under 150 characters'),

  body('buyerDetails.buyerEmail')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Buyer email is not valid'),

  body('buyerDetails.buyerPhone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE)
    .withMessage('Buyer phone is not valid'),

  body('buyerDetails.buyerGstNumber')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(GST_RE)
    .withMessage('Buyer GST format is invalid (e.g. 22AAAAA0000A1Z5)'),

  body('shipToDetails.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Ship-to email is not valid'),

  body('shipToDetails.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE)
    .withMessage('Ship-to phone is not valid'),

  body('orderDetails.poDate')
    .notEmpty()
    .withMessage('PO Date is required')
    .isISO8601()
    .withMessage('PO Date must be a valid date')
    .custom((val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(val) < today) throw new Error('Order date cannot be in the past.');
      return true;
    }),

  body('orderDetails.expectedDelivery')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Expected delivery must be a valid date')
    .custom((val, { req }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(val) < today) throw new Error('Expected delivery date cannot be in the past.');
      const poDate = req.body?.orderDetails?.poDate;
      if (poDate && val && new Date(val) < new Date(poDate)) {
        throw new Error('Delivery date cannot be earlier than PO date');
      }
      return true;
    }),

  body('orderDetails.currency')
    .notEmpty()
    .withMessage('Currency is required')
    .trim()
    .isIn(['INR', 'USD'])
    .withMessage('Currency must be INR or USD'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.productName')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Product name is required for each item'),

  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .custom((val) => parseFloat(val) > 0)
    .withMessage('Quantity must be greater than 0'),

  body('items.*.unitPrice')
    .isNumeric()
    .withMessage('Unit price must be a number')
    .custom((val) => parseFloat(val) >= 0)
    .withMessage('Unit price must be ≥ 0'),

  body('items.*.unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required for each item'),

  body('items.*.hsCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(HS_RE)
    .withMessage('HS Code must be 4–8 digits'),

  body('items.*.unitsPerPackage')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Units per package must be a number')
    .custom((val) => parseFloat(val) > 0)
    .withMessage('Units per package must be greater than 0'),

  body('items.*.taxPercent')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Tax percent must be a number')
    .custom((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Tax percent must be between 0 and 100'),

  ...buildGstFieldValidators('summary'),

  body('summary.grandTotal')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Grand total must be a number'),

  body('bankDetails.ifsc')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .isLength({ max: 20 })
    .withMessage('IFSC must be under 20 characters'),

  body('bankDetails.swift')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .isLength({ max: 20 })
    .withMessage('SWIFT must be under 20 characters'),
];
