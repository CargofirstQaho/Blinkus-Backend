import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorHandler } from '../../../utils/errorHandler.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  setCookies, setAccessCookie, clearCookies, signResetToken, verifyResetToken,
} from '../services/tokenService.js';
import { getTodayUsage } from '../../chat/services/usageService.js';
import { getAiDailyLimit } from '../../subscription/services/subscriptionService.js';
import { getUsagePeriodLabel, getNextResetDate } from '../../chat/utils/aiUsageUtils.js';
import { FREE_AI_LIMIT_PERIOD } from '../../../config/aiUsageConfig.js';
import { sendVerificationEmail } from '../services/email/sendVerificationEmail.js';
import { sendForgotPasswordEmail } from '../services/email/sendForgotPasswordEmail.js';
import { buildGoogleAuthUrl, exchangeCodeForProfile } from '../services/googleAuthService.js';
import { createAuditLog } from '../../audit/services/auditService.js';
import { AUDIT_ACTIONS, AUDIT_MODULES, AUDIT_STATUS } from '../../audit/constants/auditActions.js';

function usagePayload(user, todayCount) {
  const limit = getAiDailyLimit(user);
  const isUnlimited = limit === Infinity;
  return {
    aiQuestionsToday: todayCount,
    aiQuestionsLimit: isUnlimited ? null : limit,
    periodLabel:      isUnlimited ? null : getUsagePeriodLabel(FREE_AI_LIMIT_PERIOD),
    resetsAt:         isUnlimited ? null : getNextResetDate(FREE_AI_LIMIT_PERIOD).toISOString(),
  };
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function getUserIdFromAccessToken(req) {
  try {
    let token;
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || null;
  } catch {
    return null;
  }
}

export const signup = async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(errorHandler(409, 'Email already registered'));

    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name, email, mobile, password,
      otpHash, otpExpiry,
      otpResendCount: 1,
      otpLastResent:  new Date(),
      termsAcceptance: {
        accepted:    true,
        acceptedAt:  new Date(),
        version:     'v1.0',
        acceptedVia: 'signup',
      },
    });

    await sendVerificationEmail(email, otp);

    await createAuditLog({
      req,
      userId: user._id,
      action: AUDIT_ACTIONS.TERMS_ACCEPTED,
      module: AUDIT_MODULES.LEGAL,
      resourceType: 'LEGAL',
      description: 'Terms of Service and Privacy Policy accepted at signup',
      metadata: { version: 'v1.0', acceptedVia: 'signup' },
    });

    return res.status(201).json({ success: true, message: 'Verification code sent to your email', data: { email: maskEmail(email) } });
  } catch (error) {
    return next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otpHash +otpAttempts');
    if (!user) return next(errorHandler(404, 'No account found with this email'));
    if (user.isVerified) return next(errorHandler(400, 'Email is already verified'));
    if (!user.otpHash || !user.otpExpiry) return next(errorHandler(400, 'No verification code found. Request a new one.'));
    if (user.otpAttempts >= 5) return next(errorHandler(429, 'Too many incorrect attempts. Please request a new code.'));
    if (user.otpExpiry < new Date()) return next(errorHandler(400, 'Verification code has expired. Please request a new one.'));

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      const remaining = 5 - user.otpAttempts;
      return next(errorHandler(400, remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many incorrect attempts. Please request a new code.'));
    }

    user.isVerified    = true;
    user.otpHash       = undefined;
    user.otpExpiry     = undefined;
    user.otpAttempts   = 0;
    user.otpResendCount = 0;
    user.otpLastResent = undefined;
    await user.save();

    const [token, refresh, todayCount] = await Promise.all([
      signAccessToken(user._id),
      signRefreshToken(user._id),
      getTodayUsage(user._id),
    ]);
    setCookies(res, refresh);
    setAccessCookie(res, token);

    await createAuditLog({
      req,
      userId: user._id,
      action: AUDIT_ACTIONS.AUTH_EMAIL_VERIFIED,
      module: AUDIT_MODULES.AUTH,
      description: 'Email verified',
    });

    return res.json({ success: true, message: 'Email verified. Welcome to Blinkus!', data: {
      user:  user.toSafeObject(),
      usage: usagePayload(user, todayCount),
    }});
  } catch (error) {
    return next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+otpResendCount +otpLastResent');
    if (!user) return next(errorHandler(404, 'No account found with this email'));
    if (user.isVerified) return next(errorHandler(400, 'Email is already verified'));
    if (user.otpResendCount >= 5) return next(errorHandler(429, 'Maximum resend limit reached. Please contact support.'));

    if (user.otpLastResent && Date.now() - user.otpLastResent.getTime() < 60 * 1000) {
      const wait = Math.ceil((60 * 1000 - (Date.now() - user.otpLastResent.getTime())) / 1000);
      return next(errorHandler(429, `Please wait ${wait} seconds before requesting a new code.`));
    }

    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    user.otpHash       = otpHash;
    user.otpExpiry     = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts   = 0;
    user.otpResendCount += 1;
    user.otpLastResent = new Date();
    await user.save();

    await sendVerificationEmail(email, otp);

    return res.json({ success: true, message: 'Verification code resent', data: { resendCount: user.otpResendCount } });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && user.provider === 'google' && !user.password) {
      return next(errorHandler(401, 'This account was created using Google Sign-In. Please continue with Google.'));
    }

    if (!user || !(await user.comparePassword(password))) {
      await createAuditLog({
        req,
        userId: user?._id || null,
        action: AUDIT_ACTIONS.AUTH_FAILED_LOGIN,
        module: AUDIT_MODULES.AUTH,
        status: AUDIT_STATUS.FAILURE,
        description: 'Invalid email or password',
        metadata: { email },
      });
      return next(errorHandler(401, 'Invalid email or password'));
    }

    if (user.isVerified === false) {
      await createAuditLog({
        req,
        userId: user._id,
        action: AUDIT_ACTIONS.AUTH_FAILED_LOGIN,
        module: AUDIT_MODULES.AUTH,
        status: AUDIT_STATUS.FAILURE,
        description: 'Login attempt with unverified email',
        metadata: { email },
      });
      return next(errorHandler(403, 'EMAIL_NOT_VERIFIED'));
    }

    const [token, refresh, todayCount] = await Promise.all([
      signAccessToken(user._id),
      signRefreshToken(user._id),
      getTodayUsage(user._id),
    ]);
    setCookies(res, refresh);
    setAccessCookie(res, token);

    await createAuditLog({
      req,
      userId: user._id,
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      module: AUDIT_MODULES.AUTH,
      description: 'User logged in',
    });

    return res.json({ success: true, message: 'Login successful', data: {
      user:  user.toSafeObject(),
      usage: usagePayload(user, todayCount),
    }});
  } catch (error) {
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, a reset code has been sent', data: { email: maskEmail(email) } });
    }
    if (!user.isVerified) return next(errorHandler(403, 'Please verify your email before resetting your password'));
    if (user.provider === 'google' && !user.password) {
      return next(errorHandler(400, 'This account uses Google Sign-In and does not have a local password. Please sign in with Google.'));
    }

    const now = new Date();
    if (user.resetOtpExpiry && user.resetOtpExpiry > now) {
      const lastSent = user.otpLastResent;
      if (lastSent && Date.now() - lastSent.getTime() < 60 * 1000) {
        const wait = Math.ceil((60 * 1000 - (Date.now() - lastSent.getTime())) / 1000);
        return next(errorHandler(429, `Please wait ${wait} seconds before requesting a new code.`));
      }
    }

    const otp          = generateOtp();
    const resetOtpHash = await bcrypt.hash(otp, 10);

    user.resetOtpHash     = resetOtpHash;
    user.resetOtpExpiry   = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.otpLastResent    = new Date();
    await user.save();

    await sendForgotPasswordEmail(email, otp);

    return res.json({ success: true, message: 'Password reset code sent to your email', data: { email: maskEmail(email) } });
  } catch (error) {
    return next(error);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpAttempts');
    if (!user) return next(errorHandler(404, 'No account found with this email'));
    if (!user.resetOtpHash || !user.resetOtpExpiry) return next(errorHandler(400, 'No reset code found. Request a new one.'));
    if (user.resetOtpAttempts >= 5) return next(errorHandler(429, 'Too many incorrect attempts. Please request a new reset code.'));
    if (user.resetOtpExpiry < new Date()) return next(errorHandler(400, 'Reset code has expired. Please request a new one.'));

    const isMatch = await bcrypt.compare(otp, user.resetOtpHash);
    if (!isMatch) {
      user.resetOtpAttempts += 1;
      await user.save();
      const remaining = 5 - user.resetOtpAttempts;
      return next(errorHandler(400, remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many incorrect attempts. Please request a new reset code.'));
    }

    user.resetOtpHash     = undefined;
    user.resetOtpExpiry   = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    const resetToken = signResetToken(user._id);

    return res.json({ success: true, message: 'Code verified. You may now set a new password.', data: { resetToken } });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, password } = req.body;

    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch {
      return next(errorHandler(400, 'Reset link is invalid or has expired. Please start over.'));
    }

    const user = await User.findById(decoded.id);
    if (!user) return next(errorHandler(404, 'User not found'));
    if (user.provider === 'google' && !user.password) {
      return next(errorHandler(400, 'This account uses Google Sign-In and does not support password reset. Please sign in with Google.'));
    }

    user.password = password;
    await user.save();

    await createAuditLog({
      req,
      userId: user._id,
      action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
      module: AUDIT_MODULES.AUTH,
      description: 'Password reset via forgot password flow',
    });

    return res.json({ success: true, message: 'Password updated successfully. You can now log in.', data: null });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearCookies(res);

    await createAuditLog({
      req,
      userId: getUserIdFromAccessToken(req),
      action: AUDIT_ACTIONS.AUTH_LOGOUT,
      module: AUDIT_MODULES.AUTH,
      description: 'User logged out',
    });

    return res.json({ success: true, message: 'Logged out', data: null });
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const todayCount = await getTodayUsage(req.user._id);
    return res.json({ success: true, message: 'Success', data: {
      user:  req.user.toSafeObject(),
      usage: usagePayload(req.user, todayCount),
    }});
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(errorHandler(401, 'No refresh token'));

    const decoded = verifyRefreshToken(token);
    const user    = await User.findById(decoded.id);
    if (!user) return next(errorHandler(401, 'User not found'));

    const newAccess  = signAccessToken(user._id);
    const newRefresh = signRefreshToken(user._id);
    setCookies(res, newRefresh);
    setAccessCookie(res, newAccess);

    return res.json({ success: true, message: 'Success', data: null });
  } catch (error) {
    return next(error);
  }
};

