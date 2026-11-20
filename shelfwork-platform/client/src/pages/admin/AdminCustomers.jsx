import { useState } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import useDebounced from '../../hooks/useDebounced.js';
import { api } from '../../api/client.js';
import { formatCurrency, formatDate } from '../../utils.js';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  const { data, error, loading, reload } = useAsync(() => api('/admin/customers', { query: { search: q, status, page, limit: 15 } }), [q, status, page]);

  return (
    <AdminLayout section="customers" title="Customers">
      <div className="toolbar">
        <div className="search">
          <Search size={18} strokeWidth={1.5} />
          <input type="search" placeholder="Search name, email or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search customers" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Account status">
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <ErrorNotice error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <p className="count">{data.meta.totalItems} customers</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Customer</th><th className="hide-sm">Phone</th><th className="num">Orders</th><th className="num">Spent</th><th className="hide-sm">Joined</th><th>Account</th><th className="actions-col" /></tr></thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c.userId} className={c.status === 'disabled' ? 'is-muted' : ''}>
                    <td><a className="table__name" href={`#/admin/customers/${c.userId}`}>{c.fullName}</a><span className="table__sku">{c.email}</span></td>
                    <td className="hide-sm">{c.phone || '—'}</td>
                    <td className="num">{c.orderCount}</td>
                    <td className="num">{formatCurrency(c.totalSpent)}</td>
                    <td className="hide-sm">{formatDate(c.createdAt)}</td>
                    <td><span className={`badge badge--account-${c.status}`}>{c.status === 'active' ? 'Active' : 'Disabled'}</span></td>
                    <td className="actions-col"><a className="btn btn--outline btn--sm" href={`#/admin/customers/${c.userId}`}>View</a></td>
                  </tr>
                ))}
                {data.data.length === 0 && <tr><td colSpan="7" className="muted">No customers match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </AdminLayout>
  );
}
