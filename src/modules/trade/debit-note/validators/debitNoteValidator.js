import { body } from 'express-validator';
import { buildGstFieldValidators } from '../../shared/validators/gstFieldValidators.js';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const GST_RE   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const HSN_RE   = /^\d{4,8}$/;

export const saveDraftValidator = [
  body('debitNoteInfo.currency')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 5 }).withMessage('Currency must be a valid code'),

  body('debitNoteInfo.debitNoteDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Debit note date must be a valid date'),

  body('debitNoteInfo.referenceInvoiceDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Reference invoice date must be a valid date'),

  body('debitNoteInfo.placeOfSupply')
    .optional({ checkFalsy: true })
    .trim().isLength({ max: 100 }).withMessage('Place of supply must be under 100 characters'),

  body('supplierInfo.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Supplier email is not valid'),

  body('supplierInfo.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE).withMessage('Supplier phone is not valid'),

  body('supplierInfo.gstNumber')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(GST_RE).withMessage('Supplier GST format is invalid'),

  body('lineItems')
    .optional()
    .isArray().withMessage('Line items must be an array'),

  body('lineItems.*.itemName')
    .optional({ checkFalsy: true })
    .trim().escape(),

  body('lineItems.*.quantity')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Quantity must be a number'),

  body('lineItems.*.rate')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Rate must be a number'),

  body('lineItems.*.taxPercent')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Tax percent must be a number')
    .custom(val => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Tax percent must be between 0 and 100'),

  body('lineItems.*.hsnCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(HSN_RE).withMessage('HSN Code must be 4–8 digits'),

  ...buildGstFieldValidators('summary'),

  body('summary.grandTotal')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Grand total must be a number'),

  body('summary.balanceDue')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Balance due must be a number'),
];

export const generateValidator = [
  body('debitNoteInfo.debitNoteDate')
    .notEmpty().withMessage('Debit note date is required')
    .isISO8601().withMessage('Debit note date must be a valid date'),

  body('debitNoteInfo.referenceInvoiceNumber')
    .trim().notEmpty().withMessage('Reference invoice number is required'),

  body('debitNoteInfo.referenceInvoiceDate')
    .notEmpty().withMessage('Reference invoice date is required')
    .isISO8601().withMessage('Reference invoice date must be a valid date'),

  body('debitNoteInfo.currency')
    .trim().notEmpty().withMessage('Currency is required'),

  body('debitNoteInfo.placeOfSupply')
    .trim().notEmpty().withMessage('Place of supply is required'),

  body('supplierInfo.supplierName')
    .trim().notEmpty().withMessage('Supplier name is required'),

  body('supplierInfo.supplierCompany')
    .trim().notEmpty().withMessage('Supplier company is required'),

  body('supplierInfo.gstNumber')
    .trim().notEmpty().withMessage('Supplier GST number is required')
    .toUpperCase()
    .matches(GST_RE).withMessage('Supplier GST format is invalid'),

  body('supplierInfo.address')
    .trim().notEmpty().withMessage('Supplier address is required'),

  body('supplierInfo.phone')
    .trim().notEmpty().withMessage('Supplier phone is required')
    .matches(PHONE_RE).withMessage('Supplier phone is not valid'),

  body('supplierInfo.email')
    .trim().notEmpty().withMessage('Supplier email is required')
    .isEmail().withMessage('Supplier email is not valid'),

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

  body('lineItems.*.rate')
    .isNumeric().withMessage('Rate must be a number')
    .custom(val => parseFloat(val) > 0).withMessage('Rate must be greater than 0'),

  body('lineItems.*.taxPercent')
    .isNumeric().withMessage('Tax % must be a number')
    .custom(val => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Tax % must be between 0 and 100'),

  ...buildGstFieldValidators('summary'),

  body('summary.grandTotal')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Grand total must be a number'),

  body('summary.balanceDue')
    .isNumeric().withMessage('Balance due must be a number')
    .custom(val => parseFloat(val) >= 0).withMessage('Balance due must be ≥ 0'),

  body('reasonForDebitNote')
    .trim().notEmpty().withMessage('Reason for debit note is required'),

  body('notes')
    .trim().notEmpty().withMessage('Notes are required'),

  body('termsAndConditions')
    .trim().notEmpty().withMessage('Terms & conditions are required'),
];
