import { useState } from 'react';
import { Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api, fieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const FIELDS = [
  ['supplierName', 'Supplier name', 'text', 'span-2'],
  ['contactPerson', 'Contact person', 'text', ''],
  ['email', 'Email', 'email', ''],
  ['phone', 'Phone', 'tel', ''],
  ['address', 'Address', 'text', 'span-2'],
];

function SupplierForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, initial?.[k] || ''])));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const local = {};
    for (const k of ['supplierName', 'contactPerson', 'email', 'phone']) if (!form[k].trim()) local[k] = 'Required.';
    if (Object.keys(local).length) return setErrors(local);
    setBusy(true);
    try {
      if (initial) await api(`/suppliers/${initial.supplierId}`, { method: 'PUT', body: form });
      else await api('/suppliers', { method: 'POST', body: form });
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form__grid">
        {FIELDS.map(([k, label, type, cls]) => (
          <Field key={k} id={`sup-${k}`} label={label} error={errors[k]} className={cls}>
            <input id={`sup-${k}`} type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      {error && !Object.keys(fieldErrors(error)).length && <p className="form-error">{error.message}</p>}
      <div className="form__actions">
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add supplier'}</button>
      </div>
    </form>
  );
}

export default function AdminSuppliers() {
  const toast = useToast();
  const suppliers = useAsync(() => api('/suppliers'), []);
  const products = useAsync(() => api('/admin/inventory', { query: { limit: 100 } }), []);
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  const countFor = (name) => (products.data?.data || []).filter((p) => p.supplier === name).length;

  return (
    <AdminLayout section="suppliers" title="Suppliers" actions={<button className="btn btn--primary" onClick={() => setModal({ type: 'form' })}><Plus size={18} strokeWidth={1.5} /> Add supplier</button>}>
      <ErrorNotice error={suppliers.error} onRetry={suppliers.reload} />
      {suppliers.loading && !suppliers.data ? <Loading /> : suppliers.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Supplier</th><th>Contact</th><th className="hide-sm">Address</th><th className="num">Products</th><th className="actions-col">Actions</th></tr></thead>
            <tbody>
              {suppliers.data.data.map((s) => (
                <tr key={s.supplierId}>
                  <td><span className="table__name table__name--static">{s.supplierName}</span><span className="table__sku">{s.supplierId}</span></td>
                  <td>
                    {s.contactPerson}
                    <span className="table__sku"><Mail size={12} strokeWidth={1.5} /> <a href={`mailto:${s.email}`}>{s.email}</a></span>
                    <span className="table__sku"><Phone size={12} strokeWidth={1.5} /> {s.phone}</span>
                  </td>
                  <td className="hide-sm muted">{s.address || '—'}</td>
                  <td className="num"><a href={`#/admin/products?supplier=${encodeURIComponent(s.supplierName)}`}>{countFor(s.supplierName)}</a></td>
                  <td className="actions-col">
                    <button className="icon-btn" aria-label={`Edit ${s.supplierName}`} onClick={() => setModal({ type: 'form', supplier: s })}><Pencil size={18} strokeWidth={1.5} /></button>
                    <button className="icon-btn icon-btn--danger" aria-label={`Delete ${s.supplierName}`} onClick={() => setModal({ type: 'delete', supplier: s })}><Trash2 size={18} strokeWidth={1.5} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === 'form' && (
        <Modal title={modal.supplier ? 'Edit supplier' : 'Add supplier'} onClose={close} wide>
          <SupplierForm initial={modal.supplier} onCancel={close} onSaved={() => { toast('Supplier saved.', 'success'); close(); suppliers.reload(); products.reload(); }} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <ConfirmDialog title="Delete supplier?" danger confirmLabel="Delete" onClose={close}
          onConfirm={async () => { await api(`/suppliers/${modal.supplier.supplierId}`, { method: 'DELETE' }); toast('Supplier deleted.', 'success'); suppliers.reload(); }}>
          <p>Delete <strong>{modal.supplier.supplierName}</strong>? Suppliers that still have products cannot be deleted; reassign those products first.</p>
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}
