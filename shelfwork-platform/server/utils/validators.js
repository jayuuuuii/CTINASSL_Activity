import { validationError } from './errors.js';

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function ensureBody(body) {
  if (!isPlainObject(body)) throw validationError({ body: 'Request body must be a JSON object.' });
  return body;
}

export const isBlank = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

/** Returns the trimmed string; records a problem in `details` if invalid. */
export function cleanString(details, field, value, { required = false, max = 120, label = field } = {}) {
  if (isBlank(value)) {
    if (required) details[field] = `${label} is required.`;
    return '';
  }
  if (typeof value !== 'string') {
    details[field] = `${label} must be text.`;
    return '';
  }
  const trimmed = value.trim();
  if (trimmed.length > max) details[field] = `${label} must be ${max} characters or fewer.`;
  return trimmed;
}

export function cleanInteger(
  details,
  field,
  value,
  { min = 0, label = field, required = true, defaultValue } = {}
) {
  if (isBlank(value)) {
    if (defaultValue !== undefined) return defaultValue;
    if (required) details[field] = `${label} is required.`;
    return undefined;
  }
  const n = toNumber(value);
  if (!Number.isInteger(n)) {
    details[field] = `${label} must be a whole number.`;
    return undefined;
  }
  if (n < min) {
    details[field] = min === 0 ? `${label} cannot be negative.` : `${label} must be at least ${min}.`;
    return undefined;
  }
  if (n > 1_000_000_000) {
    details[field] = `${label} is too large.`;
    return undefined;
  }
  return n;
}

export function cleanPrice(details, field, value, { label = field } = {}) {
  if (isBlank(value)) {
    details[field] = `${label} is required.`;
    return undefined;
  }
  const n = toNumber(value);
  if (!Number.isFinite(n)) {
    details[field] = `${label} must be a number.`;
    return undefined;
  }
  if (n < 0) {
    details[field] = `${label} cannot be negative.`;
    return undefined;
  }
  if (n > 1_000_000_000) {
    details[field] = `${label} is too large.`;
    return undefined;
  }
  return Math.round(n * 100) / 100;
}

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const isPhone = (s) => /^\+?[0-9()\-\s]+$/.test(s) && s.replace(/\D/g, '').length >= 7 && s.length <= 20;

export function cleanBoolean(details, field, value, { label = field, defaultValue } = {}) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  details[field] = `${label} must be true or false.`;
  return undefined;
}

/** Optional image reference: an uploaded file (/uploads/...) or an http(s) URL. */
export function cleanImageUrl(details, field, value) {
  if (isBlank(value)) return '';
  if (typeof value !== 'string') {
    details[field] = 'Image URL must be text.';
    return '';
  }
  const v = value.trim();
  const local = /^\/uploads\/[A-Za-z0-9_\-./]+$/.test(v) && !v.includes('..');
  const remote = /^https?:\/\/[^\s"'<>]+$/i.test(v);
  if (v.length > 500 || (!local && !remote)) {
    details[field] = 'Image URL must be an uploaded image (/uploads/...) or start with http:// or https://.';
    return '';
  }
  return v;
}

export const isStrongPassword = (s) => typeof s === 'string' && /[A-Za-z]/.test(s) && /[0-9]/.test(s);
