import { body } from 'express-validator';
import { buildGstFieldValidators } from '../../shared/validators/gstFieldValidators.js';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const HS_RE    = /^\d{4,8}$/;
const IFSC_RE  = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const saveDraftValidator = [
  body('contract')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('Invalid contract reference'),

  body('invoiceInfo.date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Invoice date must be a valid date'),

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

  body('goodsItems')
    .optional()
    .isArray().withMessage('Goods items must be an array'),

  body('goodsItems.*.hsnCode')
    .optional({ checkFalsy: true })
    .trim().matches(HS_RE).withMessage('HSN Code must be 4–8 digits'),

  body('goodsItems.*.quantity')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Quantity must be a number'),

  body('goodsItems.*.unitPrice')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Unit price must be a number'),

  body('goodsItems.*.taxPercent')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Tax percent must be a number')
    .custom((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100)
    .withMessage('Tax percent must be between 0 and 100'),

  body('financial.currency')
    .optional({ checkFalsy: true })
    .trim().isLength({ min: 3, max: 5 }).withMessage('Currency must be a valid code'),

  body('financial.placeOfSupply')
    .optional({ checkFalsy: true })
    .trim().isLength({ max: 100 }).withMessage('Place of supply must be under 100 characters'),

  ...buildGstFieldValidators('financial'),

  body('financial.total')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Total must be a number'),

  body('financial.freight')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Freight must be a number'),

  body('financial.insurance')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Insurance must be a number'),

  body('bankDetails.ifsc')
    .optional({ checkFalsy: true })
    .trim().toUpperCase().matches(IFSC_RE).withMessage('IFSC code is not valid'),

  body('bankDetails.swift')
    .optional({ checkFalsy: true })
    .trim().toUpperCase().matches(SWIFT_RE).withMessage('SWIFT code is not valid'),
];

export const generateValidator = [
  body('contract')
    .notEmpty().withMessage('A Contract must be selected')
    .isMongoId().withMessage('Invalid contract reference'),

  body('invoiceInfo.date')
    .notEmpty().withMessage('Invoice date is required')
    .isISO8601().withMessage('Invoice date must be a valid date'),

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

  body('shippingDetails.vessel')
    .trim().notEmpty().withMessage('Vessel is required'),
  body('shippingDetails.blNumber')
    .trim().notEmpty().withMessage('BL number is required'),
  body('shippingDetails.portOfLoading')
    .trim().notEmpty().withMessage('Port of loading is required'),
  body('shippingDetails.portOfDischarge')
    .trim().notEmpty().withMessage('Port of discharge is required'),
  body('shippingDetails.finalDestination')
    .trim().notEmpty().withMessage('Final destination is required'),

  body('goodsItems')
    .isArray({ min: 1 }).withMessage('At least one goods item is required'),

  body('goodsItems.*.commodity')
    .trim().notEmpty().withMessage('Commodity is required'),
  body('goodsItems.*.hsnCode')
    .trim().notEmpty().withMessage('HSN code is required')
    .matches(HS_RE).withMessage('HSN Code must be 4–8 digits'),
  body('goodsItems.*.description')
    .trim().notEmpty().withMessage('Description is required'),
  body('goodsItems.*.quantity')
    .isNumeric().withMessage('Quantity must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Quantity must be greater than 0'),
  body('goodsItems.*.unit')
    .trim().notEmpty().withMessage('Unit is required'),
  body('goodsItems.*.unitPrice')
    .isNumeric().withMessage('Unit price must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Unit price must be greater than 0'),

  body('financial.currency')
    .trim().notEmpty().withMessage('Currency is required'),
  ...buildGstFieldValidators('financial'),
  body('financial.freight')
    .isNumeric().withMessage('Freight must be a number')
    .custom((val) => parseFloat(val) >= 0).withMessage('Freight must be ≥ 0'),
  body('financial.insurance')
    .isNumeric().withMessage('Insurance must be a number')
    .custom((val) => parseFloat(val) >= 0).withMessage('Insurance must be ≥ 0'),

  body('bankDetails.bankName')
    .trim().notEmpty().withMessage('Bank name is required'),
  body('bankDetails.accountNumber')
    .trim().notEmpty().withMessage('Account number is required'),
  body('bankDetails.ifsc')
    .trim().notEmpty().withMessage('IFSC code is required')
    .toUpperCase().matches(IFSC_RE).withMessage('IFSC code is not valid'),
  body('bankDetails.swift')
    .trim().notEmpty().withMessage('SWIFT code is required')
    .toUpperCase().matches(SWIFT_RE).withMessage('SWIFT code is not valid'),

  body('declaration')
    .trim().notEmpty().withMessage('Declaration is required'),

  body('termsAndConditions')
    .trim().notEmpty().withMessage('Terms & conditions are required'),

  body('signatory.name')
    .trim().notEmpty().withMessage('Signatory name is required'),
  body('signatory.designation')
    .trim().notEmpty().withMessage('Signatory designation is required'),
];
