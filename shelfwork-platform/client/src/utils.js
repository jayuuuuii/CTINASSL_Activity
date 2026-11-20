const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });

export const formatCurrency = (n) => currency.format(Number(n) || 0);

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

/** Stock status comes from the API ('in' | 'low' | 'out'); this is a fallback for older records. */
export function getStatus(product) {
  if (product.status) return product.status;
  if (product.quantity <= 0) return 'out';
  if (product.quantity <= product.lowStockThreshold) return 'low';
  return 'in';
}

export const STATUS_LABEL = { in: 'In stock', low: 'Low stock', out: 'Out of stock' };

export const ORDER_FLOW = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
export const ORDER_STATUSES = [...ORDER_FLOW, 'Cancelled'];
export const NEXT_STATUS = { Pending: 'Confirmed', Confirmed: 'Processing', Processing: 'Shipped', Shipped: 'Delivered' };
export const CUSTOMER_CANCELLABLE = ['Pending', 'Confirmed'];
export const ADMIN_CANCELLABLE = ['Pending', 'Confirmed', 'Processing'];

export const PAYMENT_LABEL = { COD: 'Cash on Delivery', ONLINE_SIMULATED: 'Simulated Online Payment' };
export const PAYMENT_STATUS_LABEL = { PAID: 'Paid', PENDING: 'Awaiting payment', REFUNDED: 'Refunded (simulated)', VOIDED: 'Voided' };

/** A fresh key per checkout attempt; reused on retries so the server never creates two orders. */
export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const pluralize = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
