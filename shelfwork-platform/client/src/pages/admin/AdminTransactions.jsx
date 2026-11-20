import { useState } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import useDebounced from '../../hooks/useDebounced.js';
import { api } from '../../api/client.js';
import { formatDateTime } from '../../utils.js';

const TYPE_LABEL = { IN: 'Stock in', OUT: 'Stock out', ADJUSTMENT: 'Adjustment' };
const SIGN = { IN: '+', OUT: '−', ADJUSTMENT: '±' };

export default function AdminTransactions({ params }) {
  const [search, setSearch] = useState(params.get('search') || '');
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const productId = params.get('productId') || '';
  const q = useDebounced(search.trim());
  const { data, error, loading, reload } = useAsync(() => api('/admin/transactions', { query: { search: q, type, source, productId, page, limit: 25 } }), [q, type, source, productId, page]);

  return (
    <AdminLayout section="transactions" title="Stock history">
      <div className="toolbar">
        <div className="search">
          <Search size={18} strokeWidth={1.5} />
          <input type="search" placeholder="Search product, order ID or reason" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search history" />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Type">
          <option value="">All types</option>
          <option value="IN">Stock in</option>
          <option value="OUT">Stock out</option>
          <option value="ADJUSTMENT">Adjustments</option>
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} aria-label="Source">
          <option value="">Orders and manual</option>
          <option value="order">Customer orders</option>
          <option value="manual">Manual changes</option>
        </select>
      </div>
      {productId && <p className="notice">Showing one product only. <a href="#/admin/transactions">Show all</a></p>}
      <ErrorNotice error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <p className="count">{data.meta.totalItems} movements</p>
          <div className="table-wrap">
            <table className="table table--compact">
              <thead><tr><th>When</th><th>Product</th><th>Type</th><th className="num">Qty</th><th className="num hide-sm">Before → after</th><th>Reason</th><th className="hide-sm">By</th></tr></thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.transactionId}>
                    <td>{formatDateTime(t.createdAt)}<span className="table__sku">{t.transactionId}</span></td>
                    <td>{t.productName}</td>
                    <td><span className={`tx-type tx-type--${t.type.toLowerCase()}`}>{TYPE_LABEL[t.type]}</span></td>
                    <td className={`num tx-qty tx-qty--${t.type.toLowerCase()}`}>{SIGN[t.type]}{t.quantity}</td>
                    <td className="num hide-sm">{t.previousQuantity} → {t.newQuantity}</td>
                    <td>
                      {t.reason}
                      {t.referenceType === 'ORDER' && t.referenceId && <span className="table__sku"><a href={`#/admin/orders/${t.referenceId}`}>{t.referenceId}</a></span>}
                    </td>
                    <td className="hide-sm">{t.performedByName || 'System'}{t.performedByRole && <span className="table__sku">{t.performedByRole}</span>}</td>
                  </tr>
                ))}
                {data.data.length === 0 && <tr><td colSpan="7" className="muted">No stock movements match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </AdminLayout>
  );
}
