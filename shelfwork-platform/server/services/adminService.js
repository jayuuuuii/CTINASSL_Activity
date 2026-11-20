import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { AppError, notFound, throwIfInvalid } from '../utils/errors.js';
import { paginate, parsePagination } from '../utils/pagination.js';
import { safeUser } from '../utils/auth.js';
import { ORDER_STATUSES } from '../config.js';
import { getStats } from './dashboardService.js';
import { computeStatus, withStatus, listProducts } from './productService.js';
import { orderView } from './orderService.js';

const round2 = (n) => Math.round(n * 100) / 100;
const counted = (o) => o.status !== 'Cancelled';

export async function getDashboard() {
  const [stats, orders, transactions, products] = await Promise.all([
    getStats(),
    readCollection('orders'),
    readCollection('transactions'),
    readCollection('products'),
  ]);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]));
  const recent = (list) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return {
    ...stats,
    totalOrders: orders.length,
    pendingOrders: byStatus.Pending,
    ordersByStatus: byStatus,
    // Sales = value of every order that has not been cancelled (paid or awaiting cash on delivery).
    totalSales: round2(orders.filter(counted).reduce((s, o) => s + o.total, 0)),
    collectedSales: round2(orders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + o.total, 0)),
    recentOrders: recent(orders).map((o) => ({
      orderId: o.orderId,
      customerName: o.customer.fullName,
      total: o.total,
      status: o.status,
      paymentMethod: o.paymentMethod,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: o.createdAt,
    })),
    recentTransactions: recent(transactions),
    lowStockProducts: products
      .filter((p) => computeStatus(p) !== 'in')
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 8)
      .map(withStatus),
  };
}

export async function getInventory(query) {
  const [{ items, meta }, stats] = await Promise.all([listProducts(query, { viewer: 'admin' }), getStats()]);
  const products = await readCollection('products');
  return {
    items,
    meta,
    summary: { ...stats, unavailableProducts: products.filter((p) => p.isAvailable === false).length },
  };
}

function customerSummary(user, orders) {
  const own = orders.filter((o) => o.userId === user.userId);
  return {
    ...safeUser(user),
    orderCount: own.length,
    totalSpent: round2(own.filter(counted).reduce((s, o) => s + o.total, 0)),
    lastOrderAt: own.map((o) => o.createdAt).sort().pop() || null,
  };
}

export async function listCustomers(query = {}) {
  const details = {};
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
  const status = query.status ? String(query.status).toLowerCase() : '';
  if (status && !['active', 'disabled'].includes(status)) details.status = 'Status must be "active" or "disabled".';
  const { page, limit } = parsePagination(query, details);
  throwIfInvalid(details);

  const [users, orders] = await Promise.all([readCollection('users'), readCollection('orders')]);
  const filtered = users
    .filter((u) => u.role === 'customer')
    .filter((u) => !status || u.status === status)
    .filter(
      (u) =>
        !search ||
        u.fullName.toLowerCase().includes(search) ||
        u.email.includes(search) ||
        (u.phone || '').replace(/\D/g, '').includes(search.replace(/\D/g, '') || '\u0000')
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { items, meta } = paginate(filtered, page, limit);
  return { items: items.map((u) => customerSummary(u, orders)), meta };
}

export async function getCustomer(id) {
  const [users, orders] = await Promise.all([readCollection('users'), readCollection('orders')]);
  const user = users.find((u) => u.userId === id && u.role === 'customer');
  if (!user) throw notFound('Customer');
  return {
    ...customerSummary(user, orders),
    orders: orders
      .filter((o) => o.userId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(orderView),
  };
}

/** Disabling a customer also signs them out everywhere. */
export function setCustomerStatus(id, body) {
  return withLock(async () => {
    const status = String(body?.status ?? '').toLowerCase();
    if (!['active', 'disabled'].includes(status))
      throw new AppError(400, 'Validation failed.', 'VALIDATION_ERROR', { status: 'Status must be "active" or "disabled".' });
    const users = await readCollection('users');
    const user = users.find((u) => u.userId === id && u.role === 'customer');
    if (!user) throw notFound('Customer');
    const updated = {
      ...user,
      status,
      tokenVersion: status === 'disabled' ? (user.tokenVersion || 0) + 1 : user.tokenVersion || 0,
      updatedAt: new Date().toISOString(),
    };
    await writeCollections({ users: users.map((u) => (u.userId === id ? updated : u)) });
    return safeUser(updated);
  });
}
