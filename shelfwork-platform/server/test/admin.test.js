import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, PRD, assertLedgerConsistent } from './helpers.js';

let api;
let admin;
let customer;
before(async () => {
  api = await startServer();
  admin = await api.adminToken();
  customer = await api.customerToken();
});
after(() => api.close());

test('admin endpoints reject guests (401) and customers (403)', async () => {
  const routes = [
    ['get', '/api/admin/dashboard'], ['get', '/api/admin/orders'], ['get', '/api/admin/customers'],
    ['get', '/api/admin/inventory'], ['get', '/api/admin/transactions'], ['get', '/api/suppliers'],
    ['get', '/api/stock/low'], ['get', '/api/dashboard/stats'], ['post', '/api/products'],
    ['post', '/api/categories'], ['post', '/api/stock/in'], ['put', `/api/products/${PRD(1)}`],
    ['delete', `/api/products/${PRD(1)}`],
  ];
  for (const [method, url] of routes) {
    const call = method === 'get' ? api.get : method === 'delete' ? api.del : (u, o) => api[method](u, {}, o);
    assert.equal((await call(url)).status, 401, `guest ${method} ${url}`);
    assert.equal((await call(url, { token: customer })).status, 403, `customer ${method} ${url}`);
  }
});

test('dashboard figures come from the stored records', async () => {
  const r = await api.get('/api/admin/dashboard', { token: admin });
  assert.equal(r.status, 200);
  const d = r.body.data;
  const products = api.readJson('products');
  const orders = api.readJson('orders');
  assert.equal(d.totalProducts, products.length);
  assert.equal(d.availableStockUnits, products.reduce((s, p) => s + p.quantity, 0));
  assert.equal(d.outOfStockItems, products.filter((p) => p.quantity === 0).length);
  assert.equal(d.lowStockItems, products.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold).length);
  assert.equal(d.totalOrders, orders.length);
  assert.equal(d.pendingOrders, orders.filter((o) => o.status === 'Pending').length);
  assert.equal(d.totalSales, orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0));
  assert.ok(d.recentOrders.length > 0 && d.recentTransactions.length > 0);
});

test('product CRUD with availability, featured flag and validation', async () => {
  const body = { productName: 'Bamboo Serving Tray', category: 'Kitchen & Pantry', supplier: 'Harbor Housewares', price: 560, quantity: 12, lowStockThreshold: 4, isFeatured: true };
  const created = await api.post('/api/products', body, { token: admin });
  assert.equal(created.status, 201, created.text);
  const p = created.body.data;
  assert.equal(p.isAvailable, true);
  assert.equal(p.isFeatured, true);
  assert.ok((await api.get('/api/products?search=bamboo')).body.data.length === 1, 'new product appears in the shop');

  const hidden = await api.put(`/api/products/${p.productId}`, { isAvailable: false, price: 590 }, { token: admin });
  assert.equal(hidden.body.data.isAvailable, false);
  assert.equal(hidden.body.data.price, 590);
  assert.equal((await api.get('/api/products?search=bamboo')).body.data.length, 0, 'disabled product leaves the shop');

  assert.equal((await api.post('/api/products', { ...body, price: -1 }, { token: admin })).status, 400);
  assert.equal((await api.post('/api/products', { ...body, productName: 'x', category: 'Nope' }, { token: admin })).status, 400);
  assert.equal((await api.post('/api/products', body, { token: admin })).status, 409);
  assert.equal((await api.post('/api/products', { ...body, productName: 'Y', imageUrl: 'javascript:alert(1)' }, { token: admin })).status, 400);

  assert.equal((await api.del(`/api/products/${p.productId}`, { token: admin })).status, 200);
  assert.equal((await api.get(`/api/products/${p.productId}`, { token: admin })).status, 404);
});

