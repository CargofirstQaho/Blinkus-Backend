import jwt from 'jsonwebtoken';

export function signAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

export function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_SECRET);
}

export function signResetToken(userId) {
  return jwt.sign({ id: userId, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

export function verifyResetToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'password_reset') throw new Error('Invalid token purpose');
  return decoded;
}

export function setCookies(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

export function setAccessCookie(res, accessToken) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   15 * 60 * 1000,
  });
}

export function clearCookies(res) {
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  res.clearCookie('accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
}
