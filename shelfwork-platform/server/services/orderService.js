import crypto from 'node:crypto';
import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { generateId, PREFIX } from '../utils/ids.js';
import { AppError, notFound, throwIfInvalid, validationError } from '../utils/errors.js';
import { cleanString, ensureBody, isEmail, isPhone } from '../utils/validators.js';
import { paginate, parsePagination } from '../utils/pagination.js';
import { buildTransaction } from '../utils/transaction.js';
import { CANCELLABLE, NEXT_STATUS, ORDER_STATUSES, PAYMENT_METHODS } from '../config.js';
import { isListed } from './productService.js';
import { shippingFor } from './cartService.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** The idempotency key is internal bookkeeping; clients don't need it back. */
export function orderView(order) {
  const { idempotencyKey, ...rest } = order;
  return rest;
}

function cleanCheckout(body) {
  const details = {};
  const fullName = cleanString(details, 'fullName', body.fullName, { required: true, max: 120, label: 'Full name' });
  const email = cleanString(details, 'email', body.email, { required: true, max: 120, label: 'Email' }).toLowerCase();
  if (email && !details.email && !isEmail(email)) details.email = 'Enter a valid email address.';
  const phone = cleanString(details, 'phone', body.phone, { required: true, max: 20, label: 'Contact number' });
  if (phone && !details.phone && !isPhone(phone))
    details.phone = 'Enter a valid contact number (digits, spaces, + ( ) - only, at least 7 digits).';
  const address = cleanString(details, 'address', body.address, { required: true, max: 250, label: 'Delivery address' });
  const notes = cleanString(details, 'notes', body.notes, { max: 300, label: 'Notes' });
  const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim().toUpperCase() : '';
  if (!PAYMENT_METHODS[paymentMethod]) details.paymentMethod = `Payment method must be one of: ${Object.keys(PAYMENT_METHODS).join(', ')}.`;
  throwIfInvalid(details);
  return { customer: { fullName, email, phone, address }, notes, paymentMethod };
}

function cleanIdempotencyKey(key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(key))
    throw validationError({
      idempotencyKey: 'Send a unique Idempotency-Key header (8-100 letters, numbers, - or _) with each new order, and reuse it when retrying.',
    });
  return key;
}

/**
 * Turn the customer's cart into an order. Everything happens inside one lock and one save:
 * stock is checked, deducted and logged; the payment is recorded; the cart is emptied.
 * Repeating the request with the same Idempotency-Key returns the first order instead of a new one.
 */
