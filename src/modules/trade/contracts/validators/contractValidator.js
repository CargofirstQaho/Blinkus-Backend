import { body } from 'express-validator';

const CONTRACT_NUMBER_RE = /^[A-Za-z0-9\/\-]+$/;
const PHONE_RE           = /^\+?[\d\s\-().]{7,20}$/;
const HS_RE              = /^\d{4,8}$/;

export const saveDraftValidator = [
  body('contractNumber')
    .optional({ checkFalsy: true })
    .trim()
    .matches(CONTRACT_NUMBER_RE)
    .withMessage('Contract number may only contain letters, numbers, / and -')
    .isLength({ max: 100 })
    .withMessage('Contract number must be under 100 characters'),

  body('buyer.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Buyer email is not valid'),

  body('buyer.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE)
    .withMessage('Buyer phone is not valid'),

  body('seller.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Seller email is not valid'),

  body('seller.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE)
    .withMessage('Seller phone is not valid'),

  body('commodity.hsCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(HS_RE)
    .withMessage('HS Code must be 4–8 digits'),

  body('shipment.quantity')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Quantity must be a number'),

  body('price.unitPrice')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Unit price must be a number'),

  body('price.totalContractValue')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Total contract value must be a number'),

  body('paymentTerms.advancePercent')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Advance % must be a number'),

  body('paymentTerms.balancePercent')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Balance % must be a number'),
];

export const finalizeValidator = [
  body('contractNumber')
    .trim()
    .notEmpty()
    .withMessage('Contract number is required')
    .matches(CONTRACT_NUMBER_RE)
    .withMessage('Contract number may only contain letters, numbers, / and -')
    .isLength({ max: 100 })
    .withMessage('Contract number must be under 100 characters'),

  body('contractDate')
    .notEmpty()
    .withMessage('Contract date is required')
    .isISO8601()
    .withMessage('Contract date must be a valid date'),

  body('contractType')
    .trim()
    .notEmpty()
    .withMessage('Contract type is required'),

  body('buyerName')
    .trim()
    .notEmpty()
    .withMessage('Buyer name is required')
    .isLength({ max: 200 })
    .withMessage('Buyer name must be under 200 characters'),

  body('sellerName')
    .trim()
    .notEmpty()
    .withMessage('Seller name is required')
    .isLength({ max: 200 })
    .withMessage('Seller name must be under 200 characters'),

  body('buyer.companyName')
    .trim()
    .notEmpty()
    .withMessage('Buyer company name is required'),

  body('buyer.country')
    .trim()
    .notEmpty()
    .withMessage('Buyer country is required'),

  body('buyer.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Buyer email is not valid'),

  body('buyer.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE)
    .withMessage('Buyer phone is not valid'),

  body('seller.companyName')
    .trim()
    .notEmpty()
    .withMessage('Seller company name is required'),

  body('seller.country')
    .trim()
    .notEmpty()
    .withMessage('Seller country is required'),

  body('seller.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Seller email is not valid'),

  body('seller.phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_RE)
    .withMessage('Seller phone is not valid'),

  body('commodity.commodity')
    .trim()
    .notEmpty()
    .withMessage('Commodity description is required'),

  body('commodity.hsCode')
    .trim()
    .notEmpty()
    .withMessage('HS Code is required')
    .matches(HS_RE)
    .withMessage('HS Code must be 4–8 digits'),

  body('shipment.incoterm')
    .trim()
    .notEmpty()
    .withMessage('Incoterm is required'),

  body('shipment.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .custom(val => parseFloat(val) > 0)
    .withMessage('Quantity must be greater than 0'),

  body('shipment.unit')
    .trim()
    .notEmpty()
    .withMessage('Quantity unit is required'),

  body('price.currency')
    .trim()
    .notEmpty()
    .withMessage('Currency is required'),

  body('price.unitPrice')
    .notEmpty()
    .withMessage('Unit price is required')
    .isNumeric()
    .withMessage('Unit price must be a number')
    .custom(val => parseFloat(val) > 0)
    .withMessage('Unit price must be greater than 0'),

  body('price.totalContractValue')
    .notEmpty()
    .withMessage('Total contract value is required')
    .isNumeric()
    .withMessage('Total contract value must be a number')
    .custom(val => parseFloat(val) > 0)
    .withMessage('Total contract value must be greater than 0'),
];

export const uploadInitValidator = [
  body('contractNumber')
    .trim()
    .notEmpty()
    .withMessage('Contract number is required')
    .matches(CONTRACT_NUMBER_RE)
    .withMessage('Contract number may only contain letters, numbers, / and -')
    .isLength({ max: 100 })
    .withMessage('Contract number must be under 100 characters'),

  body('buyerName')
    .trim()
    .notEmpty()
    .withMessage('Buyer name is required')
    .isLength({ max: 200 })
    .withMessage('Buyer name must be under 200 characters'),

  body('sellerName')
    .trim()
    .notEmpty()
    .withMessage('Seller name is required')
    .isLength({ max: 200 })
    .withMessage('Seller name must be under 200 characters'),
];
