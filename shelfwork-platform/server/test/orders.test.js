import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, PRD, newKey, checkout, assertLedgerConsistent } from './helpers.js';

let api;
let andrea;
let miguel;
let admin;
before(async () => {
  api = await startServer();
  andrea = await api.customerToken('andrea@example.com');
  miguel = await api.customerToken('miguel@example.com');
  admin = await api.adminToken();
});
after(() => api.close());

const qty = async (n) => (await api.get(`/api/products/${PRD(n)}`, { token: admin })).body.data.quantity;
const fill = async (token, items) => {
  await api.del('/api/cart', { token });
  for (const [n, q] of items) {
    const r = await api.post('/api/cart/items', { productId: PRD(n), quantity: q }, { token });
    assert.equal(r.status, 200, r.text);
  }
};
const place = (token, body = checkout, key = newKey()) => api.post('/api/orders', body, { token, headers: { 'Idempotency-Key': key } });

let placed;

test('placing an order deducts stock, logs transactions, records payment and empties the cart', async () => {
  const before3 = await qty(3);
  const before9 = await qty(9);
  await fill(andrea, [[3, 2], [9, 1]]);

  const r = await place(andrea);
  assert.equal(r.status, 201, r.text);
  placed = r.body.data;
  assert.match(placed.orderId, /^ORD-[0-9a-f]{8}$/);
  assert.equal(placed.status, 'Pending');
  assert.equal(placed.subtotal, 2 * 420 + 320);
  assert.equal(placed.shippingFee, 100);
  assert.equal(placed.total, placed.subtotal + 100);
  assert.equal(placed.paymentStatus, 'PENDING');
  assert.equal(placed.idempotencyKey, undefined);

  assert.equal(await qty(3), before3 - 2);
  assert.equal(await qty(9), before9 - 1);

  const txs = api.readJson('transactions').filter((t) => t.referenceId === placed.orderId);
  assert.equal(txs.length, 2);
  assert.ok(txs.every((t) => t.type === 'OUT' && t.referenceType === 'ORDER'));

  const payment = api.readJson('payments').find((p) => p.orderId === placed.orderId);
  assert.equal(payment.amount, placed.total);
  assert.equal(payment.status, 'PENDING');

  assert.equal((await api.get('/api/cart', { token: andrea })).body.data.items.length, 0);
});

test('prices come from the server, not from the request', async () => {
  await fill(andrea, [[1, 1]]);
  const r = await place(andrea, { ...checkout, items: [{ productId: PRD(1), quantity: 1, unitPrice: 0.01 }], total: 0.01 });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.items[0].unitPrice, 38);
  assert.equal(r.body.data.total, 138);
});

test('retrying with the same Idempotency-Key returns the same order and does not deduct stock twice', async () => {
  await fill(miguel, [[6, 1]]);
  const key = newKey();
  const before = await qty(6);
  const first = await place(miguel, { ...checkout, fullName: 'Miguel Santos' }, key);
  assert.equal(first.status, 201);
  const second = await place(miguel, { ...checkout, fullName: 'Miguel Santos' }, key);
  assert.equal(second.status, 200);
  assert.equal(second.body.meta.duplicate, true);
  assert.equal(second.body.data.orderId, first.body.data.orderId);
  assert.equal(await qty(6), before - 1);
  assert.equal(api.readJson('orders').filter((o) => o.orderId === first.body.data.orderId).length, 1);
});

test('two simultaneous submissions of the same checkout create exactly one order', async () => {
  await fill(miguel, [[12, 1]]);
  const key = newKey();
  const before = await qty(12);
  const [a, b] = await Promise.all([place(miguel, checkout, key), place(miguel, checkout, key)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 201]);
  assert.equal(a.body.data.orderId, b.body.data.orderId);
  assert.equal(await qty(12), before - 1);
});

test('an Idempotency-Key is required', async () => {
  await fill(andrea, [[1, 1]]);
  const r = await api.post('/api/orders', checkout, { token: andrea });
  assert.equal(r.status, 400);
  assert.ok(r.body.error.details.idempotencyKey);
  await api.del('/api/cart', { token: andrea });
});

