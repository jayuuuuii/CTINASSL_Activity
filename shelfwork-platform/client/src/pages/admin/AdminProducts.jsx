import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import AdminLayout from './AdminLayout.jsx';
import ProductTable from '../../components/ProductTable.jsx';
import ProductForm from '../../components/ProductForm.jsx';
import ProductDetails from '../../components/ProductDetails.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import useDebounced from '../../hooks/useDebounced.js';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminProducts({ params }) {
  const toast = useToast();
  const [search, setSearch] = useState(params.get('supplier') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { type: 'add'|'edit'|'view'|'delete', product }
  const q = useDebounced(search.trim());

  const list = useAsync(
    () => api('/admin/inventory', { query: { search: q, category, status, availability, page, limit: 15, sortBy: 'productName', order: 'asc' } }),
    [q, category, status, availability, page]
  );
  const categories = useAsync(() => api('/categories'), []);
  const suppliers = useAsync(() => api('/suppliers'), []);
  const cats = categories.data?.data || [];
  const sups = suppliers.data?.data || [];
  const summary = list.data?.meta.summary;
  const close = () => setModal(null);
  const filterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const statusCounts = useMemo(() => summary && [
    ['', `All (${summary.totalProducts})`],
    ['in', 'In stock'],
    ['low', `Low (${summary.lowStockItems})`],
    ['out', `Out (${summary.outOfStockItems})`],
  ], [summary]);

  async function save(values, imageAction, existing) {
    const r = existing
      ? await api(`/products/${existing.productId}`, { method: 'PUT', body: values })
      : await api('/products', { method: 'POST', body: values });
    const id = r.data.productId;
    if (imageAction?.type === 'upload') await api(`/products/${id}/image`, { method: 'PUT', body: { image: imageAction.dataUrl } });
    if (imageAction?.type === 'remove') await api(`/products/${id}/image`, { method: 'DELETE' });
    toast(existing ? 'Product updated.' : 'Product added.', 'success');
    close();
    list.reload();
  }

  async function toggle(p) {
    try {
      await api(`/products/${p.productId}`, { method: 'PUT', body: { isAvailable: !p.isAvailable } });
      toast(`${p.productName} is now ${p.isAvailable ? 'hidden from' : 'visible in'} the shop.`, 'success');
      list.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <AdminLayout
      section="products"
      title="Products"
      actions={<button className="btn btn--primary" onClick={() => setModal({ type: 'add' })}><Plus size={18} strokeWidth={1.5} /> Add product</button>}
    >
      <div className="toolbar">
        <div className="search">
          <Search size={18} strokeWidth={1.5} />
          <input type="search" placeholder="Search name or supplier" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search products" />
        </div>
        <select value={category} onChange={filterChange(setCategory)} aria-label="Category">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.categoryId} value={c.categoryName}>{c.categoryName}</option>)}
        </select>
        <select value={status} onChange={filterChange(setStatus)} aria-label="Stock status">
          {(statusCounts || [['', 'All statuses']]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={availability} onChange={filterChange(setAvailability)} aria-label="Shop visibility">
          <option value="">Shown and hidden</option>
          <option value="available">Shown in shop</option>
          <option value="unavailable">Hidden{summary ? ` (${summary.unavailableProducts})` : ''}</option>
        </select>
      </div>

      <ErrorNotice error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? <Loading /> : list.data && (
        <>
          <p className="count">{list.data.meta.totalItems} products</p>
          {list.data.data.length === 0 ? <p className="empty empty--box">No products match these filters.</p> : (
            <ProductTable
              products={list.data.data}
              onView={(product) => setModal({ type: 'view', product })}
              onEdit={(product) => setModal({ type: 'edit', product })}
              onDelete={(product) => setModal({ type: 'delete', product })}
              onToggleAvailable={toggle}
            />
          )}
          <Pagination meta={list.data.meta} onPage={setPage} />
        </>
      )}

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <Modal title={modal.type === 'add' ? 'Add product' : 'Edit product'} onClose={close} wide>
          <ProductForm
            initial={modal.product}
            categories={cats}
            suppliers={sups}
            onCancel={close}
            onSubmit={(values, imageAction) => save(values, imageAction, modal.product)}
          />
        </Modal>
      )}
      {modal?.type === 'view' && (
        <Modal title="Product details" onClose={close}>
          <ProductDetails product={modal.product} onEdit={() => setModal({ type: 'edit', product: modal.product })} onDelete={() => setModal({ type: 'delete', product: modal.product })} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <ConfirmDialog
          title="Delete product?"
          danger
          confirmLabel="Delete product"
          cancelLabel="Keep product"
          onClose={close}
          onConfirm={async () => {
            await api(`/products/${modal.product.productId}`, { method: 'DELETE' });
            toast('Product deleted.', 'success');
            list.reload();
          }}
        >
          <p>
            This removes <strong>{modal.product.productName}</strong> from the catalogue and from customers' carts. Past orders and
            stock history keep their records. To stop selling it temporarily, hide it from the shop instead.
          </p>
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}