export function placeOrder(user, body, rawKey) {
  return withLock(async () => {
    ensureBody(body);
    const idempotencyKey = cleanIdempotencyKey(rawKey);
    const [orders, products, carts, transactions, payments] = await Promise.all([
      readCollection('orders'),
      readCollection('products'),
      readCollection('carts'),
      readCollection('transactions'),
      readCollection('payments'),
    ]);

    const previous = orders.find((o) => o.userId === user.userId && o.idempotencyKey === idempotencyKey);
    if (previous) return { order: orderView(previous), duplicate: true };

    const { customer, notes, paymentMethod } = cleanCheckout(body);

    const cart = carts.find((c) => c.userId === user.userId);
    if (!cart || cart.items.length === 0) throw new AppError(400, 'Your cart is empty.', 'CART_EMPTY');

    // Validate every line against live stock before changing anything.
    const problems = [];
    const lines = cart.items.map((line) => {
      const product = products.find((p) => p.productId === line.productId);
      if (!product || !isListed(product)) problems.push({ productId: line.productId, productName: product?.productName || 'Unknown product', problem: 'No longer available.', available: 0 });
      else if (line.quantity > product.quantity)
        problems.push({ productId: product.productId, productName: product.productName, problem: product.quantity ? `Only ${product.quantity} left.` : 'Out of stock.', available: product.quantity, requested: line.quantity });
      return { line, product };
    });
    if (problems.length)
      throw new AppError(409, 'Some items in your cart can no longer be ordered as they are. Update your cart and try again.', 'CART_INVALID', { items: problems });

    const now = new Date().toISOString();
    const orderId = generateId(PREFIX.order, orders.map((o) => o.orderId));

    // Prices always come from the product records, never from the client.
    const items = lines.map(({ line, product }) => ({
      productId: product.productId,
      productName: product.productName,
      imageUrl: product.imageUrl || '',
      unitPrice: product.price,
      quantity: line.quantity,
      lineTotal: round2(product.price * line.quantity),
    }));
    const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
    const shippingFee = shippingFor(subtotal);
    const total = round2(subtotal + shippingFee);

    // Deduct stock and log one OUT transaction per line.
    const newTransactions = [];
    const updatedProducts = products.map((p) => {
      const item = items.find((i) => i.productId === p.productId);
      if (!item) return p;
      const updated = { ...p, quantity: p.quantity - item.quantity, updatedAt: now };
      newTransactions.push(
        buildTransaction({
          product: updated, type: 'OUT', quantity: item.quantity, previousQuantity: p.quantity,
          newQuantity: updated.quantity, reason: `Customer order ${orderId}`,
          existing: [...newTransactions, ...transactions], now,
          referenceType: 'ORDER', referenceId: orderId, performedBy: user.userId,
        })
      );
      return updated;
    });

    // Simulated payment only: no card details are ever collected or stored.
    const paid = paymentMethod === 'ONLINE_SIMULATED';
    const payment = {
      paymentId: generateId(PREFIX.payment, payments.map((p) => p.paymentId)),
      orderId,
      userId: user.userId,
      method: paymentMethod,
      amount: total,
      status: paid ? 'PAID' : 'PENDING',
      reference: paid ? `SIM-${crypto.randomBytes(5).toString('hex').toUpperCase()}` : null,
      simulated: true,
      createdAt: now,
      updatedAt: now,
    };

    const order = {
      orderId,
      userId: user.userId,
      customer,
      items,
      subtotal,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus: payment.status,
      paymentId: payment.paymentId,
      status: 'Pending',
      statusHistory: [{ status: 'Pending', at: now, by: 'customer', note: 'Order placed' }],
      notes,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    await writeCollections({
      orders: [order, ...orders],
      products: updatedProducts,
      transactions: [...newTransactions, ...transactions],
      payments: [payment, ...payments],
      carts: carts.filter((c) => c.userId !== user.userId),
    });
    return { order: orderView(order), duplicate: false };
  });
}

export async function listOrders(query = {}, { userId } = {}) {
  const details = {};
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
  let status = '';
  if (query.status !== undefined && query.status !== '') {
    status = ORDER_STATUSES.find((s) => s.toLowerCase() === String(query.status).toLowerCase());
    if (!status) details.status = `Status must be one of: ${ORDER_STATUSES.join(', ')}.`;
  }
  const { page, limit } = parsePagination(query, details);
  throwIfInvalid(details);

  const filtered = (await readCollection('orders'))
    .filter((o) => !userId || o.userId === userId)
    .filter((o) => !status || o.status === status)
    .filter(
      (o) => !search || o.orderId.toLowerCase().includes(search) || o.customer.fullName.toLowerCase().includes(search)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const { items, meta } = paginate(filtered, page, limit);
  return { items: items.map(orderView), meta };
}

/** Admins can open any order; customers only their own (others look like "not found"). */
export async function getOrder(id, user) {
  const order = (await readCollection('orders')).find((o) => o.orderId === id);
  if (!order || (user.role !== 'admin' && order.userId !== user.userId)) throw notFound('Order');
  return orderView(order);
}

function allowedNext(order) {
  const next = [];
  if (NEXT_STATUS[order.status]) next.push(NEXT_STATUS[order.status]);
  if (CANCELLABLE.admin.includes(order.status)) next.push('Cancelled');
  return next;
}

export function updateStatus(id, body, admin) {
  ensureBody(body);
  const details = {};
  const status = ORDER_STATUSES.find((s) => s.toLowerCase() === String(body.status ?? '').trim().toLowerCase());
  if (!status) details.status = `Status must be one of: ${ORDER_STATUSES.join(', ')}.`;
  const note = cleanString(details, 'note', body.note, { max: 200, label: 'Note' });
  throwIfInvalid(details);

  if (status === 'Cancelled') return cancelOrder(id, admin, { reason: note });

  return withLock(async () => {
    const [orders, payments] = await Promise.all([readCollection('orders'), readCollection('payments')]);
    const order = orders.find((o) => o.orderId === id);
    if (!order) throw notFound('Order');
    if (NEXT_STATUS[order.status] !== status)
      throw new AppError(
        400,
        `An order that is ${order.status} cannot move to ${status}.`,
        'INVALID_STATUS_TRANSITION',
        { current: order.status, allowed: allowedNext(order) }
      );

    const now = new Date().toISOString();
    const updated = {
      ...order,
      status,
      updatedAt: now,
      statusHistory: [...order.statusHistory, { status, at: now, by: 'admin', note: note || '' }],
    };
    const updates = { orders: orders.map((o) => (o.orderId === id ? updated : o)) };

    // Cash on delivery is collected when the order is delivered.
    if (status === 'Delivered' && order.paymentStatus === 'PENDING') {
      updated.paymentStatus = 'PAID';
      updates.payments = payments.map((p) => (p.paymentId === order.paymentId ? { ...p, status: 'PAID', updatedAt: now } : p));
    }
    await writeCollections(updates);
    return orderView(updated);
  });
}

/**
 * Cancel an order and put its stock back on the shelf (one IN transaction per line).
 * Customers may cancel Pending or Confirmed orders; admins also Processing ones.
 * An order can only be cancelled once, so stock is never restored twice.
 */
export function cancelOrder(id, user, body = {}) {
  return withLock(async () => {
    const details = {};
    const reason = cleanString(details, 'reason', body?.reason, { max: 200, label: 'Reason' });
    throwIfInvalid(details);

    const [orders, products, transactions, payments] = await Promise.all([
      readCollection('orders'),
      readCollection('products'),
      readCollection('transactions'),
      readCollection('payments'),
    ]);
    const order = orders.find((o) => o.orderId === id);
    const isAdmin = user.role === 'admin';
    if (!order || (!isAdmin && order.userId !== user.userId)) throw notFound('Order');

    const allowed = CANCELLABLE[isAdmin ? 'admin' : 'customer'];
    if (!allowed.includes(order.status))
      throw new AppError(
        400,
        order.status === 'Cancelled'
          ? 'This order has already been cancelled.'
          : `An order that is ${order.status} can no longer be cancelled${isAdmin ? '' : ' online. Please contact the store'}.`,
        'ORDER_NOT_CANCELLABLE',
        { current: order.status }
      );

    const now = new Date().toISOString();
    const newTransactions = [];
    const missing = [];
    const updatedProducts = products.map((p) => {
      const item = order.items.find((i) => i.productId === p.productId);
      if (!item) return p;
      const updated = { ...p, quantity: p.quantity + item.quantity, updatedAt: now };
      newTransactions.push(
        buildTransaction({
          product: updated, type: 'IN', quantity: item.quantity, previousQuantity: p.quantity,
          newQuantity: updated.quantity, reason: `Order ${id} cancelled: stock restored`,
          existing: [...newTransactions, ...transactions], now,
          referenceType: 'ORDER', referenceId: id, performedBy: user.userId,
        })
      );
      return updated;
    });
    for (const item of order.items) if (!products.some((p) => p.productId === item.productId)) missing.push(item.productName);

    const paymentStatus = order.paymentStatus === 'PAID' ? 'REFUNDED' : 'VOIDED';
    const by = isAdmin ? 'admin' : 'customer';
    const note = [reason, missing.length ? `Not restocked (product deleted): ${missing.join(', ')}` : ''].filter(Boolean).join(' · ');
    const updated = {
      ...order,
      status: 'Cancelled',
      paymentStatus,
      cancelledAt: now,
      cancelledBy: by,
      cancelReason: reason || '',
      updatedAt: now,
      statusHistory: [...order.statusHistory, { status: 'Cancelled', at: now, by, note }],
    };

    await writeCollections({
      orders: orders.map((o) => (o.orderId === id ? updated : o)),
      products: updatedProducts,
      transactions: [...newTransactions, ...transactions],
      payments: payments.map((p) => (p.paymentId === order.paymentId ? { ...p, status: paymentStatus, updatedAt: now } : p)),
    });
    return orderView(updated);
  });
}
