import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api, fieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

function CategoryForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({ categoryName: initial?.categoryName || '', description: initial?.description || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.categoryName.trim()) return setErrors({ categoryName: 'Enter a category name.' });
    setBusy(true);
    try {
      if (initial) await api(`/categories/${initial.categoryId}`, { method: 'PUT', body: form });
      else await api('/categories', { method: 'POST', body: form });
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field id="cat-name" label="Category name" error={errors.categoryName}>
        <input id="cat-name" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} autoFocus maxLength={60} />
      </Field>
      <Field id="cat-desc" label="Description" error={errors.description}>
        <textarea id="cat-desc" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} />
      </Field>
      {error && !Object.keys(fieldErrors(error)).length && <p className="form-error">{error.message}</p>}
      {initial && <p className="field__hint">Renaming a category updates every product in it.</p>}
      <div className="form__actions">
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add category'}</button>
      </div>
    </form>
  );
}

export default function AdminCategories() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api('/categories'), []);
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  return (
    <AdminLayout section="categories" title="Categories" actions={<button className="btn btn--primary" onClick={() => setModal({ type: 'form' })}><Plus size={18} strokeWidth={1.5} /> Add category</button>}>
      <ErrorNotice error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Category</th><th className="hide-sm">Description</th><th className="num">Products</th><th className="num hide-sm">In shop</th><th className="actions-col">Actions</th></tr></thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c.categoryId}>
                  <td><a className="table__name" href={`#/admin/products?category=${encodeURIComponent(c.categoryName)}`}>{c.categoryName}</a><span className="table__sku">{c.categoryId}</span></td>
                  <td className="hide-sm muted">{c.description || '—'}</td>
                  <td className="num">{c.productCount}</td>
                  <td className="num hide-sm">{c.availableProductCount}</td>
                  <td className="actions-col">
                    <button className="icon-btn" aria-label={`Edit ${c.categoryName}`} onClick={() => setModal({ type: 'form', category: c })}><Pencil size={18} strokeWidth={1.5} /></button>
                    <button className="icon-btn icon-btn--danger" aria-label={`Delete ${c.categoryName}`} onClick={() => setModal({ type: 'delete', category: c })}><Trash2 size={18} strokeWidth={1.5} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === 'form' && (
        <Modal title={modal.category ? 'Edit category' : 'Add category'} onClose={close}>
          <CategoryForm initial={modal.category} onCancel={close} onSaved={() => { toast('Category saved.', 'success'); close(); reload(); }} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <ConfirmDialog title="Delete category?" danger confirmLabel="Delete" onClose={close}
          onConfirm={async () => { await api(`/categories/${modal.category.categoryId}`, { method: 'DELETE' }); toast('Category deleted.', 'success'); reload(); }}>
          {modal.category.productCount > 0
            ? <p><strong>{modal.category.categoryName}</strong> still has {modal.category.productCount} products. Move them to another category first; the server will refuse to delete it until then.</p>
            : <p>Delete <strong>{modal.category.categoryName}</strong>? This cannot be undone.</p>}
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}
