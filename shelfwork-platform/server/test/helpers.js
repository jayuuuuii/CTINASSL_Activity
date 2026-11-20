import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSampleData, SAMPLE_ACCOUNTS } from '../scripts/sampleData.js';

export { SAMPLE_ACCOUNTS };
export const CUSTOMER = { email: 'andrea@example.com', password: SAMPLE_ACCOUNTS.customerPassword };
export const PRD = (n) => `PRD-${String(n).padStart(8, '0')}`;

/**
 * Start the real app on a random port with a fresh copy of the sample data.
 * Each test file runs in its own process, so its data never leaks into another file.
 */
export async function startServer() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shelfwork-'));
  const dataDir = path.join(root, 'data');
  const uploadsDir = path.join(root, 'uploads');
  process.env.DATA_DIR = dataDir;
  process.env.UPLOADS_DIR = uploadsDir;
  process.env.AUTH_SECRET = 'test-secret-not-for-production';
  await writeSampleData({ dataDir, uploadsDir });

  const { createApp } = await import('../app.js');
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function request(method, url, { body, token, headers = {} } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON (e.g. images) */
    }
    return { status: res.status, body: json, text, headers: res.headers };
  }

  const api = {
    base,
    dataDir,
    uploadsDir,
    request,
    get: (url, opts) => request('GET', url, opts),
    post: (url, body, opts = {}) => request('POST', url, { ...opts, body }),
    put: (url, body, opts = {}) => request('PUT', url, { ...opts, body }),
    del: (url, opts) => request('DELETE', url, opts),
    readJson: (name) => JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8')),
    async login(email, password) {
      const r = await request('POST', '/api/auth/login', { body: { email, password } });
      if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.text}`);
      return r.body.data.token;
    },
    adminToken: () => api.login(SAMPLE_ACCOUNTS.admin.email, SAMPLE_ACCOUNTS.admin.password),
    customerToken: (email = CUSTOMER.email) => api.login(email, SAMPLE_ACCOUNTS.customerPassword),
    close: () => new Promise((r) => server.close(r)),
  };
  return api;
}

let keyCounter = 0;
export const newKey = () => `test-key-${Date.now()}-${++keyCounter}`;

export const checkout = {
  fullName: 'Andrea Bautista',
  email: 'andrea@example.com',
  phone: '+63 917 123 4501',
  address: 'Unit 4B, 21 Kalayaan Ave, Diliman, Quezon City',
  paymentMethod: 'COD',
};

/** Every product's quantity must equal the end of its own transaction chain. */
export function assertLedgerConsistent(assert, products, transactions) {
  for (const p of products) {
    const history = transactions
      .filter((t) => t.productId === p.productId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.transactionId.localeCompare(b.transactionId));
    let running = 0;
    for (const t of history) {
      assert.equal(t.previousQuantity, running, `${p.productName}: chain broken at ${t.transactionId}`);
      running = t.type === 'OUT' ? running - t.quantity : t.type === 'IN' ? running + t.quantity : t.newQuantity;
      assert.equal(t.newQuantity, running, `${p.productName}: wrong newQuantity at ${t.transactionId}`);
      assert.ok(running >= 0, `${p.productName}: negative stock`);
    }
    assert.equal(running, p.quantity, `${p.productName}: history does not add up`);
  }
}
