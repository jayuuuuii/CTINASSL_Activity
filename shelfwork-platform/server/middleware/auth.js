import { AppError } from '../utils/errors.js';
import { verifyToken, safeUser } from '../utils/auth.js';
import { readCollection } from '../utils/fileStore.js';

function bearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Look up the user behind the request's token. Returns { user } or { error }. */
async function resolve(req) {
  const token = bearer(req);
  if (!token) return { error: 'missing' };
  const payload = verifyToken(token);
  if (!payload) return { error: 'invalid' };
  const user = (await readCollection('users')).find((u) => u.userId === payload.sub);
  // A logout bumps tokenVersion, which invalidates every token issued before it.
  if (!user || (user.tokenVersion || 0) !== payload.ver) return { error: 'invalid' };
  if (user.status !== 'active') return { error: 'disabled' };
  return { user: safeUser(user) };
}

/** Require a valid login. Sets req.user. */
export async function authenticate(req, res, next) {
  try {
    const { user, error } = await resolve(req);
    if (error === 'disabled') throw new AppError(403, 'This account has been disabled. Contact the store.', 'ACCOUNT_DISABLED');
    if (!user)
      throw new AppError(401, error === 'missing' ? 'Please log in to continue.' : 'Your session has expired. Please log in again.', 'UNAUTHENTICATED');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Use the login if there is a valid one; otherwise continue as a guest. */
export async function optionalAuth(req, res, next) {
  try {
    const { user } = await resolve(req);
    req.user = user || null;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) return next();
  next(new AppError(403, 'You do not have permission to do that.', 'FORBIDDEN'));
};

export const requireAdmin = [authenticate, requireRole('admin')];
export const requireCustomer = [authenticate, requireRole('customer')];