test('product image upload: accepts real images, rejects disguised files and replaces old ones', async () => {
  // 1x1 transparent PNG
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const r = await api.put(`/api/products/${PRD(2)}/image`, { image: png }, { token: admin });
  assert.equal(r.status, 200, r.text);
  const url = r.body.data.imageUrl;
  assert.match(url, /^\/uploads\/products\/PRD-00000002-[0-9a-f]{8}\.png$/);
  assert.equal((await api.get(url)).status, 200);
  assert.ok(!fs.existsSync(path.join(api.uploadsDir, 'products', 'PRD-00000002.svg')), 'old image file is removed');

  const fake = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');
  assert.equal((await api.put(`/api/products/${PRD(2)}/image`, { image: fake }, { token: admin })).status, 400);
  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64');
  assert.equal((await api.put(`/api/products/${PRD(2)}/image`, { image: svg }, { token: admin })).status, 400);
  assert.equal((await api.put(`/api/products/${PRD(2)}/image`, { image: png }, { token: customer })).status, 403);

  const removed = await api.del(`/api/products/${PRD(2)}/image`, { token: admin });
  assert.equal(removed.body.data.imageUrl, '');
});

test('category CRUD; deleting a category in use is refused', async () => {
  const c = await api.post('/api/categories', { categoryName: 'Cleaning', description: 'Soap and tools' }, { token: admin });
  assert.equal(c.status, 201);
  assert.equal((await api.post('/api/categories', { categoryName: 'cleaning' }, { token: admin })).status, 409);
  const u = await api.put(`/api/categories/${c.body.data.categoryId}`, { description: 'Updated' }, { token: admin });
  assert.equal(u.body.data.description, 'Updated');
  assert.equal((await api.del('/api/categories/CAT-00000001', { token: admin })).body.error.code, 'CATEGORY_IN_USE');
  assert.equal((await api.del(`/api/categories/${c.body.data.categoryId}`, { token: admin })).status, 200);
});

test('supplier CRUD with validation; renaming follows through to products', async () => {
  const s = await api.post('/api/suppliers', { supplierName: 'Clean Co.', contactPerson: 'Ana', email: 'ana@clean.example', phone: '+63 900 111 2222' }, { token: admin });
  assert.equal(s.status, 201);
  const bad = await api.post('/api/suppliers', { supplierName: 'X', contactPerson: 'Y', email: 'bad', phone: 'abc' }, { token: admin });
  assert.ok(bad.body.error.details.email && bad.body.error.details.phone);
  assert.equal((await api.del('/api/suppliers/SUP-00000001', { token: admin })).body.error.code, 'SUPPLIER_IN_USE');

  await api.put('/api/suppliers/SUP-00000007', { supplierName: 'Volt Distribution Inc.' }, { token: admin });
  const p = await api.get(`/api/products/${PRD(9)}`, { token: admin });
  assert.equal(p.body.data.supplier, 'Volt Distribution Inc.');
  assert.equal((await api.del(`/api/suppliers/${s.body.data.supplierId}`, { token: admin })).status, 200);
});

test('stock in, stock out and manual adjustment are all recorded with who did them', async () => {
  const start = (await api.get(`/api/products/${PRD(13)}`, { token: admin })).body.data.quantity;
  const inn = await api.post('/api/stock/in', { productId: PRD(13), quantity: 40, reason: 'Delivery' }, { token: admin });
  assert.equal(inn.status, 201);
  assert.equal(inn.body.data.transaction.performedBy, 'USR-00000001');
  const out = await api.post('/api/stock/out', { productId: PRD(13), quantity: 10 }, { token: admin });
  assert.equal(out.body.data.product.quantity, start + 30);
  const tooMuch = await api.post('/api/stock/out', { productId: PRD(13), quantity: 99999 }, { token: admin });
  assert.equal(tooMuch.body.error.code, 'INSUFFICIENT_STOCK');

  const adj = await api.post('/api/stock/adjust', { productId: PRD(13), newQuantity: 250, reason: 'Stocktake' }, { token: admin });
  assert.equal(adj.status, 201);
  assert.equal(adj.body.data.transaction.type, 'ADJUSTMENT');
  assert.equal(adj.body.data.transaction.previousQuantity, start + 30);
  assert.equal(adj.body.data.product.quantity, 250);
  assert.equal((await api.post('/api/stock/adjust', { productId: PRD(13), newQuantity: 250, reason: 'x' }, { token: admin })).body.error.code, 'NO_CHANGE');
  assert.equal((await api.post('/api/stock/adjust', { productId: PRD(13), newQuantity: -1, reason: 'x' }, { token: admin })).status, 400);
  assert.equal((await api.post('/api/stock/adjust', { productId: PRD(13), newQuantity: 5 }, { token: admin })).status, 400, 'reason required');
});

