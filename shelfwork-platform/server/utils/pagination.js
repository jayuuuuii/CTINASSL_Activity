export function parsePagination(query, details, { defaultLimit = 10, maxLimit = 100 } = {}) {
  let page = 1;
  let limit = defaultLimit;

  if (query.page !== undefined) {
    page = Number(query.page);
    if (!Number.isInteger(page) || page < 1) details.page = 'Page must be a whole number, 1 or more.';
  }
  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit)
      details.limit = `Limit must be a whole number between 1 and ${maxLimit}.`;
  }
  return { page, limit };
}

export function paginate(items, page, limit) {
  const totalItems = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
}

export function sortItems(items, sortBy, order) {
  const dir = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const x = a[sortBy];
    const y = b[sortBy];
    const c =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' });
    return c * dir;
  });
}
