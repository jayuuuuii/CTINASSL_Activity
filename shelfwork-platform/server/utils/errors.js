export class AppError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const validationError = (details) =>
  new AppError(400, 'Validation failed.', 'VALIDATION_ERROR', details);

export const notFound = (entity) => new AppError(404, `${entity} not found.`, 'NOT_FOUND');

export const conflict = (message, code = 'CONFLICT', details = null) =>
  new AppError(409, message, code, details);

export const storageError = (message = 'The data files could not be read or written.', cause) => {
  const err = new AppError(500, message, 'STORAGE_ERROR');
  if (cause) err.cause = cause;
  return err;
};

/** Throw a validation error if any field problems were collected. */
export function throwIfInvalid(details) {
  if (Object.keys(details).length > 0) throw validationError(details);
}