export const googleRedirect = (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ success: false, message: 'Missing state parameter' });
  const url = buildGoogleAuthUrl(state);
  res.redirect(url);
};

export const googleCallback = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return next(errorHandler(400, 'Authorization code is required'));

    let googleProfile;
    try {
      googleProfile = await exchangeCodeForProfile(code);
    } catch (err) {
      return next(errorHandler(400, err.message || 'Google authentication failed'));
    }

    if (!googleProfile.email || !googleProfile.verified_email) {
      return next(errorHandler(400, 'A verified Google email address is required'));
    }

    let user = await User.findOne({
      $or: [{ googleId: googleProfile.id }, { email: googleProfile.email }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId   = googleProfile.id;
        user.isVerified = true;
        if (!user.avatar && googleProfile.picture) user.avatar = googleProfile.picture;
        await user.save();
      }
    } else {
      user = await User.create({
        name:       googleProfile.name || googleProfile.email.split('@')[0],
        email:      googleProfile.email,
        googleId:   googleProfile.id,
        avatar:     googleProfile.picture || '',
        isVerified: true,
        provider:   'google',
        termsAcceptance: {
          accepted:    true,
          acceptedAt:  new Date(),
          version:     'v1.0',
          acceptedVia: 'google-auth',
        },
      });

      await createAuditLog({
        req,
        userId: user._id,
        action: AUDIT_ACTIONS.TERMS_ACCEPTED,
        module: AUDIT_MODULES.LEGAL,
        resourceType: 'LEGAL',
        description: 'Terms of Service and Privacy Policy accepted via Google signup',
        metadata: { version: 'v1.0', acceptedVia: 'google-auth' },
      });
    }

    const [token, refresh, todayCount] = await Promise.all([
      signAccessToken(user._id),
      signRefreshToken(user._id),
      getTodayUsage(user._id),
    ]);
    setCookies(res, refresh);
    setAccessCookie(res, token);

    await createAuditLog({
      req,
      userId: user._id,
      action: AUDIT_ACTIONS.AUTH_GOOGLE_LOGIN,
      module: AUDIT_MODULES.AUTH,
      description: 'User logged in with Google',
    });

    return res.json({ success: true, message: 'Google authentication successful', data: {
      user:  user.toSafeObject(),
      usage: usagePayload(user, todayCount),
    }});
  } catch (error) {
    return next(error);
  }
};

export const acceptTerms = async (req, res, next) => {
  try {
    const user = req.user;

    user.termsAcceptance = {
      accepted:    true,
      acceptedAt:  new Date(),
      version:     'v1.0',
      acceptedVia: 'policy-update',
    };
    await user.save();

    await createAuditLog({
      req,
      userId: user._id,
      action: AUDIT_ACTIONS.TERMS_ACCEPTED_POLICY_UPDATE,
      module: AUDIT_MODULES.LEGAL,
      resourceType: 'LEGAL',
      description: 'Terms of Service and Privacy Policy accepted (policy update)',
      metadata: { version: 'v1.0' },
    });

    return res.json({ success: true, message: 'Terms accepted', data: { user: user.toSafeObject() } });
  } catch (error) {
    return next(error);
  }
};
