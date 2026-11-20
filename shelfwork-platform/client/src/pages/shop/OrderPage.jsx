import { useState } from 'react';
import { ArrowLeft, CheckCircle2, PackageX } from 'lucide-react';
import OrderTracker from '../../components/OrderTracker.jsx';
import OrderStatusBadge from '../../components/OrderStatusBadge.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { CUSTOMER_CANCELLABLE, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, formatCurrency, formatDateTime } from '../../utils.js';

export default function OrderPage({ orderId, justPlaced }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api(`/orders/${orderId}`), [orderId]);
  const order = data?.data;

  if (loading && !order) return <div className="container section"><Loading /></div>;
  if (error?.status === 404)
    return <div className="container section"><EmptyState icon={PackageX} title="Order not found" action={<a className="btn btn--primary" href="#/account">My orders</a>} /></div>;
  if (error) return <div className="container section"><ErrorNotice error={error} onRetry={reload} /></div>;

  const canCancel = CUSTOMER_CANCELLABLE.includes(order.status);

  return (
    <section className="section section--tight">
      <div className="container order">
        <a href="#/account" className="back-link"><ArrowLeft size={16} strokeWidth={1.5} /> My orders</a>

        {justPlaced && (
          <div className="confirmation">
            <CheckCircle2 size={44} strokeWidth={1} />
            <div>
              <h2>Thank you, your order is in</h2>
              <p>
                Order <strong>{order.orderId}</strong> has been placed. A confirmation has been recorded for {order.customer.email}.
                {order.paymentMethod === 'COD' ? ` Please prepare ${formatCurrency(order.total)} in cash for the courier.` : ' Your simulated payment was successful.'}
              </p>
            </div>
          </div>
        )}

        <div className="order__head">
          <div>
            <p className="eyebrow">Order {order.orderId}</p>
            <h1>Placed {formatDateTime(order.createdAt)}</h1>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <OrderTracker order={order} />

        <div className="order__grid">
          <div className="panel">
            <h3>Items</h3>
            <ul className="order-items">
              {order.items.map((i) => (
                <li key={i.productId}>
                  <ProductImage product={i} size="sm" />
                  <span>
                    {i.productName}
                    <small>{i.quantity} × {formatCurrency(i.unitPrice)}</small>
                  </span>
                  <strong>{formatCurrency(i.lineTotal)}</strong>
                </li>
              ))}
            </ul>
            <dl className="totals">
              <div><dt>Subtotal</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{order.shippingFee ? formatCurrency(order.shippingFee) : 'Free'}</dd></div>
              <div className="totals__grand"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
            </dl>
          </div>

          <div className="order__side">
            <div className="panel">
              <h3>Delivery</h3>
              <p className="addr">
                <strong>{order.customer.fullName}</strong><br />
                {order.customer.address}<br />
                {order.customer.phone}<br />
                {order.customer.email}
              </p>
              {order.notes && <p className="muted">Note: {order.notes}</p>}
            </div>
            <div className="panel">
              <h3>Payment</h3>
              <p>{PAYMENT_LABEL[order.paymentMethod]}</p>
              <p className={`pay-status pay-status--${order.paymentStatus.toLowerCase()}`}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</p>
            </div>
            {canCancel && (
              <button className="btn btn--danger-outline btn--block" onClick={() => setConfirming(true)}>Cancel order</button>
            )}
            {order.status === 'Cancelled' && order.cancelReason && <p className="muted">Cancelled: {order.cancelReason}</p>}
          </div>
        </div>

        <div className="panel">
          <h3>History</h3>
          <ol className="timeline">
            {[...order.statusHistory].reverse().map((h, idx) => (
              <li key={idx}>
                <OrderStatusBadge status={h.status} />
                <span>{h.note}</span>
                <time>{formatDateTime(h.at)}</time>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Cancel this order?"
          confirmLabel="Cancel order"
          cancelLabel="Keep order"
          danger
          withReason
          onClose={() => setConfirming(false)}
          onConfirm={async (reason) => {
            await api(`/orders/${order.orderId}/cancel`, { method: 'PUT', body: { reason } });
            toast('Your order has been cancelled.', 'success');
            reload();
          }}
        >
          <p>Order <strong>{order.orderId}</strong> ({formatCurrency(order.total)}) will be cancelled. {order.paymentStatus === 'PAID' ? 'Your simulated payment will be marked as refunded.' : ''}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
