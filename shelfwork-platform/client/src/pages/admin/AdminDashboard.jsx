import { ArrowRight, RefreshCw } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import Overview from '../../components/Overview.jsx';
import OrderStatusBadge from '../../components/OrderStatusBadge.jsx';
import StatusIndicator from '../../components/StatusIndicator.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';
import { ORDER_STATUSES, PAYMENT_LABEL, formatCurrency, formatDateTime } from '../../utils.js';

const TX_SIGN = { IN: '+', OUT: '−', ADJUSTMENT: '±' };

export default function AdminDashboard() {
  const { data, error, loading, reload } = useAsync(() => api('/admin/dashboard'), []);
  const d = data?.data;

  return (
    <AdminLayout
      section=""
      title="Dashboard"
      actions={<button className="btn btn--outline btn--sm" onClick={reload} disabled={loading}><RefreshCw size={14} strokeWidth={1.5} /> Refresh</button>}
    >
      <ErrorNotice error={error} onRetry={reload} />
      {!d ? <Loading /> : (
        <>
          <div className="kpis">
            <a className="kpi" href="#/admin/orders"><span>Total orders</span><strong>{d.totalOrders}</strong></a>
            <a className="kpi kpi--warn" href="#/admin/orders?status=Pending"><span>Pending orders</span><strong>{d.pendingOrders}</strong></a>
            <div className="kpi"><span>Total sales</span><strong>{formatCurrency(d.totalSales)}</strong><small>excludes cancelled orders</small></div>
            <div className="kpi"><span>Collected</span><strong>{formatCurrency(d.collectedSales)}</strong><small>paid orders only</small></div>
          </div>

          <div className="panel">
            <h3>Inventory</h3>
            <Overview stats={d} />
          </div>

          <div className="panel">
            <h3>Orders by status</h3>
            <ul className="status-strip">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <a href={`#/admin/orders?status=${s}`}><OrderStatusBadge status={s} /><strong>{d.ordersByStatus[s]}</strong></a>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-split">
            <div className="panel">
              <div className="panel__head">
                <h3>Recent orders</h3>
                <a className="link-arrow" href="#/admin/orders">All orders <ArrowRight size={14} strokeWidth={1.5} /></a>
              </div>
              <div className="table-wrap table-wrap--flush">
                <table className="table table--compact">
                  <thead><tr><th>Order</th><th>Customer</th><th className="num">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {d.recentOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td><a className="table__name nowrap" href={`#/admin/orders/${o.orderId}`}>{o.orderId}</a><span className="table__sku">{formatDateTime(o.createdAt)}</span></td>
                        <td>{o.customerName}<span className="table__sku">{PAYMENT_LABEL[o.paymentMethod]}</span></td>
                        <td className="num">{formatCurrency(o.total)}</td>
                        <td><OrderStatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <h3>Recent inventory activity</h3>
                <a className="link-arrow" href="#/admin/transactions">Full history <ArrowRight size={14} strokeWidth={1.5} /></a>
              </div>
              <ul className="ledger">
                {d.recentTransactions.map((t) => (
                  <li key={t.transactionId}>
                    <div>
                      <strong>{t.productName}</strong>
                      <span>{t.reason} · {formatDateTime(t.createdAt)}</span>
                    </div>
                    <span className={`tx-qty tx-qty--${t.type.toLowerCase()}`}>{TX_SIGN[t.type]}{t.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Low-stock alerts</h3>
              <a className="link-arrow" href="#/admin/stock">Manage stock <ArrowRight size={14} strokeWidth={1.5} /></a>
            </div>
            {d.lowStockProducts.length === 0 ? <p className="muted">Everything is comfortably stocked.</p> : (
              <ul className="ledger">
                {d.lowStockProducts.map((p) => (
                  <li key={p.productId}>
                    <div>
                      <strong>{p.productName}</strong>
                      <span>{p.quantity} on hand · threshold {p.lowStockThreshold} · {p.supplier || 'no supplier'}</span>
                    </div>
                    <div className="ledger__end">
                      <StatusIndicator product={p} />
                      <a className="btn btn--outline btn--sm" href={`#/admin/stock?product=${p.productId}`}>Restock</a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
