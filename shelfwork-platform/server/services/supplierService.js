import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { generateId, PREFIX } from '../utils/ids.js';
import { conflict, notFound, throwIfInvalid } from '../utils/errors.js';
import { cleanString, ensureBody, isEmail, isPhone } from '../utils/validators.js';

function clean(input) {
  const details = {};
  const supplierName = cleanString(details, 'supplierName', input.supplierName, { required: true, max: 120, label: 'Supplier name' });
  const contactPerson = cleanString(details, 'contactPerson', input.contactPerson, { required: true, max: 120, label: 'Contact person' });
  const email = cleanString(details, 'email', input.email, { required: true, max: 120, label: 'Email' }).toLowerCase();
  const phone = cleanString(details, 'phone', input.phone, { required: true, max: 20, label: 'Phone' });
  const address = cleanString(details, 'address', input.address, { max: 250, label: 'Address' });

  if (email && !details.email && !isEmail(email)) details.email = 'Enter a valid email address.';
  if (phone && !details.phone && !isPhone(phone))
    details.phone = 'Enter a valid phone number (digits, spaces, + ( ) - only, at least 7 digits).';

  throwIfInvalid(details);
  return { supplierName, contactPerson, email, phone, address };
}

function assertUnique(suppliers, values, ignoreId) {
  const others = suppliers.filter((s) => s.supplierId !== ignoreId);
  if (others.some((s) => s.supplierName.toLowerCase() === values.supplierName.toLowerCase()))
    throw conflict(`A supplier named "${values.supplierName}" already exists.`, 'DUPLICATE_SUPPLIER');
  if (others.some((s) => s.email.toLowerCase() === values.email))
    throw conflict(`A supplier with the email "${values.email}" already exists.`, 'DUPLICATE_SUPPLIER');
}

export async function listSuppliers() {
  const suppliers = await readCollection('suppliers');
  return [...suppliers].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
}

export async function getSupplier(id) {
  const supplier = (await readCollection('suppliers')).find((s) => s.supplierId === id);
  if (!supplier) throw notFound('Supplier');
  return supplier;
}

export function createSupplier(body) {
  return withLock(async () => {
    const values = clean(ensureBody(body));
    const suppliers = await readCollection('suppliers');
    assertUnique(suppliers, values);
    const now = new Date().toISOString();
    const supplier = {
      supplierId: generateId(PREFIX.supplier, suppliers.map((s) => s.supplierId)),
      ...values,
      createdAt: now,
      updatedAt: now,
    };
    await writeCollections({ suppliers: [...suppliers, supplier] });
    return supplier;
  });
}

export function updateSupplier(id, body) {
  return withLock(async () => {
    ensureBody(body);
    const [suppliers, products] = await Promise.all([readCollection('suppliers'), readCollection('products')]);
    const current = suppliers.find((s) => s.supplierId === id);
    if (!current) throw notFound('Supplier');

    const values = clean({ ...current, ...body });
    assertUnique(suppliers, values, id);

    const updated = { ...current, ...values, updatedAt: new Date().toISOString() };
    const updates = { suppliers: suppliers.map((s) => (s.supplierId === id ? updated : s)) };

    // Products store the supplier name, so a rename must follow through to them.
    if (current.supplierName !== updated.supplierName) {
      updates.products = products.map((p) =>
        p.supplier === current.supplierName ? { ...p, supplier: updated.supplierName } : p
      );
    }
    await writeCollections(updates);
    return updated;
  });
}

export function deleteSupplier(id) {
  return withLock(async () => {
    const [suppliers, products] = await Promise.all([readCollection('suppliers'), readCollection('products')]);
    const current = suppliers.find((s) => s.supplierId === id);
    if (!current) throw notFound('Supplier');

    const inUse = products.filter((p) => p.supplier === current.supplierName).length;
    if (inUse > 0)
      throw conflict(
        `Cannot delete "${current.supplierName}": ${inUse} product${inUse > 1 ? 's are' : ' is'} supplied by them. Reassign or delete them first.`,
        'SUPPLIER_IN_USE',
        { productCount: inUse }
      );

    await writeCollections({ suppliers: suppliers.filter((s) => s.supplierId !== id) });
    return current;
  });
}
