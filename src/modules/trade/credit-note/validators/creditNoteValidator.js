import { body } from 'express-validator';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const GST_RE   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const HSN_RE   = /^\d{4,8}$/;

export const saveDraftValidator = [
  body('creditNoteInfo.currency')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 5 }).withMessage('Currency must be a valid code'),

  body('creditNoteInfo.creditNoteDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Credit note date must be a valid date'),

  body('creditNoteInfo.referenceInvoiceDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Reference invoice date must be a valid date'),

  body('customerInfo.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Customer email is not valid'),

  body('customerInfo.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE).withMessage('Customer phone is not valid'),

  body('customerInfo.gstNumber')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(GST_RE).withMessage('Customer GST format is invalid'),

  body('lineItems')
    .optional()
    .isArray().withMessage('Line items must be an array'),

  body('lineItems.*.itemName')
    .optional({ checkFalsy: true })
    .trim().escape(),

  body('lineItems.*.quantity')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Quantity must be a number'),

  body('lineItems.*.unitPrice')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Unit price must be a number'),

  body('lineItems.*.taxPercent')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Tax percent must be a number')
    .custom(val => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Tax percent must be between 0 and 100'),

  body('lineItems.*.hsnCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(HSN_RE).withMessage('HSN Code must be 4–8 digits'),

  body('summary.cgst')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('CGST must be a number'),

  body('summary.sgst')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('SGST must be a number'),

  body('summary.igst')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('IGST must be a number'),

  body('summary.creditAmount')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Credit amount must be a number'),
];

export const generateValidator = [
  body('creditNoteInfo.creditNoteDate')
    .notEmpty().withMessage('Credit note date is required')
    .isISO8601().withMessage('Credit note date must be a valid date'),

  body('creditNoteInfo.referenceInvoiceNumber')
    .trim().notEmpty().withMessage('Reference invoice number is required'),

  body('creditNoteInfo.referenceInvoiceDate')
    .notEmpty().withMessage('Reference invoice date is required')
    .isISO8601().withMessage('Reference invoice date must be a valid date'),

  body('creditNoteInfo.currency')
    .trim().notEmpty().withMessage('Currency is required'),

  body('creditNoteInfo.placeOfSupply')
    .trim().notEmpty().withMessage('Place of supply is required'),

  body('customerInfo.customerName')
    .trim().notEmpty().withMessage('Customer name is required'),

  body('customerInfo.customerCompany')
    .trim().notEmpty().withMessage('Customer company is required'),

  body('customerInfo.billingAddress')
    .trim().notEmpty().withMessage('Billing address is required'),

  body('customerInfo.shippingAddress')
    .trim().notEmpty().withMessage('Shipping address is required'),

  body('customerInfo.gstNumber')
    .trim().notEmpty().withMessage('Customer GST number is required')
    .toUpperCase()
    .matches(GST_RE).withMessage('Customer GST format is invalid'),

  body('customerInfo.email')
    .trim().notEmpty().withMessage('Customer email is required')
    .isEmail().withMessage('Customer email is not valid'),

  body('customerInfo.phone')
    .trim().notEmpty().withMessage('Customer phone is required')
    .matches(PHONE_RE).withMessage('Customer phone is not valid'),

  body('lineItems')
    .isArray({ min: 1 }).withMessage('At least one line item is required'),

  body('lineItems.*.itemName')
    .trim().notEmpty().withMessage('Item name is required'),

  body('lineItems.*.description')
    .trim().notEmpty().withMessage('Item description is required'),

  body('lineItems.*.hsnCode')
    .trim().notEmpty().withMessage('HSN code is required')
    .matches(HSN_RE).withMessage('HSN Code must be 4–8 digits'),

  body('lineItems.*.quantity')
    .isNumeric().withMessage('Quantity must be a number')
    .custom(val => parseFloat(val) > 0).withMessage('Quantity must be greater than 0'),

  body('lineItems.*.unit')
    .trim().notEmpty().withMessage('Unit is required'),

  body('lineItems.*.unitPrice')
    .isNumeric().withMessage('Unit price must be a number')
    .custom(val => parseFloat(val) > 0).withMessage('Unit price must be greater than 0'),

  body('lineItems.*.taxPercent')
    .isNumeric().withMessage('Tax % must be a number')
    .custom(val => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Tax % must be between 0 and 100'),

  body('reasonForCreditNote')
    .trim().notEmpty().withMessage('Reason for credit note is required'),

  body('notes')
    .trim().notEmpty().withMessage('Notes are required'),

  body('termsAndConditions')
    .trim().notEmpty().withMessage('Terms & conditions are required'),
];
