import { body } from 'express-validator';
import {
  COUNTRY_CODES,
  FINANCIAL_YEAR_MONTHS,
  DATE_FORMATS,
  isValidTimezone,
} from '../utils/regionalData.js';

const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-./?%&=]*)?$/i;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;
const PIN_REGEX = /^[A-Za-z0-9\s\-]{3,12}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const createOrganizationValidator = [
  body('organizationName')
    .trim()
    .escape()
    .notEmpty().withMessage('Organization name is required')
    .isLength({ min: 2, max: 120 }).withMessage('Organization name must be between 2 and 120 characters'),

  body('organizationEmail')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('A valid organization email is required'),

  body('logoKey')
    .trim()
    .notEmpty().withMessage('Company logo is required')
    .isString().withMessage('Invalid logo key'),

  body('gstNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(GST_REGEX).withMessage('Enter a valid GST number (e.g. 22AAAAA0000A1Z5)'),

  body('location')
    .trim()
    .escape()
    .notEmpty().withMessage('Business location is required')
    .isLength({ max: 200 }).withMessage('Location must be under 200 characters'),

  body('contact.address')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: 300 }).withMessage('Address must be under 300 characters'),

  body('contact.pinCode')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .matches(PIN_REGEX).withMessage('Enter a valid PIN / postal code'),

  body('contact.phone')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .matches(PHONE_REGEX).withMessage('Enter a valid phone number'),

  body('contact.website')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .matches(URL_REGEX).withMessage('Enter a valid website URL'),

  body('regionalInformation.timezone')
    .trim()
    .notEmpty().withMessage('Timezone is required')
    .custom((value) => isValidTimezone(value))
    .withMessage('Select a valid timezone'),

  body('regionalInformation.country')
    .trim()
    .escape()
    .notEmpty().withMessage('Country is required'),

  body('regionalInformation.countryCode')
    .trim()
    .toUpperCase()
    .notEmpty().withMessage('Country is required')
    .isIn(COUNTRY_CODES).withMessage('Select a valid country'),

  body('regionalInformation.financialYearStart')
    .trim()
    .notEmpty().withMessage('Financial year start is required')
    .isIn(FINANCIAL_YEAR_MONTHS).withMessage('Select a valid financial year start month'),

  body('regionalInformation.dateFormat')
    .trim()
    .notEmpty().withMessage('Date format is required')
    .isIn(DATE_FORMATS).withMessage('Select a valid date format'),
];

export const verifyKycFieldValidator = [
  body('field')
    .trim()
    .notEmpty().withMessage('Verification field is required')
    .isIn(['aadhaar', 'pan', 'gst']).withMessage('Invalid verification field'),

  body('number')
    .trim()
    .escape()
    .notEmpty().withMessage('Document number is required')
    .isLength({ min: 4, max: 20 }).withMessage('Enter a valid document number'),
];
