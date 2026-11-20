import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import StatusIndicator from '../../components/StatusIndicator.jsx';
import Field from '../../components/Field.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api, fieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const MODES = {
  in: { label: 'Stock in', icon: ArrowDownToLine, path: '/stock/in', hint: 'A delivery or return adds units.' },
  out: { label: 'Stock out', icon: ArrowUpFromLine, path: '/stock/out', hint: 'Damage, loss or an offline sale removes units.' },
  adjust: { label: 'Set exact count', icon: SlidersHorizontal, path: '/stock/adjust', hint: 'After a stocktake, set the count to what is on the shelf.' },
};
const TABS = [
  { id: 'all', label: 'All products' },
  { id: 'low', label: 'Low stock' },
  { id: 'out', label: 'Out of stock' },
];

export default function AdminStock({ params }) {
  const toast = useToast();
  const [tab, setTab] = useState(params.get('view') || 'all');
  const [mode, setMode] = useState('in');
  const [form, setForm] = useState({ productId: params.get('product') || '', quantity: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api('/admin/inventory', { query: { limit: 100, sortBy: 'quantity', order: 'asc' } }), []);

  useEffect(() => {
    if (params.get('product')) setForm((f) => ({ ...f, productId: params.get('product') }));
  }, [params]);

  const products = data?.data || [];
  const summary = data?.meta.summary;
  const selected = products.find((p) => p.productId === form.productId);
  const rows = products.filter((p) => tab === 'all' || p.status === tab);

  async function submit(e) {
    e.preventDefault();
    const local = {};
    if (!form.productId) local.productId = 'Choose a product.';
    const n = Number(form.quantity);
    if (form.quantity === '' || !Number.isInteger(n) || n < (mode === 'adjust' ? 0 : 1)) local.quantity = mode === 'adjust' ? 'Enter a whole number, 0 or more.' : 'Enter a whole number, 1 or more.';
    if (mode === 'out' && selected && n > selected.quantity) local.quantity = `Only ${selected.quantity} in stock.`;
    if (mode === 'adjust' && !form.reason.trim()) local.reason = 'A reason is required for adjustments.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const body = mode === 'adjust'
        ? { productId: form.productId, newQuantity: n, reason: form.reason.trim() }
        : { productId: form.productId, quantity: n, reason: form.reason.trim() };
      const r = await api(MODES[mode].path, { method: 'POST', body });
      const t = r.data.transaction;
      toast(`${t.productName}: ${t.previousQuantity} → ${t.newQuantity}`, 'success');
      setForm({ productId: form.productId, quantity: '', reason: '' });
      reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      if (!Object.keys(fieldErrors(err)).length) toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout section="stock" title="Stock management">
      {summary && (summary.lowStockItems > 0 || summary.outOfStockItems > 0) && (
        <div className="notice notice--warn">
          <AlertTriangle size={18} strokeWidth={1.5} />
          <span>{summary.outOfStockItems} out of stock and {summary.lowStockItems} running low.</span>
        </div>
      )}

      <div className="stock-layout">
        <form className="panel form" onSubmit={submit} noValidate>
          <h3>Record a stock change</h3>
          <div className="segmented" role="tablist">
            {Object.entries(MODES).map(([id, m]) => (
              <button type="button" key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => { setMode(id); setErrors({}); }}>
                <m.icon size={16} strokeWidth={1.5} /> {m.label}
              </button>
            ))}
          </div>
          <p className="field__hint">{MODES[mode].hint}</p>

          <Field id="s-product" label="Product" error={errors.productId}>
            <select id="s-product" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Choose a product…</option>
              {[...products].sort((a, b) => a.productName.localeCompare(b.productName)).map((p) => (
                <option key={p.productId} value={p.productId}>{p.productName} ({p.quantity} on hand)</option>
              ))}
            </select>
          </Field>
          {selected && <p className="stock-current">Currently <strong>{selected.quantity}</strong> on hand · threshold {selected.lowStockThreshold} · <StatusIndicator product={selected} /></p>}

          <Field id="s-qty" label={mode === 'adjust' ? 'New quantity on hand' : 'Quantity'} error={errors.quantity || errors.newQuantity}>
            <input id="s-qty" type="number" min={mode === 'adjust' ? 0 : 1} step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field id="s-reason" label={mode === 'adjust' ? 'Reason' : 'Reason (optional)'} error={errors.reason}>
            <input id="s-reason" maxLength={200} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={mode === 'in' ? 'e.g. Delivery from supplier' : mode === 'out' ? 'e.g. Damaged in storage' : 'e.g. Monthly stocktake'} />
          </Field>
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Saving…' : MODES[mode].label}</button>
          <p className="field__hint">Every change is saved to the stock history with your name.</p>
        </form>

        <div>
          <div className="chips" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label} ({t.id === 'all' ? products.length : products.filter((p) => p.status === t.id).length})
              </button>
            ))}
          </div>
          <ErrorNotice error={error} onRetry={reload} />
          {loading && !data ? <Loading /> : (
            <div className="table-wrap">
              <table className="table table--compact">
                <thead><tr><th>Product</th><th className="num">On hand</th><th className="num hide-sm">Threshold</th><th>Status</th><th className="actions-col" /></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.productId} className={form.productId === p.productId ? 'is-selected' : ''}>
                      <td><span className="table__name table__name--static">{p.productName}</span><span className="table__sku">{p.supplier || 'No supplier'}{p.isAvailable ? '' : ' · hidden from shop'}</span></td>
                      <td className="num strong">{p.quantity}</td>
                      <td className="num hide-sm">{p.lowStockThreshold}</td>
                      <td><StatusIndicator product={p} /></td>
                      <td className="actions-col">
                        <button className="btn btn--outline btn--sm" onClick={() => { setForm({ productId: p.productId, quantity: '', reason: '' }); setMode(p.status === 'in' ? mode : 'in'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Select</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan="5" className="muted">Nothing here.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
