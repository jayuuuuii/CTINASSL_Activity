import { generateId, PREFIX } from './ids.js';

/**
 * Build one inventory transaction record.
 * type: IN | OUT | ADJUSTMENT
 * referenceType: 'ORDER' when caused by a customer order, otherwise 'MANUAL'.
 * performedBy: userId of whoever made the change (null for system/sample data).
 */
export function buildTransaction({
  product,
  type,
  quantity,
  previousQuantity,
  newQuantity,
  reason = '',
  existing = [],
  now,
  referenceType = 'MANUAL',
  referenceId = null,
  performedBy = null,
}) {
  return {
    transactionId: generateId(PREFIX.transaction, existing.map((t) => t.transactionId)),
    productId: product.productId,
    productName: product.productName,
    type,
    quantity,
    previousQuantity,
    newQuantity,
    reason,
    referenceType,
    referenceId,
    performedBy,
    createdAt: now,
  };
}
