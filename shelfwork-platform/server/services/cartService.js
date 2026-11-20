import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { AppError, notFound, throwIfInvalid, validationError } from '../utils/errors.js';
import { isValidId, PREFIX } from '../utils/ids.js';
import { cleanInteger, ensureBody } from '../utils/validators.js';
import { CART_MAX_LINES, SHIPPING } from '../config.js';
import { computeStatus, isListed } from './productService.js';

const round2 = (n) => Math.round(n * 100) / 100;

export function shippingFor(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= SHIPPING.freeOver ? 0 : SHIPPING.flatFee;
}

/**
 * Turn raw cart lines into what the shopper sees, using current prices and stock.
 * Lines with a problem are flagged (issue) and left out of the totals.
 */
export function priceCart(lines, products) {
  const byId = new Map(products.map((p) => [p.productId, p]));
  const items = lines.map((line) => {
    const p = byId.get(line.productId);
    if (!p)
      return { productId: line.productId, productName: 'Product no longer sold', imageUrl: '', unitPrice: 0, quantity: line.quantity, availableQuantity: 0, lineTotal: 0, status: 'out', issue: 'This product is no longer sold. Remove it to continue.' };
    let issue = null;
    if (!isListed(p)) issue = 'This product is currently unavailable.';
    else if (p.quantity <= 0) issue = 'Out of stock.';
    else if (line.quantity > p.quantity) issue = `Only ${p.quantity} left in stock. Lower the quantity to continue.`;
    return {
      productId: p.productId,
      productName: p.productName,
      category: p.category,
      imageUrl: p.imageUrl || '',
      unitPrice: p.price,
      quantity: line.quantity,
      availableQuantity: p.quantity,
      lineTotal: round2(p.price * line.quantity),
      status: computeStatus(p),
      issue,
    };
  });

  const valid = items.filter((i) => !i.issue);
  const subtotal = round2(valid.reduce((s, i) => s + i.lineTotal, 0));
  const shippingFee = shippingFor(subtotal);
  return {
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    shippingFee,
    total: round2(subtotal + shippingFee),
    hasIssues: items.some((i) => i.issue),
    freeShippingOver: SHIPPING.freeOver,
  };
}

const findCart = (carts, userId) => carts.find((c) => c.userId === userId) || { userId, items: [], updatedAt: null };

function saveCart(carts, cart) {
  const next = { ...cart, updatedAt: new Date().toISOString() };
  const others = carts.filter((c) => c.userId !== cart.userId);
  return next.items.length ? [...others, next] : others; // empty carts are not stored
}

function cleanLine(body, { requireId = true } = {}) {
  ensureBody(body);
  const details = {};
  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  if (requireId && !productId) details.productId = 'Product ID is required.';
  else if (requireId && !isValidId(PREFIX.product, productId)) details.productId = 'Product ID format is invalid.';
  const quantity = cleanInteger(details, 'quantity', body.quantity, { min: 1, label: 'Quantity', defaultValue: requireId ? 1 : undefined });
  throwIfInvalid(details);
  return { productId, quantity };
}

function purchasable(product) {
  if (!product || !isListed(product)) throw new AppError(404, 'This product is not available.', 'PRODUCT_UNAVAILABLE');
  if (product.quantity <= 0) throw new AppError(400, `"${product.productName}" is out of stock.`, 'INSUFFICIENT_STOCK', { available: 0 });
}

export async function getCart(userId) {
  const [carts, products] = await Promise.all([readCollection('carts'), readCollection('products')]);
  return priceCart(findCart(carts, userId).items, products);
}

export function addItem(userId, body) {
  return withLock(async () => {
    const { productId, quantity } = cleanLine(body);
    const [carts, products] = await Promise.all([readCollection('carts'), readCollection('products')]);
    const product = products.find((p) => p.productId === productId);
    purchasable(product);

    const cart = findCart(carts, userId);
    const existing = cart.items.find((i) => i.productId === productId);
    const inCart = existing?.quantity || 0;
    if (inCart + quantity > product.quantity)
      throw new AppError(
        400,
        inCart
          ? `You already have ${inCart} in your cart. Only ${product.quantity} are in stock.`
          : `Only ${product.quantity} of "${product.productName}" are in stock.`,
        'INSUFFICIENT_STOCK',
        { available: product.quantity, inCart, requested: quantity }
      );
    if (!existing && cart.items.length >= CART_MAX_LINES)
      throw validationError({ cart: `A cart can hold up to ${CART_MAX_LINES} different products.` });

    const items = existing
      ? cart.items.map((i) => (i.productId === productId ? { ...i, quantity: inCart + quantity } : i))
      : [...cart.items, { productId, quantity, addedAt: new Date().toISOString() }];
    const nextCarts = saveCart(carts, { ...cart, items });
    await writeCollections({ carts: nextCarts });
    return priceCart(items, products);
  });
}

