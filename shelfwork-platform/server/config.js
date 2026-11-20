/** Business settings in one place. */
export const SHIPPING = {
  flatFee: 100, // PHP, charged when the subtotal is below freeOver
  freeOver: 3000,
};

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

/** The only forward move allowed from each status. */
export const NEXT_STATUS = {
  Pending: 'Confirmed',
  Confirmed: 'Processing',
  Processing: 'Shipped',
  Shipped: 'Delivered',
};

/** Who may cancel, and from which statuses. Shipped and Delivered orders cannot be cancelled. */
export const CANCELLABLE = {
  customer: ['Pending', 'Confirmed'],
  admin: ['Pending', 'Confirmed', 'Processing'],
};

export const PAYMENT_METHODS = {
  COD: 'Cash on Delivery',
  ONLINE_SIMULATED: 'Simulated Online Payment',
};

export const CART_MAX_LINES = 50;

export const AUTH = {
  tokenTtlHours: 24 * 7,
  minPasswordLength: 8,
  maxLoginFailures: 5,
  lockoutMinutes: 15,
};

export const IMAGE = {
  maxBytes: 2 * 1024 * 1024,
  types: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' },
};
