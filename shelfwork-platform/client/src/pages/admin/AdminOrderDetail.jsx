import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import OrderTracker from '../../components/OrderTracker.jsx';
import OrderStatusBadge from '../../components/OrderStatusBadge.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ADMIN_CANCELLABLE, NEXT_STATUS, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, formatCurrency, formatDateTime } from '../../utils.js';

const ACTION_LABEL = { Confirmed: 'Confirm order', Processing: 'Start processing', Shipped: 'Mark as shipped', Delivered: 'Mark as delivered' };

export default function AdminOrderDetail({ orderId }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api(`/orders/${orderId}`), [orderId]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const order = data?.data;

  async function advance() {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/orders/${orderId}/status`, { method: 'PUT', body: { status: NEXT_STATUS[order.status], note } });
      toast(`Order ${orderId} is now ${NEXT_STATUS[order.status]}.`, 'success');
      setNote('');
      reload();
    } catch (e) {
      setActionError(e);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout section="orders" title={`Order ${orderId}`} actions={<a className="back-link" href="#/admin/orders"><ArrowLeft size={16} strokeWidth={1.5} /> All orders</a>}>
      <ErrorNotice error={error} onRetry={reload} />
      {loading && !order ? <Loading /> : order && (
        <>
          <div className="panel order-admin-head">
            <div>
              <OrderStatusBadge status={order.status} />
              <span className="muted">Placed {formatDateTime(order.createdAt)} · {PAYMENT_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}</span>
            </div>
            <OrderTracker order={order} />
            {(NEXT_STATUS[order.status] || ADMIN_CANCELLABLE.includes(order.status)) && (
              <div className="order-actions">
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note for the history (optional)" aria-label="Status note" />
                {NEXT_STATUS[order.status] && (
                  <button className="btn btn--primary" onClick={advance} disabled={busy}>
                    {busy ? 'Saving…' : ACTION_LABEL[NEXT_STATUS[order.status]]} <ArrowRight size={16} strokeWidth={1.5} />
                  </button>
                )}
                {ADMIN_CANCELLABLE.includes(order.status) && (
                  <button className="btn btn--danger-outline" onClick={() => setCancelling(true)} disabled={busy}>Cancel order</button>
                )}
              </div>
            )}
            {actionError && <p className="form-error">{actionError.message}</p>}
          </div>

          <div className="admin-split">
            <div className="panel">
              <h3>Items</h3>
              <div className="table-wrap table-wrap--flush">
                <table className="table table--compact">
                  <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Line total</th></tr></thead>
                  <tbody>
                    {order.items.map((i) => (
                      <tr key={i.productId}>
                        <td>{i.productName}<span className="table__sku">{i.productId}</span></td>
                        <td className="num">{i.quantity}</td>
                        <td className="num">{formatCurrency(i.unitPrice)}</td>
                        <td className="num">{formatCurrency(i.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="totals">
                <div><dt>Subtotal</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
                <div><dt>Delivery</dt><dd>{order.shippingFee ? formatCurrency(order.shippingFee) : 'Free'}</dd></div>
                <div className="totals__grand"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
              </dl>
            </div>

            <div>
              <div className="panel">
                <h3>Customer and delivery</h3>
                <p className="addr">
                  <a className="table__name" href={`#/admin/customers/${order.userId}`}>{order.customer.fullName}</a>
                  {order.customer.email}<br />
                  {order.customer.phone}<br />
                  {order.customer.address}
                </p>
                {order.notes && <p className="muted">Customer note: {order.notes}</p>}
              </div>
              <div className="panel">
                <h3>Payment</h3>
                <dl className="details__list">
                  <div><dt>Method</dt><dd>{PAYMENT_LABEL[order.paymentMethod]}</dd></div>
                  <div><dt>Status</dt><dd className={`pay-status--${order.paymentStatus.toLowerCase()}`}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</dd></div>
                  <div><dt>Payment ID</dt><dd>{order.paymentId}</dd></div>
                </dl>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Status history</h3>
            <ol className="timeline">
              {[...order.statusHistory].reverse().map((h, idx) => (
                <li key={idx}>
                  <OrderStatusBadge status={h.status} />
                  <span>{h.note || '—'} <small className="muted">by {h.by}</small></span>
                  <time>{formatDateTime(h.at)}</time>
                </li>
              ))}
            </ol>
            <p className="field__hint"><a href={`#/admin/transactions?search=${order.orderId}`}>See this order's stock movements</a></p>
          </div>
        </>
      )}

      {cancelling && (
        <ConfirmDialog title="Cancel this order?" danger withReason confirmLabel="Cancel order" cancelLabel="Keep order" onClose={() => setCancelling(false)}
          onConfirm={async (reason) => {
            await api(`/orders/${orderId}/cancel`, { method: 'PUT', body: { reason } });
            toast(`Order ${orderId} cancelled and stock restored.`, 'success');
            reload();
          }}>
          <p>The {order.items.reduce((s, i) => s + i.quantity, 0)} units in this order go back into stock. {order.paymentStatus === 'PAID' ? 'The simulated payment is marked as refunded.' : 'The pending payment is voided.'}</p>
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}
