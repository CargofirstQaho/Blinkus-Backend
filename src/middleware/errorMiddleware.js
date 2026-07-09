export function errorMiddleware(err, req, res, next) {
  if (err.statusCode) {
    const body = { success: false, message: err.message };
    if (err.errorCode) body.code = err.errorCode;
    return res.status(err.statusCode).json(body);
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already in use` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}
