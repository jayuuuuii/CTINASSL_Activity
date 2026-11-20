import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { dataDir } from './fileStore.js';
import { AUTH } from '../config.js';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

/* ---------- Passwords (scrypt, random salt per password) ---------- */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, saltHex, keyHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = await scrypt(String(password), Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  const expected = Buffer.from(keyHex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

/** Spend the same time as a real check, so unknown emails can't be detected by timing. */
export async function fakePasswordCheck() {
  await scrypt('placeholder', Buffer.alloc(16), KEY_LENGTH);
  return false;
}

/* ---------- Signing secret ----------
   AUTH_SECRET from the environment wins. Otherwise a random secret is created once
   and kept in data/auth-secret.key, so logins survive a server restart. */
const secrets = new Map();
function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = path.join(dataDir(), 'auth-secret.key');
  if (secrets.has(file)) return secrets.get(file);
  let secret;
  try {
    secret = fs.readFileSync(file, 'utf8').trim();
  } catch {
    /* create below */
  }
  if (!secret) {
    secret = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
  }
  secrets.set(file, secret);
  return secret;
}

/* ---------- Tokens: standard HS256 JSON Web Tokens ---------- */
const b64url = (input) => Buffer.from(input).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

export function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + AUTH.tokenTtlHours * 3600;
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: user.userId, role: user.role, ver: user.tokenVersion || 0, iat: now, exp }));
  const token = `${header}.${payload}.${sign(`${header}.${payload}`)}`;
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/** Returns the payload, or null if the token is malformed, tampered with or expired. */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.exp !== 'number' || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Never send password hashes or token versions to a client. */
export function safeUser(user) {
  if (!user) return null;
  const { passwordHash, tokenVersion, ...rest } = user;
  return rest;
}
