import { body } from 'express-validator';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const HS_RE    = /^\d{4,8}$/;
const IFSC_RE  = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const saveDraftValidator = [
  body('contract')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('Invalid contract reference'),

  body('invoiceInfo.invoiceDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Invoice date must be a valid date'),

  body('invoiceInfo.currency')
    .optional({ checkFalsy: true })
    .trim().isLength({ min: 3, max: 5 }).withMessage('Currency must be a valid code'),

  body('exporterDetails.email')
    .optional({ checkFalsy: true })
    .trim().isEmail().withMessage('Exporter email is not valid'),

  body('exporterDetails.phone')
    .optional({ checkFalsy: true })
    .trim().matches(PHONE_RE).withMessage('Exporter phone is not valid'),

  body('buyerDetails.email')
    .optional({ checkFalsy: true })
    .trim().isEmail().withMessage('Buyer email is not valid'),

  body('buyerDetails.phone')
    .optional({ checkFalsy: true })
    .trim().matches(PHONE_RE).withMessage('Buyer phone is not valid'),

  body('notifyParty.email')
    .optional({ checkFalsy: true })
    .trim().isEmail().withMessage('Notify party email is not valid'),

  body('notifyParty.phone')
    .optional({ checkFalsy: true })
    .trim().matches(PHONE_RE).withMessage('Notify party phone is not valid'),

  body('consignee.email')
    .optional({ checkFalsy: true })
    .trim().isEmail().withMessage('Consignee email is not valid'),

  body('consignee.phone')
    .optional({ checkFalsy: true })
    .trim().matches(PHONE_RE).withMessage('Consignee phone is not valid'),

  body('commercialDetails')
    .optional()
    .isArray().withMessage('Commercial details must be an array'),

  body('commercialDetails.*.hsnCode')
    .optional({ checkFalsy: true })
    .trim().matches(HS_RE).withMessage('HSN Code must be 4–8 digits'),

  body('commercialDetails.*.quantity')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Quantity must be a number'),

  body('commercialDetails.*.rate')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Rate must be a number'),

  body('financialInfo.advancePercent')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Advance percent must be a number')
    .custom((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Advance percent must be between 0 and 100'),

  body('financialInfo.advanceAmount')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Advance amount must be a number'),

  body('financialInfo.balanceAmount')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Balance amount must be a number'),

  body('bankInfo.ifsc')
    .optional({ checkFalsy: true })
    .trim().toUpperCase().matches(IFSC_RE).withMessage('IFSC code is not valid'),

  body('bankInfo.swift')
    .optional({ checkFalsy: true })
    .trim().toUpperCase().matches(SWIFT_RE).withMessage('SWIFT code is not valid'),
];

export const generateValidator = [
  body('contract')
    .notEmpty().withMessage('A Contract must be selected')
    .isMongoId().withMessage('Invalid contract reference'),

  body('invoiceInfo.invoiceDate')
    .notEmpty().withMessage('Invoice date is required')
    .isISO8601().withMessage('Invoice date must be a valid date'),

  body('invoiceInfo.currency')
    .trim().notEmpty().withMessage('Currency is required'),

  body('exporterDetails.companyName')
    .trim().notEmpty().withMessage('Exporter company name is required'),
  body('exporterDetails.address')
    .trim().notEmpty().withMessage('Exporter address is required'),
  body('exporterDetails.country')
    .trim().notEmpty().withMessage('Exporter country is required'),
  body('exporterDetails.email')
    .trim().notEmpty().withMessage('Exporter email is required')
    .isEmail().withMessage('Exporter email is not valid'),
  body('exporterDetails.phone')
    .trim().notEmpty().withMessage('Exporter phone is required')
    .matches(PHONE_RE).withMessage('Exporter phone is not valid'),
  body('exporterDetails.taxNumber')
    .trim().notEmpty().withMessage('Exporter tax number is required'),

  body('buyerDetails.companyName')
    .trim().notEmpty().withMessage('Buyer company name is required'),
  body('buyerDetails.address')
    .trim().notEmpty().withMessage('Buyer address is required'),
  body('buyerDetails.country')
    .trim().notEmpty().withMessage('Buyer country is required'),
  body('buyerDetails.contactPerson')
    .trim().notEmpty().withMessage('Buyer contact person is required'),
  body('buyerDetails.phone')
    .trim().notEmpty().withMessage('Buyer phone is required')
    .matches(PHONE_RE).withMessage('Buyer phone is not valid'),
  body('buyerDetails.email')
    .trim().notEmpty().withMessage('Buyer email is required')
    .isEmail().withMessage('Buyer email is not valid'),
  body('buyerDetails.taxNumber')
    .trim().notEmpty().withMessage('Buyer tax number is required'),

  body('notifyParty.name')
    .trim().notEmpty().withMessage('Notify party name is required'),
  body('notifyParty.address')
    .trim().notEmpty().withMessage('Notify party address is required'),
  body('notifyParty.country')
    .trim().notEmpty().withMessage('Notify party country is required'),
  body('notifyParty.phone')
    .trim().notEmpty().withMessage('Notify party phone is required')
    .matches(PHONE_RE).withMessage('Notify party phone is not valid'),
  body('notifyParty.email')
    .trim().notEmpty().withMessage('Notify party email is required')
    .isEmail().withMessage('Notify party email is not valid'),

  body('consignee.name')
    .trim().notEmpty().withMessage('Consignee name is required'),
  body('consignee.address')
    .trim().notEmpty().withMessage('Consignee address is required'),
  body('consignee.country')
    .trim().notEmpty().withMessage('Consignee country is required'),
  body('consignee.phone')
    .trim().notEmpty().withMessage('Consignee phone is required')
    .matches(PHONE_RE).withMessage('Consignee phone is not valid'),
  body('consignee.email')
    .trim().notEmpty().withMessage('Consignee email is required')
    .isEmail().withMessage('Consignee email is not valid'),

  body('shippingInfo.portOfLoading')
    .trim().notEmpty().withMessage('Port of loading is required'),
  body('shippingInfo.portOfDischarge')
    .trim().notEmpty().withMessage('Port of discharge is required'),
  body('shippingInfo.finalDestination')
    .trim().notEmpty().withMessage('Final destination is required'),
  body('shippingInfo.countryOfOrigin')
    .trim().notEmpty().withMessage('Country of origin is required'),

  body('commercialDetails')
    .isArray({ min: 1 }).withMessage('At least one commercial line item is required'),

  body('commercialDetails.*.commodity')
    .trim().notEmpty().withMessage('Commodity is required'),
  body('commercialDetails.*.hsnCode')
    .trim().notEmpty().withMessage('HSN code is required')
    .matches(HS_RE).withMessage('HSN Code must be 4–8 digits'),
  body('commercialDetails.*.quantity')
    .isNumeric().withMessage('Quantity must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Quantity must be greater than 0'),
  body('commercialDetails.*.unit')
    .trim().notEmpty().withMessage('Unit is required'),
  body('commercialDetails.*.rate')
    .isNumeric().withMessage('Rate must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Rate must be greater than 0'),

  body('financialInfo.advancePercent')
    .isNumeric().withMessage('Advance percent must be a number')
    .custom((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Advance percent must be between 0 and 100'),
  body('financialInfo.advanceAmount')
    .isNumeric().withMessage('Advance amount must be a number')
    .custom((val) => parseFloat(val) >= 0).withMessage('Advance amount must be ≥ 0'),
  body('financialInfo.balanceAmount')
    .isNumeric().withMessage('Balance amount must be a number'),

  body('bankInfo.bankName')
    .trim().notEmpty().withMessage('Bank name is required'),
  body('bankInfo.accountNumber')
    .trim().notEmpty().withMessage('Account number is required'),
  body('bankInfo.ifsc')
    .trim().notEmpty().withMessage('IFSC code is required')
    .toUpperCase().matches(IFSC_RE).withMessage('IFSC code is not valid'),
  body('bankInfo.swift')
    .trim().notEmpty().withMessage('SWIFT code is required')
    .toUpperCase().matches(SWIFT_RE).withMessage('SWIFT code is not valid'),

  body('notes')
    .trim().notEmpty().withMessage('Notes are required'),

  body('termsAndConditions')
    .trim().notEmpty().withMessage('Terms & conditions are required'),
];
