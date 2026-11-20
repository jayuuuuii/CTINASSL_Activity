import { useState } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import OrderStatusBadge from '../../components/OrderStatusBadge.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import useDebounced from '../../hooks/useDebounced.js';
import { api } from '../../api/client.js';
import { ORDER_STATUSES, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, formatCurrency, formatDateTime } from '../../utils.js';

export default function AdminOrders({ params }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  const { data, error, loading, reload } = useAsync(() => api('/admin/orders', { query: { search: q, status, page, limit: 15 } }), [q, status, page]);

  return (
    <AdminLayout section="orders" title="Orders">
      <div className="toolbar">
        <div className="search">
          <Search size={18} strokeWidth={1.5} />
          <input type="search" placeholder="Search by order ID or customer name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search orders" />
        </div>
      </div>
      <div className="chips" role="tablist" aria-label="Status">
        {['', ...ORDER_STATUSES].map((s) => (
          <button key={s || 'all'} role="tab" aria-selected={status === s} className={`chip ${status === s ? 'is-active' : ''}`} onClick={() => { setStatus(s); setPage(1); }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <ErrorNotice error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <p className="count">{data.meta.totalItems} orders</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th className="hide-sm">Items</th><th className="num">Total</th><th className="hide-sm">Payment</th><th>Status</th><th className="actions-col" /></tr>
              </thead>
              <tbody>
                {data.data.map((o) => (
                  <tr key={o.orderId}>
                    <td><a className="table__name nowrap" href={`#/admin/orders/${o.orderId}`}>{o.orderId}</a><span className="table__sku">{formatDateTime(o.createdAt)}</span></td>
                    <td>{o.customer.fullName}<span className="table__sku">{o.customer.phone}</span></td>
                    <td className="hide-sm">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="num">{formatCurrency(o.total)}</td>
                    <td className="hide-sm">{PAYMENT_LABEL[o.paymentMethod]}<span className={`table__sku pay-status--${o.paymentStatus.toLowerCase()}`}>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</span></td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="actions-col"><a className="btn btn--outline btn--sm" href={`#/admin/orders/${o.orderId}`}>Open</a></td>
                  </tr>
                ))}
                {data.data.length === 0 && <tr><td colSpan="7" className="muted">No orders match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </AdminLayout>
  );
}
