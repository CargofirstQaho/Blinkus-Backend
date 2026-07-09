import { body } from 'express-validator';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const HS_RE    = /^\d{4,8}$/;

export const saveDraftValidator = [
  body('contract')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('Invalid contract reference'),

  body('packingListInfo.date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Packing list date must be a valid date'),

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

  body('consignee.email')
    .optional({ checkFalsy: true })
    .trim().isEmail().withMessage('Consignee email is not valid'),

  body('consignee.phone')
    .optional({ checkFalsy: true })
    .trim().matches(PHONE_RE).withMessage('Consignee phone is not valid'),

  body('packingItems')
    .optional()
    .isArray().withMessage('Packing items must be an array'),

  body('packingItems.*.hsnCode')
    .optional({ checkFalsy: true })
    .trim().matches(HS_RE).withMessage('HSN Code must be 4–8 digits'),

  body('packingItems.*.numberOfPackages')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Number of packages must be a number'),

  body('packingItems.*.netWeight')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Net weight must be a number'),

  body('packingItems.*.grossWeight')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Gross weight must be a number'),

  body('packingItems.*.quantity')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Quantity must be a number'),
];

export const generateValidator = [
  body('contract')
    .notEmpty().withMessage('A Contract must be selected')
    .isMongoId().withMessage('Invalid contract reference'),

  body('packingListInfo.date')
    .notEmpty().withMessage('Packing list date is required')
    .isISO8601().withMessage('Packing list date must be a valid date'),

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

  body('shippingDetails.portOfLoading')
    .trim().notEmpty().withMessage('Port of loading is required'),
  body('shippingDetails.portOfDischarge')
    .trim().notEmpty().withMessage('Port of discharge is required'),
  body('shippingDetails.vessel')
    .trim().notEmpty().withMessage('Vessel is required'),
  body('shippingDetails.containerNumber')
    .trim().notEmpty().withMessage('Container number is required'),
  body('shippingDetails.sealNumber')
    .trim().notEmpty().withMessage('Seal number is required'),

  body('packingItems')
    .isArray({ min: 1 }).withMessage('At least one packing item is required'),

  body('packingItems.*.marksAndNumbers')
    .trim().notEmpty().withMessage('Marks & numbers are required'),
  body('packingItems.*.packagingType')
    .trim().notEmpty().withMessage('Packaging type is required'),
  body('packingItems.*.numberOfPackages')
    .isNumeric().withMessage('Number of packages must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Number of packages must be greater than 0'),
  body('packingItems.*.commodity')
    .trim().notEmpty().withMessage('Commodity is required'),
  body('packingItems.*.description')
    .trim().notEmpty().withMessage('Description is required'),
  body('packingItems.*.hsnCode')
    .trim().notEmpty().withMessage('HSN code is required')
    .matches(HS_RE).withMessage('HSN Code must be 4–8 digits'),
  body('packingItems.*.netWeight')
    .isNumeric().withMessage('Net weight must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Net weight must be greater than 0'),
  body('packingItems.*.grossWeight')
    .isNumeric().withMessage('Gross weight must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Gross weight must be greater than 0')
    .custom((val, { req, path }) => {
      const match = path.match(/packingItems\.(\d+)\.grossWeight/);
      const idx   = match ? match[1] : null;
      const net   = idx !== null ? parseFloat(req.body.packingItems?.[idx]?.netWeight) || 0 : 0;
      if (parseFloat(val) < net) {
        throw new Error('Gross weight must be greater than or equal to net weight');
      }
      return true;
    }),
  body('packingItems.*.quantity')
    .isNumeric().withMessage('Quantity must be a number')
    .custom((val) => parseFloat(val) > 0).withMessage('Quantity must be greater than 0'),
  body('packingItems.*.unit')
    .trim().notEmpty().withMessage('Unit is required'),

  body('remarks')
    .trim().notEmpty().withMessage('Remarks are required'),

  body('termsAndConditions')
    .trim().notEmpty().withMessage('Terms & conditions are required'),
];
