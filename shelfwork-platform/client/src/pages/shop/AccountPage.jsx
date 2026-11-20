import { useState } from 'react';
import { LogOut, Receipt } from 'lucide-react';
import PageBanner from '../../components/PageBanner.jsx';
import Field from '../../components/Field.jsx';
import OrderStatusBadge from '../../components/OrderStatusBadge.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api, fieldErrors } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { navigate } from '../../hooks/useHashRoute.js';
import { ORDER_STATUSES, formatCurrency, formatDate, pluralize } from '../../utils.js';

function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '', address: user.address || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(form);
      setEditing(false);
      setErrors({});
      toast('Profile saved.', 'success');
    } catch (err) {
      setErrors(fieldErrors(err));
      if (!Object.keys(fieldErrors(err)).length) toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!editing)
    return (
      <div className="panel">
        <h3>Profile</h3>
        <dl className="details__list">
          <div><dt>Name</dt><dd>{user.fullName}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Contact number</dt><dd>{user.phone || '—'}</dd></div>
          <div><dt>Address</dt><dd>{user.address || '—'}</dd></div>
          <div><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>
        </dl>
        <button className="btn btn--outline btn--sm" onClick={() => setEditing(true)}>Edit details</button>
      </div>
    );

  return (
    <form className="panel form" onSubmit={save} noValidate>
      <h3>Edit profile</h3>
      <Field id="p-name" label="Full name" error={errors.fullName}>
        <input id="p-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </Field>
      <Field id="p-phone" label="Contact number" error={errors.phone}>
        <input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field id="p-address" label="Default delivery address" error={errors.address}>
        <textarea id="p-address" rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </Field>
      <div className="form__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
        <button className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const orders = useAsync(() => api('/orders/my-orders', { query: { status, page, limit: 8 } }), [status, page]);

  return (
    <>
      <PageBanner eyebrow="My account" title={`Hello, ${user.fullName.split(' ')[0]}`}>
        Your details and every order you have placed with us.
      </PageBanner>
      <section className="section section--tight">
        <div className="container account">
          <aside>
            <Profile />
            <button
              className="btn btn--outline btn--block"
              onClick={async () => {
                await logout();
                toast('You have been logged out.');
                navigate('home');
              }}
            >
              <LogOut size={16} strokeWidth={1.5} /> Log out
            </button>
          </aside>

          <div>
            <div className="section__head section__head--split">
              <h2>Order history</h2>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
                <option value="">All orders</option>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <ErrorNotice error={orders.error} onRetry={orders.reload} />
            {orders.loading && !orders.data ? <Loading /> : orders.data?.data.length === 0 ? (
              <EmptyState icon={Receipt} title={status ? `No ${status.toLowerCase()} orders` : 'No orders yet'} action={<a className="btn btn--primary" href="#/shop">Start shopping</a>} />
            ) : orders.data ? (
              <>
                <ul className="order-list">
                  {orders.data.data.map((o) => (
                    <li key={o.orderId}>
                      <a href={`#/orders/${o.orderId}`}>
                        <span className="order-list__id">{o.orderId}<small>{formatDate(o.createdAt)}</small></span>
                        <span className="order-list__items">{pluralize(o.items.reduce((s, i) => s + i.quantity, 0), 'item')} · {o.items.map((i) => i.productName).join(', ')}</span>
                        <strong>{formatCurrency(o.total)}</strong>
                        <OrderStatusBadge status={o.status} />
                      </a>
                    </li>
                  ))}
                </ul>
                <Pagination meta={orders.data.meta} onPage={setPage} />
              </>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
