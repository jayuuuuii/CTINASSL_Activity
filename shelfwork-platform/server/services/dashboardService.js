import { readCollection } from '../utils/fileStore.js';
import { throwIfInvalid } from '../utils/errors.js';
import { computeStatus, withStatus } from './productService.js';

const round2 = (n) => Math.round(n * 100) / 100;

function parseLimit(query, fallback = 5) {
  const details = {};
  let limit = fallback;
  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) details.limit = 'Limit must be a whole number between 1 and 50.';
  }
  throwIfInvalid(details);
  return limit;
}

/** Everything here is calculated from the stored records on each request. */
export async function getStats() {
  const products = await readCollection('products');
  let availableStockUnits = 0;
  let lowStockItems = 0;
  let outOfStockItems = 0;
  let totalInventoryValue = 0;

  for (const p of products) {
    availableStockUnits += p.quantity;
    totalInventoryValue += p.quantity * p.price;
    const status = computeStatus(p);
    if (status === 'low') lowStockItems += 1;
    if (status === 'out') outOfStockItems += 1;
  }

  return {
    totalProducts: products.length,
    availableStockUnits,
    lowStockItems,
    outOfStockItems,
    wellStockedItems: products.length - lowStockItems - outOfStockItems,
    totalInventoryValue: round2(totalInventoryValue),
  };
}

export async function getRecentProducts(query = {}) {
  const limit = parseLimit(query);
  return (await readCollection('products'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(withStatus);
}

export async function getRecentTransactions(query = {}) {
  const limit = parseLimit(query);
  return (await readCollection('transactions'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getCategorySummary() {
  const [products, categories] = await Promise.all([readCollection('products'), readCollection('categories')]);
  const total = products.length;

  return categories
    .map((c) => {
      const items = products.filter((p) => p.category === c.categoryName);
      return {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        productCount: items.length,
        totalUnits: items.reduce((sum, p) => sum + p.quantity, 0),
        totalValue: round2(items.reduce((sum, p) => sum + p.quantity * p.price, 0)),
        lowStockCount: items.filter((p) => computeStatus(p) === 'low').length,
        outOfStockCount: items.filter((p) => computeStatus(p) === 'out').length,
        percentageOfProducts: total ? Math.round((items.length / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.productCount - a.productCount || a.categoryName.localeCompare(b.categoryName));
}
