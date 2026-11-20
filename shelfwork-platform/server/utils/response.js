/** Every successful response has the same envelope: { success, message?, data, meta? } */
export function sendSuccess(res, data, { status = 200, message, meta } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/** Express 4 does not catch rejected promises, so wrap async handlers. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
