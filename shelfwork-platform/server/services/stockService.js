import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { AppError, notFound, throwIfInvalid } from '../utils/errors.js';
import { isValidId, PREFIX } from '../utils/ids.js';
import { cleanInteger, cleanString, ensureBody } from '../utils/validators.js';
import { paginate, parsePagination } from '../utils/pagination.js';
import { buildTransaction } from '../utils/transaction.js';
import { computeStatus, withStatus } from './productService.js';

const TYPES = ['IN', 'OUT', 'ADJUSTMENT'];
const SOURCES = ['ORDER', 'MANUAL'];

function cleanProductId(details, value) {
  const productId = typeof value === 'string' ? value.trim() : '';
  if (!productId) details.productId = 'Product ID is required.';
  else if (!isValidId(PREFIX.product, productId)) details.productId = 'Product ID format is invalid. Expected PRD-xxxxxxxx.';
  return productId;
}

/** Save the new quantity and its transaction together, so they can never drift apart. */
async function commit(products, transactions, product, fields) {
  const now = new Date().toISOString();
  const updated = { ...product, quantity: fields.newQuantity, updatedAt: now };
  const transaction = buildTransaction({ product: updated, existing: transactions, now, ...fields });
  await writeCollections({
    products: products.map((p) => (p.productId === product.productId ? updated : p)),
    transactions: [transaction, ...transactions],
  });
  return { product: withStatus(updated), transaction };
}

function applyStock(type, body, actor) {
  return withLock(async () => {
    ensureBody(body);
    const details = {};
    const productId = cleanProductId(details, body.productId);
    const quantity = cleanInteger(details, 'quantity', body.quantity, { min: 1, label: 'Quantity' });
    const reason = cleanString(details, 'reason', body.reason, { max: 200, label: 'Reason' });
    throwIfInvalid(details);

    const [products, transactions] = await Promise.all([readCollection('products'), readCollection('transactions')]);
    const product = products.find((p) => p.productId === productId);
    if (!product) throw notFound('Product');

    const previousQuantity = product.quantity;
    const newQuantity = type === 'IN' ? previousQuantity + quantity : previousQuantity - quantity;

    if (newQuantity < 0)
      throw new AppError(
        400,
        `Cannot remove ${quantity} units of "${product.productName}": only ${previousQuantity} in stock.`,
        'INSUFFICIENT_STOCK',
        { available: previousQuantity, requested: quantity }
      );

    return commit(products, transactions, product, {
      type, quantity, previousQuantity, newQuantity,
      reason: reason || (type === 'IN' ? 'Stock received' : 'Stock removed'),
      referenceType: 'MANUAL',
      performedBy: actor?.userId ?? null,
    });
  });
}

export const stockIn = (body, actor) => applyStock('IN', body, actor);
export const stockOut = (body, actor) => applyStock('OUT', body, actor);

/** Set the count to what is physically on the shelf (e.g. after a stocktake). A reason is required. */
export function adjustStock(body, actor) {
  return withLock(async () => {
    ensureBody(body);
    const details = {};
    const productId = cleanProductId(details, body.productId);
    const newQuantity = cleanInteger(details, 'newQuantity', body.newQuantity, { label: 'New quantity' });
    const reason = cleanString(details, 'reason', body.reason, { required: true, max: 200, label: 'Reason' });
    throwIfInvalid(details);

    const [products, transactions] = await Promise.all([readCollection('products'), readCollection('transactions')]);
    const product = products.find((p) => p.productId === productId);
    if (!product) throw notFound('Product');
    if (product.quantity === newQuantity)
      throw new AppError(400, `"${product.productName}" already has ${newQuantity} units. Nothing to adjust.`, 'NO_CHANGE');

    return commit(products, transactions, product, {
      type: 'ADJUSTMENT',
      quantity: Math.abs(newQuantity - product.quantity),
      previousQuantity: product.quantity,
      newQuantity,
      reason,
      referenceType: 'MANUAL',
      performedBy: actor?.userId ?? null,
    });
  });
}

export async function listTransactions(query = {}) {
  const details = {};
  const productId = typeof query.productId === 'string' ? query.productId.trim() : '';
  if (productId && !isValidId(PREFIX.product, productId)) details.productId = 'Product ID format is invalid. Expected PRD-xxxxxxxx.';

  let type = '';
  if (query.type !== undefined && query.type !== '') {
    type = String(query.type).toUpperCase();
    if (!TYPES.includes(type)) details.type = `Type must be one of: ${TYPES.join(', ')}.`;
  }
  let source = '';
  if (query.source !== undefined && query.source !== '') {
    source = String(query.source).toUpperCase();
    if (!SOURCES.includes(source)) details.source = 'Source must be "order" or "manual".';
  }
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
  const { page, limit } = parsePagination(query, details);
  throwIfInvalid(details);

  const [transactions, users] = await Promise.all([readCollection('transactions'), readCollection('users')]);
  const names = new Map(users.map((u) => [u.userId, { name: u.fullName, role: u.role }]));
  const filtered = transactions
    .filter((t) => !productId || t.productId === productId)
    .filter((t) => !type || t.type === type)
    .filter((t) => !source || (t.referenceType || 'MANUAL') === source)
    .filter(
      (t) =>
        !search ||
        t.productName.toLowerCase().includes(search) ||
        (t.referenceId || '').toLowerCase().includes(search) ||
        (t.reason || '').toLowerCase().includes(search)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Show who made each change by name (never more than name and role).
  const { items, meta } = paginate(filtered, page, limit);
  return {
    items: items.map((t) => ({
      ...t,
      performedByName: names.get(t.performedBy)?.name ?? null,
      performedByRole: names.get(t.performedBy)?.role ?? null,
    })),
    meta,
  };
}

export async function listLowStock() {
  return (await readCollection('products'))
    .filter((p) => computeStatus(p) === 'low')
    .sort((a, b) => a.quantity - b.quantity)
    .map(withStatus);
}

export async function listOutOfStock() {
  return (await readCollection('products'))
    .filter((p) => computeStatus(p) === 'out')
    .sort((a, b) => a.productName.localeCompare(b.productName))
    .map(withStatus);
}
