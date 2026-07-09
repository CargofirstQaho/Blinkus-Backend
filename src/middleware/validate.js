import { validationResult } from 'express-validator';
import { errorHandler } from '../utils/errorHandler.js';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(errorHandler(400, messages[0]));
  }
  next();
}
