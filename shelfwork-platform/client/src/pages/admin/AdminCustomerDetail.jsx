import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import OrderStatusBadge from '../../components/OrderStatusBadge.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../../utils.js';

export default function AdminCustomerDetail({ userId }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api(`/admin/customers/${userId}`), [userId]);
  const [confirm, setConfirm] = useState(false);
  const c = data?.data;
  const disabling = c?.status === 'active';

  return (
    <AdminLayout section="customers" title={c ? c.fullName : 'Customer'} actions={<a className="back-link" href="#/admin/customers"><ArrowLeft size={16} strokeWidth={1.5} /> All customers</a>}>
      <ErrorNotice error={error} onRetry={reload} />
      {loading && !c ? <Loading /> : c && (
        <>
          <div className="admin-split admin-split--narrow">
            <div className="panel">
              <h3>Profile</h3>
              <dl className="details__list">
                <div><dt>Customer ID</dt><dd>{c.userId}</dd></div>
                <div><dt>Email</dt><dd>{c.email}</dd></div>
                <div><dt>Phone</dt><dd>{c.phone || '—'}</dd></div>
                <div><dt>Address</dt><dd>{c.address || '—'}</dd></div>
                <div><dt>Joined</dt><dd>{formatDate(c.createdAt)}</dd></div>
                <div><dt>Last login</dt><dd>{formatDateTime(c.lastLoginAt)}</dd></div>
              </dl>
              <p className="field__hint">Passwords are stored as one-way hashes and are never shown.</p>
            </div>
            <div className="panel">
              <h3>Account</h3>
              <p><span className={`badge badge--account-${c.status}`}>{c.status === 'active' ? 'Active' : 'Disabled'}</span></p>
              <dl className="details__list">
                <div><dt>Orders</dt><dd>{c.orderCount}</dd></div>
                <div><dt>Total spent</dt><dd>{formatCurrency(c.totalSpent)}</dd></div>
                <div><dt>Last order</dt><dd>{formatDate(c.lastOrderAt)}</dd></div>
              </dl>
              <button className={`btn ${disabling ? 'btn--danger-outline' : 'btn--primary'}`} onClick={() => setConfirm(true)}>
                {disabling ? 'Disable account' : 'Re-enable account'}
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>Order history</h3>
            {c.orders.length === 0 ? <p className="muted">No orders yet.</p> : (
              <div className="table-wrap table-wrap--flush">
                <table className="table table--compact">
                  <thead><tr><th>Order</th><th>Items</th><th className="num">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {c.orders.map((o) => (
                      <tr key={o.orderId}>
                        <td><a className="table__name nowrap" href={`#/admin/orders/${o.orderId}`}>{o.orderId}</a><span className="table__sku">{formatDateTime(o.createdAt)}</span></td>
                        <td>{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}</td>
                        <td className="num">{formatCurrency(o.total)}</td>
                        <td><OrderStatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={disabling ? 'Disable this account?' : 'Re-enable this account?'}
          danger={disabling}
          confirmLabel={disabling ? 'Disable account' : 'Re-enable'}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api(`/admin/customers/${userId}/status`, { method: 'PUT', body: { status: disabling ? 'disabled' : 'active' } });
            toast(disabling ? 'Account disabled.' : 'Account re-enabled.', 'success');
            reload();
          }}
        >
          <p>
            {disabling
              ? `${c.fullName} will be signed out everywhere and won't be able to log in or place orders. Their existing orders are kept.`
              : `${c.fullName} will be able to log in and shop again.`}
          </p>
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}
