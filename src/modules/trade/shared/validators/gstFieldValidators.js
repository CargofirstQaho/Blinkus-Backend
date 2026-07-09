import { body } from 'express-validator';

export function buildGstFieldValidators(prefix) {
  return [
    body(`${prefix}.cgst`)
      .optional({ checkFalsy: true })
      .isNumeric().withMessage('CGST must be a number')
      .custom((val) => parseFloat(val) >= 0).withMessage('CGST must be ≥ 0'),

    body(`${prefix}.sgst`)
      .optional({ checkFalsy: true })
      .isNumeric().withMessage('SGST must be a number')
      .custom((val) => parseFloat(val) >= 0).withMessage('SGST must be ≥ 0'),

    body(`${prefix}.igst`)
      .optional({ checkFalsy: true })
      .isNumeric().withMessage('IGST must be a number')
      .custom((val) => parseFloat(val) >= 0).withMessage('IGST must be ≥ 0'),
  ];
}
