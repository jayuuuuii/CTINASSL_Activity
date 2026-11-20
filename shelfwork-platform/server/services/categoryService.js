import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { generateId, PREFIX } from '../utils/ids.js';
import { conflict, notFound, throwIfInvalid } from '../utils/errors.js';
import { cleanString, ensureBody } from '../utils/validators.js';

function clean(input) {
  const details = {};
  const categoryName = cleanString(details, 'categoryName', input.categoryName, { required: true, max: 60, label: 'Category name' });
  const description = cleanString(details, 'description', input.description, { max: 300, label: 'Description' });
  throwIfInvalid(details);
  return { categoryName, description };
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

function assertUniqueName(categories, name, ignoreId) {
  if (categories.some((c) => sameName(c.categoryName, name) && c.categoryId !== ignoreId))
    throw conflict(`A category named "${name}" already exists.`, 'DUPLICATE_CATEGORY');
}

/** Each category with how many products use it (and how many of those are for sale). */
export async function listCategories() {
  const [categories, products] = await Promise.all([readCollection('categories'), readCollection('products')]);
  return [...categories]
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
    .map((c) => {
      const items = products.filter((p) => p.category === c.categoryName);
      return {
        ...c,
        productCount: items.length,
        availableProductCount: items.filter((p) => p.isAvailable !== false).length,
      };
    });
}

export async function getCategory(id) {
  const category = (await readCollection('categories')).find((c) => c.categoryId === id);
  if (!category) throw notFound('Category');
  return category;
}

export function createCategory(body) {
  return withLock(async () => {
    const values = clean(ensureBody(body));
    const categories = await readCollection('categories');
    assertUniqueName(categories, values.categoryName);
    const now = new Date().toISOString();
    const category = {
      categoryId: generateId(PREFIX.category, categories.map((c) => c.categoryId)),
      ...values,
      createdAt: now,
      updatedAt: now,
    };
    await writeCollections({ categories: [...categories, category] });
    return category;
  });
}

export function updateCategory(id, body) {
  return withLock(async () => {
    ensureBody(body);
    const [categories, products] = await Promise.all([readCollection('categories'), readCollection('products')]);
    const current = categories.find((c) => c.categoryId === id);
    if (!current) throw notFound('Category');

    const values = clean({ ...current, ...body });
    assertUniqueName(categories, values.categoryName, id);

    const updated = { ...current, ...values, updatedAt: new Date().toISOString() };
    const updates = { categories: categories.map((c) => (c.categoryId === id ? updated : c)) };

    // Products store the category name, so a rename must follow through to them.
    if (current.categoryName !== updated.categoryName) {
      updates.products = products.map((p) =>
        p.category === current.categoryName ? { ...p, category: updated.categoryName } : p
      );
    }
    await writeCollections(updates);
    return updated;
  });
}

export function deleteCategory(id) {
  return withLock(async () => {
    const [categories, products] = await Promise.all([readCollection('categories'), readCollection('products')]);
    const current = categories.find((c) => c.categoryId === id);
    if (!current) throw notFound('Category');

    const inUse = products.filter((p) => p.category === current.categoryName).length;
    if (inUse > 0)
      throw conflict(
        `Cannot delete "${current.categoryName}": ${inUse} product${inUse > 1 ? 's use' : ' uses'} it. Reassign or delete them first.`,
        'CATEGORY_IN_USE',
        { productCount: inUse }
      );

    await writeCollections({ categories: categories.filter((c) => c.categoryId !== id) });
    return current;
  });
}
