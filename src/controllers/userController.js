import User from '../models/User.js';
import { ApiError }    from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, { user: req.user.toSafeObject() }));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'mobile', 'company', 'avatar', 'country', 'tradeSector'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json(new ApiResponse(200, { user: user.toSafeObject() }, 'Profile updated'));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Both passwords required');
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!user.password) throw new ApiError(400, 'No password set. Use set password instead.');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json(new ApiResponse(200, null, 'Password updated'));
});

export const setPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (user.password) throw new ApiError(400, 'Password already set. Use change password instead.');

  user.password = password;
  await user.save();

  res.json(new ApiResponse(200, null, 'Password set successfully'));
});
