import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found.`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on the server.';
  let details;

  if (err instanceof AppError) {
    status = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details || undefined;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large.';
  }

  if (status >= 500) console.error(err);

  const error = { code, message };
  if (details) error.details = details;
  res.status(status).json({ success: false, error });
}
