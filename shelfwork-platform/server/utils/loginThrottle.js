import { AUTH } from '../config.js';

/** In-memory brute-force guard: too many failed logins for one email locks it briefly. */
const failures = new Map(); // key -> { count, until }

const keyFor = (email) => String(email || '').trim().toLowerCase();

export function isLocked(email) {
  const entry = failures.get(keyFor(email));
  if (!entry || !entry.until) return 0;
  const left = entry.until - Date.now();
  if (left <= 0) {
    failures.delete(keyFor(email));
    return 0;
  }
  return Math.ceil(left / 60000);
}

export function recordFailure(email) {
  const key = keyFor(email);
  const entry = failures.get(key) || { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= AUTH.maxLoginFailures) entry.until = Date.now() + AUTH.lockoutMinutes * 60000;
  failures.set(key, entry);
}

export const clearFailures = (email) => failures.delete(keyFor(email));
export const resetThrottle = () => failures.clear();
