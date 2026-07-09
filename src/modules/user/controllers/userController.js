import User from '../../../modules/auth/models/User.js';
import { errorHandler } from '../../../utils/errorHandler.js';

export const getProfile = async (req, res, next) => {
  try {
    return res.json({ success: true, message: 'Success', data: { user: req.user.toSafeObject() } });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'mobile', 'company', 'avatar', 'country', 'tradeSector'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return res.json({ success: true, message: 'Profile updated', data: { user: user.toSafeObject() } });
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) return next(errorHandler(400, 'Current password is required'));
    if (!newPassword) return next(errorHandler(400, 'New password is required'));
    if (newPassword.length < 8) return next(errorHandler(400, 'Password must be at least 8 characters'));

    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) return next(errorHandler(400, 'No password set. Use set password instead.'));
    if (!(await user.comparePassword(currentPassword))) {
      return next(errorHandler(401, 'Current password is incorrect'));
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Password updated', data: null });
  } catch (error) {
    return next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return next(errorHandler(400, 'Password is required'));
    if (password.length < 8) return next(errorHandler(400, 'Password must be at least 8 characters'));

    const user = await User.findById(req.user._id).select('+password');
    if (user.password) return next(errorHandler(400, 'Password already set. Use change password instead.'));

    user.password = password;
    await user.save();

    return res.json({ success: true, message: 'Password set successfully', data: null });
  } catch (error) {
    return next(error);
  }
};
