import crypto from 'node:crypto';

export const PREFIX = {
  product: 'PRD',
  category: 'CAT',
  supplier: 'SUP',
  transaction: 'TXN',
  user: 'USR',
  order: 'ORD',
  payment: 'PAY',
};

/** e.g. PRD-3f9a1c2b — prefix plus 8 random hex characters, never repeating an existing ID. */
export function generateId(prefix, existingIds = []) {
  const taken = existingIds instanceof Set ? existingIds : new Set(existingIds);
  let id;
  do {
    id = `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
  } while (taken.has(id));
  return id;
}

export const isValidId = (prefix, id) =>
  typeof id === 'string' && new RegExp(`^${prefix}-[0-9a-f]{8}$`).test(id);
