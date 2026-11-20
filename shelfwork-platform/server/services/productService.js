import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { generateId, PREFIX } from '../utils/ids.js';
import { conflict, notFound, throwIfInvalid } from '../utils/errors.js';
import {
  cleanBoolean,
  cleanImageUrl,
  cleanInteger,
  cleanPrice,
  cleanString,
  ensureBody,
} from '../utils/validators.js';
import { paginate, parsePagination, sortItems } from '../utils/pagination.js';
import { buildTransaction } from '../utils/transaction.js';

export const DEFAULT_THRESHOLD = 10;
const SORT_FIELDS = ['productName', 'category', 'quantity', 'price', 'createdAt', 'updatedAt'];
const STATUS_ALIASES = {
  in: 'in', 'in-stock': 'in',
  low: 'low', 'low-stock': 'low',
  out: 'out', 'out-of-stock': 'out',
};

/** out = none left, low = at or below the product's own threshold, in = healthy. */
export function computeStatus(p) {
  if (p.quantity <= 0) return 'out';
  if (p.quantity <= p.lowStockThreshold) return 'low';
  return 'in';
}

/** Records created before availability existed count as available. */
export const isListed = (p) => p.isAvailable !== false;

/** Full record for admins. */
export const withStatus = (p) => ({
  ...p,
  imageUrl: p.imageUrl || '',
  isAvailable: isListed(p),
  isFeatured: Boolean(p.isFeatured),
  status: computeStatus(p),
});

/** What shoppers see: no supplier, threshold or internal timestamps. */
export function publicView(p) {
  return {
    productId: p.productId,
    productName: p.productName,
    category: p.category,
    description: p.description,
    price: p.price,
    quantity: p.quantity,
    imageUrl: p.imageUrl || '',
    isFeatured: Boolean(p.isFeatured),
    status: computeStatus(p),
    createdAt: p.createdAt,
  };
}

export const viewFor = (viewer) => (viewer === 'admin' ? withStatus : publicView);

const findByName = (list, key, name) => list.find((x) => x[key].toLowerCase() === name.toLowerCase());

function cleanProduct(input, { categories, suppliers }) {
  const details = {};

  const productName = cleanString(details, 'productName', input.productName, { required: true, max: 120, label: 'Product name' });

  let category = cleanString(details, 'category', input.category, { required: true, max: 60, label: 'Category' });
  if (category && !details.category) {
    const match = findByName(categories, 'categoryName', category);
    if (match) category = match.categoryName;
    else details.category = `Category "${category}" does not exist. Create it first.`;
  }

  const description = cleanString(details, 'description', input.description, { max: 500, label: 'Description' });

  let supplier = cleanString(details, 'supplier', input.supplier, { max: 120, label: 'Supplier' });
  if (supplier && !details.supplier) {
    const match = findByName(suppliers, 'supplierName', supplier);
    if (match) supplier = match.supplierName;
    else details.supplier = `Supplier "${supplier}" does not exist. Register it first.`;
  }

  const quantity = cleanInteger(details, 'quantity', input.quantity, { label: 'Quantity' });
  const price = cleanPrice(details, 'price', input.price, { label: 'Price' });
  const lowStockThreshold = cleanInteger(details, 'lowStockThreshold', input.lowStockThreshold, {
    label: 'Low stock threshold',
    defaultValue: DEFAULT_THRESHOLD,
  });
  const imageUrl = cleanImageUrl(details, 'imageUrl', input.imageUrl);
  const isAvailable = cleanBoolean(details, 'isAvailable', input.isAvailable, { label: 'Availability', defaultValue: true });
  const isFeatured = cleanBoolean(details, 'isFeatured', input.isFeatured, { label: 'Featured', defaultValue: false });

  throwIfInvalid(details);
  return { productName, category, description, supplier, quantity, price, lowStockThreshold, imageUrl, isAvailable, isFeatured };
}

function assertUniqueName(products, name, ignoreId) {
  if (products.some((p) => p.productName.toLowerCase() === name.toLowerCase() && p.productId !== ignoreId))
    throw conflict(`A product named "${name}" already exists.`, 'DUPLICATE_PRODUCT');
}

/**
 * List products. viewer 'public' (default) only sees products that are available for sale;
 * viewer 'admin' sees everything and may filter by availability.
 */
