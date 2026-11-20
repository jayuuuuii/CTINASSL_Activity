import { AppError } from '../utils/errors.js';
import { isValidId } from '../utils/ids.js';

/** Reject malformed IDs (400) before a controller runs. */
export const validateId = (prefix, label, param = 'id') => (req, res, next) => {
  if (isValidId(prefix, req.params[param])) return next();
  next(new AppError(400, `Invalid ${label} ID. Expected the format ${prefix}-xxxxxxxx.`, 'INVALID_ID'));
};
