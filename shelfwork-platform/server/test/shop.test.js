import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, PRD } from './helpers.js';

let api;
let customer;
before(async () => {
  api = await startServer();
  customer = await api.customerToken();
});
after(() => api.close());

test('the shop lists only available products, without internal fields', async () => {
  const r = await api.get('/api/products?limit=100');
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.totalItems, 14, 'the hidden gift box is not listed');
  assert.ok(r.body.data.every((p) => p.supplier === undefined && p.lowStockThreshold === undefined));
  assert.ok(r.body.data.every((p) => typeof p.imageUrl === 'string' && p.status));
  assert.equal((await api.get(`/api/products/${PRD(15)}`)).status, 404, 'hidden product detail is not reachable');
});

test('search, category filter, price sort and featured filter', async () => {
  const search = await api.get('/api/products?search=coffee');
  assert.deepEqual(search.body.data.map((p) => p.productName), ['Whole Bean Coffee 1kg']);

  const cat = await api.get('/api/products?category=Electronics&limit=50');
  assert.ok(cat.body.data.length === 3 && cat.body.data.every((p) => p.category === 'Electronics'));

  const asc = (await api.get('/api/products?sortBy=price&order=asc&limit=3')).body.data.map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.equal(asc[0], 38);

  const featured = await api.get('/api/products?featured=true');
  assert.ok(featured.body.data.length >= 3 && featured.body.data.every((p) => p.isFeatured));

  const inStock = await api.get('/api/products?inStock=true&limit=100');
  assert.ok(inStock.body.data.every((p) => p.quantity > 0));
});

test('admins see every product (including hidden) with full fields', async () => {
  const admin = await api.adminToken();
  const r = await api.get('/api/products?limit=100', { token: admin });
  assert.equal(r.body.meta.totalItems, 15);
  assert.ok(r.body.data.some((p) => p.isAvailable === false));
  assert.ok(r.body.data[0].supplier !== undefined);
  const shopView = await api.get('/api/products?limit=100&view=public', { token: admin });
  assert.equal(shopView.body.meta.totalItems, 14);
});

test('stock availability check', async () => {
  const ok = await api.get(`/api/products/${PRD(3)}/availability?quantity=5`);
  assert.equal(ok.body.data.canPurchase, true);
  const tooMany = await api.get(`/api/products/${PRD(3)}/availability?quantity=5000`);
  assert.equal(tooMany.body.data.canPurchase, false);
  assert.equal(tooMany.body.data.availableQuantity, 94);
});

test('categories are public and include product counts', async () => {
  const r = await api.get('/api/categories');
  assert.equal(r.status, 200);
  const packaging = r.body.data.find((c) => c.categoryName === 'Packaging');
  assert.equal(packaging.productCount, 3);
  assert.equal(packaging.availableProductCount, 2);
});

test('product images are served', async () => {
  const r = await api.get('/uploads/products/PRD-00000001.svg');
  assert.equal(r.status, 200);
  assert.match(r.text, /<svg/);
});

/* ---------------- Cart ---------------- */
test('cart requires a customer login', async () => {
  assert.equal((await api.get('/api/cart')).status, 401);
  const admin = await api.adminToken();
  assert.equal((await api.get('/api/cart', { token: admin })).status, 403);
});

test('add, update, remove and clear cart items with backend-calculated totals', async () => {
  await api.del('/api/cart', { token: customer });
  let r = await api.post('/api/cart/items', { productId: PRD(3), quantity: 2 }, { token: customer });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.itemCount, 2);
  assert.equal(r.body.data.subtotal, 840);
  assert.equal(r.body.data.shippingFee, 100);
  assert.equal(r.body.data.total, 940);

  r = await api.post('/api/cart/items', { productId: PRD(3), quantity: 1 }, { token: customer });
  assert.equal(r.body.data.items[0].quantity, 3, 'adding the same product increases its quantity');

  r = await api.post('/api/cart/items', { productId: PRD(8), quantity: 2 }, { token: customer });
  assert.equal(r.body.data.subtotal, 3 * 420 + 2 * 1250);
  assert.equal(r.body.data.shippingFee, 0, 'free shipping at 3000 and above');

  r = await api.put(`/api/cart/items/${PRD(8)}`, { quantity: 1 }, { token: customer });
  assert.equal(r.body.data.items.find((i) => i.productId === PRD(8)).quantity, 1);

  r = await api.del(`/api/cart/items/${PRD(8)}`, { token: customer });
  assert.equal(r.body.data.items.length, 1);

  r = await api.get('/api/cart', { token: customer });
  assert.equal(r.body.data.itemCount, 3, 'cart persists between requests');

  r = await api.del('/api/cart', { token: customer });
  assert.equal(r.body.data.items.length, 0);
  assert.equal(r.body.data.total, 0);
});

test('cart refuses more than the available stock, unavailable products and bad input', async () => {
  const tooMany = await api.post('/api/cart/items', { productId: PRD(10), quantity: 4 }, { token: customer });
  assert.equal(tooMany.status, 400);
  assert.equal(tooMany.body.error.code, 'INSUFFICIENT_STOCK');

  await api.post('/api/cart/items', { productId: PRD(10), quantity: 3 }, { token: customer });
  const oneMore = await api.post('/api/cart/items', { productId: PRD(10), quantity: 1 }, { token: customer });
  assert.equal(oneMore.status, 400, 'cart total for a product cannot exceed stock');
  assert.equal(oneMore.body.error.details.inCart, 3);

  assert.equal((await api.put(`/api/cart/items/${PRD(10)}`, { quantity: 99 }, { token: customer })).status, 400);
  assert.equal((await api.post('/api/cart/items', { productId: PRD(4), quantity: 1 }, { token: customer })).status, 400, 'out of stock');
  assert.equal((await api.post('/api/cart/items', { productId: PRD(15), quantity: 1 }, { token: customer })).status, 404, 'hidden product');
  assert.equal((await api.post('/api/cart/items', { productId: PRD(3), quantity: 0 }, { token: customer })).status, 400);
  assert.equal((await api.post('/api/cart/items', { productId: 'nope', quantity: 1 }, { token: customer })).status, 400);
  assert.equal((await api.put(`/api/cart/items/${PRD(1)}`, { quantity: 1 }, { token: customer })).status, 404, 'not in cart');
  await api.del('/api/cart', { token: customer });
});

test('guest cart preview prices items without logging in and flags problems', async () => {
  const r = await api.post('/api/cart/preview', { items: [{ productId: PRD(3), quantity: 1 }, { productId: PRD(10), quantity: 50 }, { productId: PRD(3), quantity: 1 }] });
  assert.equal(r.status, 200);
  const tumbler = r.body.data.items.find((i) => i.productId === PRD(3));
  assert.equal(tumbler.quantity, 2, 'duplicate lines are merged');
  assert.ok(r.body.data.items.find((i) => i.productId === PRD(10)).issue);
  assert.equal(r.body.data.hasIssues, true);
  assert.equal(r.body.data.subtotal, 840, 'lines with problems are left out of the total');
});

test('merging a guest cart after login caps quantities at stock', async () => {
  const r = await api.post('/api/cart/merge', { items: [{ productId: PRD(10), quantity: 10 }, { productId: PRD(4), quantity: 1 }] }, { token: customer });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items.find((i) => i.productId === PRD(10)).quantity, 3);
  assert.equal(r.body.data.adjustments.length, 2);
  await api.del('/api/cart', { token: customer });
});
