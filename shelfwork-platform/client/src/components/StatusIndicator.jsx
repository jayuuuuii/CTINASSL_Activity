import { getStatus, STATUS_LABEL } from '../utils.js';

/** Stock status. `shopper` wording tells customers how many are left instead of "low stock". */
export default function StatusIndicator({ product, shopper = false }) {
  const status = getStatus(product);
  const label = shopper && status === 'low' ? `Only ${product.quantity} left` : STATUS_LABEL[status];
  return (
    <span className={`status status--${status}`}>
      <i className={`dot dot--${status}`} />
      {label}
    </span>
  );
}