export function updateItem(userId, productId, body) {
  return withLock(async () => {
    const { quantity } = cleanLine({ ...body, productId }, { requireId: false });
    if (quantity === undefined) throw validationError({ quantity: 'Quantity is required.' });
    const [carts, products] = await Promise.all([readCollection('carts'), readCollection('products')]);
    const cart = findCart(carts, userId);
    if (!cart.items.some((i) => i.productId === productId)) throw notFound('Cart item');
    const product = products.find((p) => p.productId === productId);
    purchasable(product);
    if (quantity > product.quantity)
      throw new AppError(400, `Only ${product.quantity} of "${product.productName}" are in stock.`, 'INSUFFICIENT_STOCK', {
        available: product.quantity,
        requested: quantity,
      });
    const items = cart.items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
    await writeCollections({ carts: saveCart(carts, { ...cart, items }) });
    return priceCart(items, products);
  });
}

export function removeItem(userId, productId) {
  return withLock(async () => {
    const [carts, products] = await Promise.all([readCollection('carts'), readCollection('products')]);
    const cart = findCart(carts, userId);
    if (!cart.items.some((i) => i.productId === productId)) throw notFound('Cart item');
    const items = cart.items.filter((i) => i.productId !== productId);
    await writeCollections({ carts: saveCart(carts, { ...cart, items }) });
    return priceCart(items, products);
  });
}

export function clearCart(userId) {
  return withLock(async () => {
    const carts = await readCollection('carts');
    await writeCollections({ carts: carts.filter((c) => c.userId !== userId) });
    return priceCart([], []);
  });
}

function cleanLineList(body) {
  ensureBody(body);
  if (!Array.isArray(body.items)) throw validationError({ items: 'items must be a list of { productId, quantity }.' });
  if (body.items.length > CART_MAX_LINES) throw validationError({ items: `A cart can hold up to ${CART_MAX_LINES} different products.` });
  const merged = new Map();
  body.items.forEach((raw, index) => {
    const details = {};
    const productId = typeof raw?.productId === 'string' ? raw.productId.trim() : '';
    if (!isValidId(PREFIX.product, productId)) details[`items[${index}].productId`] = 'Product ID format is invalid.';
    const quantity = cleanInteger(details, `items[${index}].quantity`, raw?.quantity, { min: 1, label: 'Quantity' });
    throwIfInvalid(details);
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  });
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

/** Price a guest's cart (kept in their browser) without logging in. Nothing is saved. */
export async function previewCart(body) {
  const lines = cleanLineList(body);
  return priceCart(lines, await readCollection('products'));
}

/** After login, move the guest cart into the account. Quantities are capped at what is in stock. */
export function mergeCart(userId, body) {
  return withLock(async () => {
    const lines = cleanLineList(body);
    const [carts, products] = await Promise.all([readCollection('carts'), readCollection('products')]);
    const cart = findCart(carts, userId);
    const items = [...cart.items];
    const adjustments = [];
    for (const line of lines) {
      const p = products.find((x) => x.productId === line.productId);
      if (!p || !isListed(p) || p.quantity <= 0) {
        adjustments.push({ productId: line.productId, message: 'Skipped: no longer available.' });
        continue;
      }
      const existing = items.find((i) => i.productId === line.productId);
      const wanted = (existing?.quantity || 0) + line.quantity;
      const quantity = Math.min(wanted, p.quantity);
      if (quantity < wanted) adjustments.push({ productId: p.productId, message: `Reduced to ${quantity}: only ${p.quantity} in stock.` });
      if (existing) existing.quantity = quantity;
      else if (items.length < CART_MAX_LINES) items.push({ productId: p.productId, quantity, addedAt: new Date().toISOString() });
    }
    await writeCollections({ carts: saveCart(carts, { ...cart, items }) });
    return { ...priceCart(items, products), adjustments };
  });
}
