import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { generateId, PREFIX } from '../utils/ids.js';
import { AppError, conflict, notFound, throwIfInvalid } from '../utils/errors.js';
import { cleanString, ensureBody, isEmail, isPhone, isStrongPassword } from '../utils/validators.js';
import { createToken, fakePasswordCheck, hashPassword, safeUser, verifyPassword } from '../utils/auth.js';
import { clearFailures, isLocked, recordFailure } from '../utils/loginThrottle.js';
import { AUTH } from '../config.js';

function cleanContact(details, input, { requirePhone = false } = {}) {
  const fullName = cleanString(details, 'fullName', input.fullName, { required: true, max: 120, label: 'Full name' });
  const phone = cleanString(details, 'phone', input.phone, { required: requirePhone, max: 20, label: 'Contact number' });
  if (phone && !details.phone && !isPhone(phone))
    details.phone = 'Enter a valid contact number (digits, spaces, + ( ) - only, at least 7 digits).';
  const address = cleanString(details, 'address', input.address, { max: 250, label: 'Address' });
  return { fullName, phone, address };
}

export function register(body) {
  return withLock(async () => {
    ensureBody(body);
    const details = {};
    const contact = cleanContact(details, body);
    const email = cleanString(details, 'email', body.email, { required: true, max: 120, label: 'Email' }).toLowerCase();
    if (email && !details.email && !isEmail(email)) details.email = 'Enter a valid email address.';

    const password = typeof body.password === 'string' ? body.password : '';
    if (!password) details.password = 'Password is required.';
    else if (password.length < AUTH.minPasswordLength || password.length > 128)
      details.password = `Password must be ${AUTH.minPasswordLength} to 128 characters.`;
    else if (!isStrongPassword(password)) details.password = 'Password must contain at least one letter and one number.';
    throwIfInvalid(details);

    const users = await readCollection('users');
    if (users.some((u) => u.email === email)) throw conflict('An account with this email already exists.', 'DUPLICATE_EMAIL');

    const now = new Date().toISOString();
    const user = {
      userId: generateId(PREFIX.user, users.map((u) => u.userId)),
      ...contact,
      email,
      passwordHash: await hashPassword(password),
      role: 'customer', // admin accounts can't be created through public registration
      status: 'active',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    await writeCollections({ users: [...users, user] });
    return { user: safeUser(user), ...createToken(user) };
  });
}

/** `expectedRole` lets the admin login page refuse customer accounts (and vice versa). */
export async function login(body, { expectedRole } = {}) {
  ensureBody(body);
  const details = {};
  const email = cleanString(details, 'email', body.email, { required: true, label: 'Email' }).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) details.password = 'Password is required.';
  throwIfInvalid(details);

  const minutes = isLocked(email);
  if (minutes)
    throw new AppError(429, `Too many failed attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`, 'TOO_MANY_ATTEMPTS');

  const user = (await readCollection('users')).find((u) => u.email === email);
  const ok = user ? await verifyPassword(password, user.passwordHash) : await fakePasswordCheck();
  if (!ok) {
    recordFailure(email);
    throw new AppError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  if (expectedRole && user.role !== expectedRole)
    throw new AppError(403, expectedRole === 'admin' ? 'This account does not have admin access.' : 'Admins sign in on the admin login page.', 'FORBIDDEN');
  if (user.status !== 'active') throw new AppError(403, 'This account has been disabled. Contact the store.', 'ACCOUNT_DISABLED');
  clearFailures(email);

  return withLock(async () => {
    const users = await readCollection('users');
    const now = new Date().toISOString();
    const current = users.find((u) => u.userId === user.userId);
    const updated = { ...current, lastLoginAt: now };
    await writeCollections({ users: users.map((u) => (u.userId === user.userId ? updated : u)) });
    return { user: safeUser(updated), ...createToken(updated) };
  });
}

/** Logging out invalidates every token issued to this user so far (all devices). */
export function logout(userId) {
  return withLock(async () => {
    const users = await readCollection('users');
    if (!users.some((u) => u.userId === userId)) throw notFound('User');
    await writeCollections({
      users: users.map((u) => (u.userId === userId ? { ...u, tokenVersion: (u.tokenVersion || 0) + 1 } : u)),
    });
    return { loggedOut: true };
  });
}

export async function getProfile(userId) {
  const user = (await readCollection('users')).find((u) => u.userId === userId);
  if (!user) throw notFound('User');
  return safeUser(user);
}

export function updateProfile(userId, body) {
  return withLock(async () => {
    ensureBody(body);
    const users = await readCollection('users');
    const current = users.find((u) => u.userId === userId);
    if (!current) throw notFound('User');
    const details = {};
    const contact = cleanContact(details, { ...current, ...body });
    throwIfInvalid(details);
    const updated = { ...current, ...contact, updatedAt: new Date().toISOString() };
    await writeCollections({ users: users.map((u) => (u.userId === userId ? updated : u)) });
    return safeUser(updated);
  });
}

/**
 * Make sure at least one admin exists. If none does and ADMIN_EMAIL / ADMIN_PASSWORD are set,
 * create that admin. Returns true when an admin account is available.
 */
export function ensureAdminAccount() {
  return withLock(async () => {
    const users = await readCollection('users');
    if (users.some((u) => u.role === 'admin')) return true;
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!isEmail(email) || password.length < AUTH.minPasswordLength) return false;
    const now = new Date().toISOString();
    const admin = {
      userId: generateId(PREFIX.user, users.map((u) => u.userId)),
      fullName: 'Store Administrator',
      email,
      phone: '',
      address: '',
      passwordHash: await hashPassword(password),
      role: 'admin',
      status: 'active',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    await writeCollections({ users: [...users, admin] });
    return true;
  });
}
