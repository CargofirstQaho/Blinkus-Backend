import { Router } from 'express';
import {
  signup, verifyOtp, resendOtp,
  login, logout, getMe, refresh,
  forgotPassword, verifyResetOtp, resetPassword,
  googleRedirect, googleCallback, acceptTerms,
} from '../controllers/authController.js';
import {
  signupValidator, loginValidator,
  verifyOtpValidator, resendOtpValidator,
  forgotPasswordValidator, verifyResetOtpValidator, resetPasswordValidator,
  acceptTermsValidator,
} from '../validators/authValidator.js';
import { validate } from '../../../middleware/validate.js';
import { protect } from '../../../middleware/auth.js';

const router = Router();

router.post('/signup',            signupValidator,         validate, signup);
router.post('/verify-otp',        verifyOtpValidator,      validate, verifyOtp);
router.post('/resend-otp',        resendOtpValidator,      validate, resendOtp);
router.post('/login',             loginValidator,          validate, login);
router.post('/logout',            logout);
router.get('/me',                 protect, getMe);
router.post('/accept-terms',      protect, acceptTermsValidator, validate, acceptTerms);
router.post('/refresh',           refresh);
router.post('/forgot-password',   forgotPasswordValidator, validate, forgotPassword);
router.post('/verify-reset-otp',  verifyResetOtpValidator, validate, verifyResetOtp);
router.post('/reset-password',    resetPasswordValidator,  validate, resetPassword);

router.get('/google',          googleRedirect);
router.post('/google/callback', googleCallback);

export default router;
