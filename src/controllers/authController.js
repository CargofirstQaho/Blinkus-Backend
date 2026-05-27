import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError }    from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  setCookies, clearCookies, signResetToken, verifyResetToken,
} from '../services/tokenService.js';
import { getTodayUsage } from '../services/usageService.js';
import { getAiDailyLimit } from '../services/subscriptionService.js';
import { sendVerificationEmail } from '../services/email/sendVerificationEmail.js';
import { sendForgotPasswordEmail } from '../services/email/sendForgotPasswordEmail.js';
import { buildGoogleAuthUrl, exchangeCodeForProfile } from '../services/googleAuthService.js';

function usagePayload(user, todayCount) {
  const limit = getAiDailyLimit(user);
  return {
    aiQuestionsToday: todayCount,
    aiQuestionsLimit: limit === Infinity ? null : limit,
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

export const signup = asyncHandler(async (req, res) => {
  const { name, email, mobile, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const otp     = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    name, email, mobile, password,
    otpHash, otpExpiry,
    otpResendCount: 1,
    otpLastResent:  new Date(),
  });

  await sendVerificationEmail(email, otp);

  res.status(201).json(new ApiResponse(201, { email: maskEmail(email) }, 'Verification code sent to your email'));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+otpHash +otpAttempts');
  if (!user) throw new ApiError(404, 'No account found with this email');
  if (user.isVerified) throw new ApiError(400, 'Email is already verified');
  if (!user.otpHash || !user.otpExpiry) throw new ApiError(400, 'No verification code found. Request a new one.');
  if (user.otpAttempts >= 5) throw new ApiError(429, 'Too many incorrect attempts. Please request a new code.');
  if (user.otpExpiry < new Date()) throw new ApiError(400, 'Verification code has expired. Please request a new one.');

  const isMatch = await bcrypt.compare(otp, user.otpHash);
  if (!isMatch) {
    user.otpAttempts += 1;
    await user.save();
    const remaining = 5 - user.otpAttempts;
    throw new ApiError(400, remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many incorrect attempts. Please request a new code.');
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

  res.json(new ApiResponse(200, {
    token,
    user:  user.toSafeObject(),
    usage: usagePayload(user, todayCount),
  }, 'Email verified. Welcome to Blinkus!'));
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).select('+otpResendCount +otpLastResent');
  if (!user) throw new ApiError(404, 'No account found with this email');
  if (user.isVerified) throw new ApiError(400, 'Email is already verified');
  if (user.otpResendCount >= 5) throw new ApiError(429, 'Maximum resend limit reached. Please contact support.');

  if (user.otpLastResent && Date.now() - user.otpLastResent.getTime() < 60 * 1000) {
    const wait = Math.ceil((60 * 1000 - (Date.now() - user.otpLastResent.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${wait} seconds before requesting a new code.`);
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

  res.json(new ApiResponse(200, { resendCount: user.otpResendCount }, 'Verification code resent'));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isVerified === false) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED');
  }

  const [token, refresh, todayCount] = await Promise.all([
    signAccessToken(user._id),
    signRefreshToken(user._id),
    getTodayUsage(user._id),
  ]);
  setCookies(res, refresh);

  res.json(new ApiResponse(200, {
    token,
    user:  user.toSafeObject(),
    usage: usagePayload(user, todayCount),
  }, 'Login successful'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.json(new ApiResponse(200, { email: maskEmail(email) }, 'If this email is registered, a reset code has been sent'));
  }
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email before resetting your password');

  const now = new Date();
  if (user.resetOtpExpiry && user.resetOtpExpiry > now) {
    const lastSent = user.otpLastResent;
    if (lastSent && Date.now() - lastSent.getTime() < 60 * 1000) {
      const wait = Math.ceil((60 * 1000 - (Date.now() - lastSent.getTime())) / 1000);
      throw new ApiError(429, `Please wait ${wait} seconds before requesting a new code.`);
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

  res.json(new ApiResponse(200, { email: maskEmail(email) }, 'Password reset code sent to your email'));
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpAttempts');
  if (!user) throw new ApiError(404, 'No account found with this email');
  if (!user.resetOtpHash || !user.resetOtpExpiry) throw new ApiError(400, 'No reset code found. Request a new one.');
  if (user.resetOtpAttempts >= 5) throw new ApiError(429, 'Too many incorrect attempts. Please request a new reset code.');
  if (user.resetOtpExpiry < new Date()) throw new ApiError(400, 'Reset code has expired. Please request a new one.');

  const isMatch = await bcrypt.compare(otp, user.resetOtpHash);
  if (!isMatch) {
    user.resetOtpAttempts += 1;
    await user.save();
    const remaining = 5 - user.resetOtpAttempts;
    throw new ApiError(400, remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many incorrect attempts. Please request a new reset code.');
  }

  user.resetOtpHash     = undefined;
  user.resetOtpExpiry   = undefined;
  user.resetOtpAttempts = 0;
  await user.save();

  const resetToken = signResetToken(user._id);

  res.json(new ApiResponse(200, { resetToken }, 'Code verified. You may now set a new password.'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, password } = req.body;

  let decoded;
  try {
    decoded = verifyResetToken(resetToken);
  } catch {
    throw new ApiError(400, 'Reset link is invalid or has expired. Please start over.');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.password = password;
  await user.save();

  res.json(new ApiResponse(200, null, 'Password updated successfully. You can now log in.'));
});

export const logout = asyncHandler(async (req, res) => {
  clearCookies(res);
  res.json(new ApiResponse(200, null, 'Logged out'));
});

export const getMe = asyncHandler(async (req, res) => {
  const todayCount = await getTodayUsage(req.user._id);
  res.json(new ApiResponse(200, {
    user:  req.user.toSafeObject(),
    usage: usagePayload(req.user, todayCount),
  }));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token');

  const decoded = verifyRefreshToken(token);
  const user    = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User not found');

  const newAccess  = signAccessToken(user._id);
  const newRefresh = signRefreshToken(user._id);
  setCookies(res, newRefresh);

  res.json(new ApiResponse(200, { token: newAccess }));
});

export const googleRedirect = (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ success: false, message: 'Missing state parameter' });
  const url = buildGoogleAuthUrl(state);
  res.redirect(url);
};

export const googleCallback = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new ApiError(400, 'Authorization code is required');

  let googleProfile;
  try {
    googleProfile = await exchangeCodeForProfile(code);
  } catch (err) {
    throw new ApiError(400, err.message || 'Google authentication failed');
  }

  if (!googleProfile.email || !googleProfile.verified_email) {
    throw new ApiError(400, 'A verified Google email address is required');
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
    });
  }

  const [token, refresh, todayCount] = await Promise.all([
    signAccessToken(user._id),
    signRefreshToken(user._id),
    getTodayUsage(user._id),
  ]);
  setCookies(res, refresh);

  res.json(new ApiResponse(200, {
    token,
    user:  user.toSafeObject(),
    usage: usagePayload(user, todayCount),
  }, 'Google authentication successful'));
});