test('checkout validates customer details, payment method and an empty cart', async () => {
  await fill(andrea, [[1, 1]]);
  const bad = await place(andrea, { fullName: '', email: 'nope', phone: 'abc', address: '', paymentMethod: 'CARD' });
  assert.equal(bad.status, 400);
  for (const f of ['fullName', 'email', 'phone', 'address', 'paymentMethod']) assert.ok(bad.body.error.details[f], f);
  await api.del('/api/cart', { token: andrea });
  const empty = await place(andrea);
  assert.equal(empty.status, 400);
  assert.equal(empty.body.error.code, 'CART_EMPTY');
});

test('overselling is impossible: stock taken by another order blocks checkout', async () => {
  const stock = await qty(10); // scanner, 3 left
  await fill(andrea, [[10, stock]]);
  await fill(miguel, [[10, stock]]);
  const first = await place(miguel);
  assert.equal(first.status, 201);
  const second = await place(andrea);
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, 'CART_INVALID');
  assert.equal(second.body.error.details.items[0].available, 0);
  assert.equal(await qty(10), 0);
  await api.del('/api/cart', { token: andrea });
});

test('parallel orders racing for the last units never push stock below zero', async () => {
  // Put 2 units on the shelf, then let 5 customers try to buy 1 each at once.
  const product = PRD(14);
  await api.post('/api/stock/in', { productId: product, quantity: 2 }, { token: admin });
  const tokens = [];
  for (let i = 0; i < 5; i++) {
    const reg = await api.post('/api/auth/register', { fullName: `Racer ${i}`, email: `racer${i}@example.com`, password: 'racer1234' });
    tokens.push(reg.body.data.token);
    await api.post('/api/cart/items', { productId: product, quantity: 1 }, { token: reg.body.data.token });
  }
  const results = await Promise.all(tokens.map((t) => place(t)));
  assert.equal(results.filter((r) => r.status === 201).length, 2);
  assert.equal(results.filter((r) => r.status === 409).length, 3);
  assert.equal(await qty(14), 0);
});

test('unavailable products cannot be ordered even if already in a cart', async () => {
  await fill(andrea, [[13, 1]]);
  await api.put(`/api/products/${PRD(13)}`, { isAvailable: false }, { token: admin });
  const r = await place(andrea);
  assert.equal(r.status, 409);
  await api.put(`/api/products/${PRD(13)}`, { isAvailable: true }, { token: admin });
  await api.del('/api/cart', { token: andrea });
});

test('customers see only their own orders', async () => {
  const mine = await api.get('/api/orders/my-orders', { token: andrea });
  assert.equal(mine.status, 200);
  assert.ok(mine.body.data.length >= 1 && mine.body.data.every((o) => o.userId === mine.body.data[0].userId));
  const list = await api.get('/api/orders', { token: andrea });
  assert.equal(list.body.meta.totalItems, mine.body.meta.totalItems);

  assert.equal((await api.get(`/api/orders/${placed.orderId}`, { token: andrea })).status, 200);
  assert.equal((await api.get(`/api/orders/${placed.orderId}`, { token: miguel })).status, 404, "another customer's order is hidden");
  assert.equal((await api.get('/api/orders/ORD-zz')).status, 400);
  assert.equal((await api.get(`/api/orders/${placed.orderId}`)).status, 401);
});

test('admins see all orders and can search and filter them', async () => {
  const all = await api.get('/api/orders?limit=100', { token: admin });
  assert.ok(all.body.meta.totalItems >= 10);
  const byName = await api.get('/api/admin/orders?search=carla', { token: admin });
  assert.ok(byName.body.data.length >= 1 && byName.body.data.every((o) => o.customer.fullName.includes('Carla')));
  const byId = await api.get(`/api/admin/orders?search=${placed.orderId.slice(4)}`, { token: admin });
  assert.equal(byId.body.data[0].orderId, placed.orderId);
  const pending = await api.get('/api/admin/orders?status=pending&limit=100', { token: admin });
  assert.ok(pending.body.data.every((o) => o.status === 'Pending'));
});