test('inventory and transaction history endpoints filter correctly', async () => {
  const inv = await api.get('/api/admin/inventory?status=low&limit=50', { token: admin });
  assert.ok(inv.body.data.every((p) => p.status === 'low'));
  assert.equal(typeof inv.body.meta.summary.unavailableProducts, 'number');
  const hidden = await api.get('/api/admin/inventory?availability=unavailable', { token: admin });
  assert.ok(hidden.body.data.length >= 1 && hidden.body.data.every((p) => p.isAvailable === false));

  const orderTx = await api.get('/api/admin/transactions?source=order&limit=100', { token: admin });
  assert.ok(orderTx.body.data.length > 0 && orderTx.body.data.every((t) => t.referenceType === 'ORDER'));
  const manual = await api.get('/api/admin/transactions?source=manual&type=adjustment', { token: admin });
  assert.ok(manual.body.data.every((t) => t.type === 'ADJUSTMENT' && t.referenceType === 'MANUAL'));
});

test('customer management: list, search, details with orders, no password data', async () => {
  const list = await api.get('/api/admin/customers', { token: admin });
  assert.equal(list.status, 200);
  assert.equal(list.body.meta.totalItems, 4);
  assert.ok(list.body.data.every((c) => c.passwordHash === undefined && c.tokenVersion === undefined && c.role === 'customer'));
  const andrea = list.body.data.find((c) => c.email === 'andrea@example.com');
  assert.equal(andrea.orderCount, 3);

  const search = await api.get('/api/admin/customers?search=reyes', { token: admin });
  assert.deepEqual(search.body.data.map((c) => c.fullName), ['Carla Reyes']);

  const detail = await api.get(`/api/admin/customers/${andrea.userId}`, { token: admin });
  assert.equal(detail.body.data.orders.length, 3);
  assert.equal(detail.body.data.passwordHash, undefined);
  assert.equal((await api.get('/api/admin/customers/USR-00000001', { token: admin })).status, 404, 'admins are not listed as customers');
});

test('disabling a customer blocks them immediately; re-enabling restores login', async () => {
  const miguel = await api.customerToken('miguel@example.com');
  const r = await api.put('/api/admin/customers/USR-00000003/status', { status: 'disabled' }, { token: admin });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'disabled');
  assert.equal((await api.get('/api/auth/profile', { token: miguel })).status, 401, 'existing session ends');
  assert.equal((await api.post('/api/auth/login', { email: 'miguel@example.com', password: 'Customer@123' })).status, 403);
  await api.put('/api/admin/customers/USR-00000003/status', { status: 'active' }, { token: admin });
  assert.equal((await api.post('/api/auth/login', { email: 'miguel@example.com', password: 'Customer@123' })).status, 200);
});

test('consistent error format for bad JSON, bad IDs and unknown routes', async () => {
  const badJson = await api.request('POST', '/api/categories', { body: '{oops', token: admin });
  assert.equal(badJson.status, 400);
  assert.equal(badJson.body.error.code, 'INVALID_JSON');
  assert.equal((await api.get('/api/products/123')).body.error.code, 'INVALID_ID');
  const missing = await api.get('/api/nothing-here');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.success, false);
});

test('every product still matches its transaction history', () => {
  assertLedgerConsistent(assert, api.readJson('products'), api.readJson('transactions'));
});
