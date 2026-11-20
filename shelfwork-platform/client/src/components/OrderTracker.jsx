import { Check, X } from 'lucide-react';
import { ORDER_FLOW, formatDateTime } from '../utils.js';

/** Horizontal progress: Pending → Confirmed → Processing → Shipped → Delivered. */
export default function OrderTracker({ order }) {
  const cancelled = order.status === 'Cancelled';
  const reached = new Map(order.statusHistory.map((h) => [h.status, h.at]));
  const currentIndex = ORDER_FLOW.indexOf(order.status);

  return (
    <ol className={`tracker ${cancelled ? 'tracker--cancelled' : ''}`}>
      {ORDER_FLOW.map((step, i) => {
        const done = reached.has(step);
        const current = i === currentIndex;
        return (
          <li key={step} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
            <span className="tracker__dot">{done && <Check size={14} strokeWidth={2} />}</span>
            <span className="tracker__label">{step}</span>
            <span className="tracker__time">{done ? formatDateTime(reached.get(step)) : ''}</span>
          </li>
        );
      })}
      {cancelled && (
        <li className="is-done is-current tracker__cancel">
          <span className="tracker__dot">
            <X size={14} strokeWidth={2} />
          </span>
          <span className="tracker__label">Cancelled</span>
          <span className="tracker__time">{formatDateTime(order.cancelledAt)}</span>
        </li>
      )}
    </ol>
  );
}
