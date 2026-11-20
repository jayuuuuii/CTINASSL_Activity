import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, SAMPLE_ACCOUNTS } from './helpers.js';

let api;
before(async () => (api = await startServer()));
after(() => api.close());

test('customer can register; password is hashed and never returned', async () => {
  const r = await api.post('/api/auth/register', {
    fullName: 'Lea Navarro', email: 'Lea@Example.com', password: 'secret123', phone: '+63 917 000 1111', address: 'Pasig City',
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.user.role, 'customer');
  assert.equal(r.body.data.user.email, 'lea@example.com');
  assert.ok(r.body.data.token);
  assert.equal(r.body.data.user.passwordHash, undefined);

  const stored = api.readJson('users').find((u) => u.email === 'lea@example.com');
  assert.notEqual(stored.passwordHash, 'secret123');
  assert.match(stored.passwordHash, /^scrypt\$/);
});

test('registration validates input and refuses duplicate emails', async () => {
  const weak = await api.post('/api/auth/register', { fullName: 'X', email: 'x@example.com', password: 'short' });
  assert.equal(weak.status, 400);
  assert.ok(weak.body.error.details.password);

  const noNumber = await api.post('/api/auth/register', { fullName: 'X', email: 'x@example.com', password: 'onlyletters' });
  assert.equal(noNumber.status, 400);

  const dupe = await api.post('/api/auth/register', { fullName: 'Copy', email: 'andrea@example.com', password: 'secret123' });
  assert.equal(dupe.status, 409);
  assert.equal(dupe.body.error.code, 'DUPLICATE_EMAIL');

  const sneaky = await api.post('/api/auth/register', { fullName: 'Eve', email: 'eve@example.com', password: 'secret123', role: 'admin' });
  assert.equal(sneaky.status, 201);
  assert.equal(sneaky.body.data.user.role, 'customer', 'registration must never create admins');
});

test('login works for customers and admins; wrong passwords are refused', async () => {
  const c = await api.post('/api/auth/login', { email: 'andrea@example.com', password: SAMPLE_ACCOUNTS.customerPassword });
  assert.equal(c.status, 200);
  assert.equal(c.body.data.user.role, 'customer');

  const a = await api.post('/api/auth/login', { ...SAMPLE_ACCOUNTS.admin });
  assert.equal(a.status, 200);
  assert.equal(a.body.data.user.role, 'admin');

  const wrong = await api.post('/api/auth/login', { email: 'andrea@example.com', password: 'nope12345' });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS');

  const unknown = await api.post('/api/auth/login', { email: 'nobody@example.com', password: 'nope12345' });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.error.message, wrong.body.error.message, 'unknown and wrong-password answers must look the same');
});

test('admin login page refuses customer accounts (role check)', async () => {
  const r = await api.post('/api/auth/admin/login', { email: 'andrea@example.com', password: SAMPLE_ACCOUNTS.customerPassword });
  assert.equal(r.status, 403);
  const r2 = await api.post('/api/auth/login', { email: 'andrea@example.com', password: SAMPLE_ACCOUNTS.customerPassword, role: 'admin' });
  assert.equal(r2.status, 403);
});

test('disabled accounts cannot log in', async () => {
  const r = await api.post('/api/auth/login', { email: 'paolo@example.com', password: SAMPLE_ACCOUNTS.customerPassword });
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'ACCOUNT_DISABLED');
});

test('profile requires a valid token; tampered tokens are rejected', async () => {
  assert.equal((await api.get('/api/auth/profile')).status, 401);
  const token = await api.customerToken();
  const ok = await api.get('/api/auth/profile', { token });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.email, 'andrea@example.com');
  assert.equal(ok.body.data.passwordHash, undefined);

  const [h, p] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), role: 'admin' })).toString('base64url');
  assert.equal((await api.get('/api/auth/profile', { token: `${h}.${forged}.${token.split('.')[2]}` })).status, 401);
  assert.equal((await api.get('/api/auth/profile', { token: 'garbage' })).status, 401);
});

test('profile can be updated', async () => {
  const token = await api.customerToken();
  const r = await api.put('/api/auth/profile', { phone: '+63 917 999 0000', email: 'hacker@example.com' }, { token });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.phone, '+63 917 999 0000');
  assert.equal(r.body.data.email, 'andrea@example.com', 'email is not changeable here');
});

test('logout invalidates the token', async () => {
  const token = await api.customerToken();
  assert.equal((await api.post('/api/auth/logout', undefined, { token })).status, 200);
  const after = await api.get('/api/auth/profile', { token });
  assert.equal(after.status, 401);
});

test('repeated failed logins lock the account briefly', async () => {
  for (let i = 0; i < 5; i++) await api.post('/api/auth/login', { email: 'miguel@example.com', password: 'wrongpass1' });
  const locked = await api.post('/api/auth/login', { email: 'miguel@example.com', password: SAMPLE_ACCOUNTS.customerPassword });
  assert.equal(locked.status, 429);
  assert.equal(locked.body.error.code, 'TOO_MANY_ATTEMPTS');
});
