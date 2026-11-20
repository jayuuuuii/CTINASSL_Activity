import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSampleData } from '../scripts/sampleData.js';
import { isValidId } from '../utils/ids.js';
import { assertLedgerConsistent } from './helpers.js';

const data = await buildSampleData(Date.UTC(2026, 10, 20));

test('all IDs are valid and unique', () => {
  const check = (list, key, prefix) => {
    const ids = list.map((x) => x[key]);
    assert.equal(new Set(ids).size, ids.length, `${key} not unique`);
    ids.forEach((id) => assert.ok(isValidId(prefix, id), `${id} invalid`));
  };
  check(data.products, 'productId', 'PRD');
  check(data.categories, 'categoryId', 'CAT');
  check(data.suppliers, 'supplierId', 'SUP');
  check(data.transactions, 'transactionId', 'TXN');
  check(data.users, 'userId', 'USR');
  check(data.orders, 'orderId', 'ORD');
  check(data.payments, 'paymentId', 'PAY');
});

test('products reference existing categories and suppliers', () => {
  const cats = new Set(data.categories.map((c) => c.categoryName));
  const sups = new Set(data.suppliers.map((s) => s.supplierName));
  for (const p of data.products) {
    assert.ok(cats.has(p.category), p.productName);
    assert.ok(sups.has(p.supplier), p.productName);
  }
});

test("every product's stock equals its transaction history", () => {
  assertLedgerConsistent(assert, data.products, data.transactions);
});

test('every order line has a matching OUT transaction; cancelled orders were restocked', () => {
  for (const o of data.orders) {
    for (const item of o.items) {
      const out = data.transactions.filter((t) => t.referenceId === o.orderId && t.productId === item.productId && t.type === 'OUT');
      assert.equal(out.length, 1, `${o.orderId} ${item.productName}`);
      assert.equal(out[0].quantity, item.quantity);
      const back = data.transactions.filter((t) => t.referenceId === o.orderId && t.productId === item.productId && t.type === 'IN');
      assert.equal(back.length, o.status === 'Cancelled' ? 1 : 0);
    }
  }
});

test('order totals add up and every order has a matching payment', () => {
  for (const o of data.orders) {
    const subtotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    assert.equal(o.subtotal, subtotal);
    assert.equal(o.total, o.subtotal + o.shippingFee);
    const payment = data.payments.find((p) => p.paymentId === o.paymentId);
    assert.equal(payment.orderId, o.orderId);
    assert.equal(payment.amount, o.total);
    assert.equal(payment.status, o.paymentStatus);
  }
});

test('passwords are hashed, never stored in plain text', () => {
  for (const u of data.users) {
    assert.match(u.passwordHash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    assert.equal(u.password, undefined);
  }
});