export async function listProducts(query = {}, { viewer = 'public' } = {}) {
  const details = {};
  const admin = viewer === 'admin';
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
  const category = typeof query.category === 'string' ? query.category.trim().toLowerCase() : '';

  let status = '';
  if (query.status !== undefined && query.status !== '') {
    status = STATUS_ALIASES[String(query.status).toLowerCase()];
    if (!status) details.status = 'Status must be one of: in, low, out (or in-stock, low-stock, out-of-stock).';
  }

  let availability = '';
  if (admin && query.availability !== undefined && query.availability !== '') {
    availability = String(query.availability).toLowerCase();
    if (!['available', 'unavailable'].includes(availability))
      details.availability = 'Availability must be "available" or "unavailable".';
  }

  const featured = query.featured === 'true';
  const inStock = query.inStock === 'true';
  const { page, limit } = parsePagination(query, details);

  const sortBy = query.sortBy ?? 'createdAt';
  if (!SORT_FIELDS.includes(sortBy)) details.sortBy = `sortBy must be one of: ${SORT_FIELDS.join(', ')}.`;

  const order = String(query.order ?? 'desc').toLowerCase();
  if (!['asc', 'desc'].includes(order)) details.order = 'order must be "asc" or "desc".';

  throwIfInvalid(details);

  const filtered = (await readCollection('products'))
    .filter((p) => admin || isListed(p))
    .filter((p) => !availability || (availability === 'available') === isListed(p))
    .filter(
      (p) =>
        !search ||
        p.productName.toLowerCase().includes(search) ||
        (admin && (p.supplier || '').toLowerCase().includes(search))
    )
    .filter((p) => !category || p.category.toLowerCase() === category)
    .filter((p) => !status || computeStatus(p) === status)
    .filter((p) => !featured || p.isFeatured)
    .filter((p) => !inStock || p.quantity > 0);

  const { items, meta } = paginate(sortItems(filtered, sortBy, order), page, limit);
  return { items: items.map(viewFor(viewer)), meta };
}

export async function getProduct(id, { viewer = 'public' } = {}) {
  const product = (await readCollection('products')).find((p) => p.productId === id);
  if (!product || (viewer !== 'admin' && !isListed(product))) throw notFound('Product');
  return viewFor(viewer)(product);
}

/** Can a shopper buy `quantity` of this product right now? */
export async function checkAvailability(id, rawQuantity) {
  const details = {};
  const requested = cleanInteger(details, 'quantity', rawQuantity, { min: 1, label: 'Quantity', defaultValue: 1 });
  throwIfInvalid(details);
  const product = (await readCollection('products')).find((p) => p.productId === id);
  if (!product || !isListed(product)) throw notFound('Product');
  return {
    productId: product.productId,
    availableQuantity: product.quantity,
    requestedQuantity: requested,
    status: computeStatus(product),
    canPurchase: product.quantity >= requested,
  };
}

export function createProduct(body, actor = null) {
  return withLock(async () => {
    ensureBody(body);
    const [products, categories, suppliers, transactions] = await Promise.all([
      readCollection('products'),
      readCollection('categories'),
      readCollection('suppliers'),
      readCollection('transactions'),
    ]);

    const values = cleanProduct(body, { categories, suppliers });
    assertUniqueName(products, values.productName);

    const now = new Date().toISOString();
    const product = {
      productId: generateId(PREFIX.product, products.map((p) => p.productId)),
      ...values,
      createdAt: now,
      updatedAt: now,
    };

    const updates = { products: [product, ...products] };
    if (product.quantity > 0) {
      // Opening stock is recorded so history always adds up to the current quantity.
      updates.transactions = [
        buildTransaction({
          product, type: 'IN', quantity: product.quantity, previousQuantity: 0,
          newQuantity: product.quantity, reason: 'Initial stock', existing: transactions, now,
          performedBy: actor?.userId ?? null,
        }),
        ...transactions,
      ];
    }
    await writeCollections(updates);
    return withStatus(product);
  });
}

export function updateProduct(id, body, actor = null) {
  return withLock(async () => {
    ensureBody(body);
    const [products, categories, suppliers, transactions] = await Promise.all([
      readCollection('products'),
      readCollection('categories'),
      readCollection('suppliers'),
      readCollection('transactions'),
    ]);
    const current = products.find((p) => p.productId === id);
    if (!current) throw notFound('Product');

    const values = cleanProduct({ ...withStatus(current), ...body }, { categories, suppliers });
    assertUniqueName(products, values.productName, id);

    const now = new Date().toISOString();
    const updated = { ...current, ...values, updatedAt: now };
    const updates = { products: products.map((p) => (p.productId === id ? updated : p)) };

    if (updated.quantity !== current.quantity) {
      // A quantity edited here is logged as an ADJUSTMENT so the history stays consistent.
      updates.transactions = [
        buildTransaction({
          product: updated, type: 'ADJUSTMENT', quantity: Math.abs(updated.quantity - current.quantity),
          previousQuantity: current.quantity, newQuantity: updated.quantity,
          reason: 'Quantity changed by product update', existing: transactions, now,
          performedBy: actor?.userId ?? null,
        }),
        ...transactions,
      ];
    }
    await writeCollections(updates);
    return withStatus(updated);
  });
}

export function deleteProduct(id) {
  return withLock(async () => {
    const [products, carts] = await Promise.all([readCollection('products'), readCollection('carts')]);
    const current = products.find((p) => p.productId === id);
    if (!current) throw notFound('Product');
    // Transaction history and past orders keep a snapshot of the name, so they stay readable.
    await writeCollections({
      products: products.filter((p) => p.productId !== id),
      carts: carts.map((c) => ({ ...c, items: c.items.filter((i) => i.productId !== id) })),
    });
    return withStatus(current);
  });
}
