import jwt from 'jsonwebtoken';
import User from '../modules/auth/models/User.js';
import { errorHandler } from '../utils/errorHandler.js';

const TERMS_EXEMPT_PATHS = ['/api/auth/me', '/api/auth/accept-terms'];

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(errorHandler(401, 'Not authenticated'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(errorHandler(401, 'User no longer exists'));

    const requestPath = `${req.baseUrl}${req.path}`;
    if (!user.termsAcceptance?.accepted && !TERMS_EXEMPT_PATHS.includes(requestPath)) {
      return next(errorHandler(403, 'TERMS_NOT_ACCEPTED'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(error);
  }
};
