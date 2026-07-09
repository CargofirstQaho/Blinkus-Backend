import { body } from 'express-validator';

export const signupValidator = [
  body('name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 80 }),
  body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^\+?[\d\s\-]{7,15}$/)
    .withMessage('Enter a valid mobile number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('termsAccepted')
    .custom((value) => value === true)
    .withMessage('You must agree to the Terms of Service and Privacy Policy'),
];

export const acceptTermsValidator = [
  body('termsOfService')
    .custom((value) => value === true)
    .withMessage('You must agree to the Terms of Service'),
  body('privacyPolicy')
    .custom((value) => value === true)
    .withMessage('You must agree to the Privacy Policy'),
];

export const loginValidator = [
  body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const verifyOtpValidator = [
  body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
];

export const resendOtpValidator = [
  body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
];

export const forgotPasswordValidator = [
  body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
];

export const verifyResetOtpValidator = [
  body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
];

export const resetPasswordValidator = [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];