test('order status follows the workflow; COD becomes paid on delivery', async () => {
  const id = placed.orderId;
  const skip = await api.put(`/api/orders/${id}/status`, { status: 'Shipped' }, { token: admin });
  assert.equal(skip.status, 400);
  assert.equal(skip.body.error.code, 'INVALID_STATUS_TRANSITION');
  assert.deepEqual(skip.body.error.details.allowed, ['Confirmed', 'Cancelled']);

  assert.equal((await api.put(`/api/orders/${id}/status`, { status: 'Confirmed' }, { token: andrea })).status, 403, 'customers cannot change status');

  for (const status of ['Confirmed', 'Processing', 'Shipped']) {
    const r = await api.put(`/api/orders/${id}/status`, { status, note: `to ${status}` }, { token: admin });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.body.data.status, status);
  }
  const cancelShipped = await api.put(`/api/orders/${id}/cancel`, {}, { token: admin });
  assert.equal(cancelShipped.status, 400, 'shipped orders cannot be cancelled');

  const delivered = await api.put(`/api/orders/${id}/status`, { status: 'Delivered' }, { token: admin });
  assert.equal(delivered.body.data.paymentStatus, 'PAID');
  assert.equal(delivered.body.data.statusHistory.length, 5);
  assert.equal(api.readJson('payments').find((p) => p.orderId === id).status, 'PAID');
});

test('cancelling restores stock exactly once; customers can only cancel early orders', async () => {
  await fill(andrea, [[5, 2]]);
  const order = (await place(andrea, { ...checkout, paymentMethod: 'ONLINE_SIMULATED' })).body.data;
  assert.equal(order.paymentStatus, 'PAID');
  const afterOrder = await qty(5);

  assert.equal((await api.put(`/api/orders/${order.orderId}/cancel`, {}, { token: miguel })).status, 404, "can't cancel someone else's order");

  const r = await api.put(`/api/orders/${order.orderId}/cancel`, { reason: 'Changed my mind' }, { token: andrea });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'Cancelled');
  assert.equal(r.body.data.paymentStatus, 'REFUNDED');
  assert.equal(await qty(5), afterOrder + 2);

  const again = await api.put(`/api/orders/${order.orderId}/cancel`, {}, { token: andrea });
  assert.equal(again.status, 400);
  assert.equal(again.body.error.code, 'ORDER_NOT_CANCELLABLE');
  assert.equal(await qty(5), afterOrder + 2, 'stock is not restored twice');

  const restock = api.readJson('transactions').filter((t) => t.referenceId === order.orderId && t.type === 'IN');
  assert.equal(restock.length, 1);

  // A Processing order: the customer can't cancel it, the admin can.
  await fill(andrea, [[1, 3]]);
  const o2 = (await place(andrea)).body.data;
  await api.put(`/api/orders/${o2.orderId}/status`, { status: 'Confirmed' }, { token: admin });
  await api.put(`/api/orders/${o2.orderId}/status`, { status: 'Processing' }, { token: admin });
  assert.equal((await api.put(`/api/orders/${o2.orderId}/cancel`, {}, { token: andrea })).status, 400);
  const viaStatus = await api.put(`/api/orders/${o2.orderId}/status`, { status: 'Cancelled', note: 'Out of delivery area' }, { token: admin });
  assert.equal(viaStatus.status, 200);
  assert.equal(viaStatus.body.data.paymentStatus, 'VOIDED');
});

test('after all of that, every product still matches its transaction history', () => {
  assertLedgerConsistent(assert, api.readJson('products'), api.readJson('transactions'));
});

test('orders and stock survive a restart (fresh reads from disk)', async () => {
  const { createApp } = await import('../app.js');
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/orders/${placed.orderId}`, {
    headers: { Authorization: `Bearer ${andrea}` },
  });
  const body = await res.json();
  server.close();
  assert.equal(res.status, 200, 'a token issued before the restart still works');
  assert.equal(body.data.status, 'Delivered');
});
