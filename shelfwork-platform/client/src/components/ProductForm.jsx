import { useState } from 'react';
import { ImageOff, Upload } from 'lucide-react';
import Field from './Field.jsx';
import ProductImage from './ProductImage.jsx';
import { fieldErrors } from '../api/client.js';

const EMPTY = {
  productName: '', category: '', supplier: '', price: '', quantity: '', lowStockThreshold: '10',
  description: '', isAvailable: true, isFeatured: false,
};
const MAX_IMAGE = 2 * 1024 * 1024;

/**
 * Add/edit form for a product. `onSubmit(values, imageAction)` must return a promise.
 * imageAction: { type: 'upload', dataUrl } | { type: 'remove' } | null
 */
export default function ProductForm({ initial, categories, suppliers, onSubmit, onCancel }) {
  const editing = Boolean(initial);
  const [form, setForm] = useState(() =>
    initial
      ? { ...EMPTY, ...initial, price: String(initial.price), quantity: String(initial.quantity), lowStockThreshold: String(initial.lowStockThreshold) }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(null); // { dataUrl } for a new file
  const [removeImage, setRemoveImage] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setErrors((x) => ({ ...x, image: 'Choose a PNG, JPEG or WebP image.' }));
    if (file.size > MAX_IMAGE) return setErrors((x) => ({ ...x, image: 'Image must be 2 MB or smaller.' }));
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ dataUrl: reader.result });
      setRemoveImage(false);
      setErrors((x) => ({ ...x, image: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!form.productName.trim()) e.productName = 'Enter a product name.';
    if (!form.category) e.category = 'Choose a category.';
    if (form.price === '' || Number(form.price) < 0 || Number.isNaN(Number(form.price))) e.price = 'Enter a price of 0 or more.';
    const intOk = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;
    if (!intOk(form.quantity)) e.quantity = 'Enter a whole number, 0 or more.';
    if (!intOk(form.lowStockThreshold)) e.lowStockThreshold = 'Enter a whole number, 0 or more.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError(null);
    try {
      await onSubmit(
        {
          productName: form.productName.trim(),
          category: form.category,
          supplier: form.supplier,
          price: Number(form.price),
          quantity: Number(form.quantity),
          lowStockThreshold: Number(form.lowStockThreshold),
          description: form.description.trim(),
          isAvailable: form.isAvailable,
          isFeatured: form.isFeatured,
        },
        image ? { type: 'upload', dataUrl: image.dataUrl } : removeImage ? { type: 'remove' } : null
      );
    } catch (err) {
      setErrors(fieldErrors(err));
      setServerError(err);
      setBusy(false);
    }
  }

  const preview = image ? { imageUrl: image.dataUrl, productName: 'New image' } : removeImage ? null : initial;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form__grid">
        <Field id="f-name" label="Product name" error={errors.productName} className="span-2">
          <input id="f-name" value={form.productName} onChange={set('productName')} autoFocus />
        </Field>

        <Field id="f-cat" label="Category" error={errors.category}>
          <select id="f-cat" value={form.category} onChange={set('category')}>
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c.categoryId} value={c.categoryName}>{c.categoryName}</option>)}
          </select>
        </Field>

        <Field id="f-supplier" label="Supplier" error={errors.supplier}>
          <select id="f-supplier" value={form.supplier} onChange={set('supplier')}>
            <option value="">No supplier</option>
            {suppliers.map((s) => <option key={s.supplierId} value={s.supplierName}>{s.supplierName}</option>)}
          </select>
        </Field>

        <Field id="f-price" label="Price (₱)" error={errors.price}>
          <input id="f-price" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} />
        </Field>

        <Field id="f-qty" label={editing ? 'Quantity on hand' : 'Opening stock'} error={errors.quantity} hint={editing ? 'Changes are logged as an adjustment.' : undefined}>
          <input id="f-qty" type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} />
        </Field>

        <Field id="f-threshold" label="Low-stock threshold" error={errors.lowStockThreshold}>
          <input id="f-threshold" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
        </Field>

        <div className="field field--checks">
          <label className="check">
            <input type="checkbox" checked={form.isAvailable} onChange={set('isAvailable')} /> Available in the shop
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured on the home page
          </label>
        </div>

        <Field id="f-desc" label="Description" error={errors.description} className="span-2">
          <textarea id="f-desc" rows="3" value={form.description} onChange={set('description')} />
        </Field>

        <div className={`field span-2 ${errors.image ? 'field--error' : ''}`}>
          <span className="field__label">Product image</span>
          <div className="image-picker">
            <ProductImage product={preview} size="sm" />
            <label className="btn btn--outline btn--sm">
              <Upload size={14} strokeWidth={1.5} /> {preview?.imageUrl ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickImage} hidden />
            </label>
            {(image || (initial?.imageUrl && !removeImage)) && (
              <button type="button" className="btn btn--danger-outline btn--sm" onClick={() => { setImage(null); setRemoveImage(Boolean(initial?.imageUrl)); }}>
                <ImageOff size={14} strokeWidth={1.5} /> Remove
              </button>
            )}
            <span className="field__hint">PNG, JPEG or WebP, up to 2 MB.</span>
          </div>
          {errors.image && <span className="field__error">{errors.image}</span>}
        </div>
      </div>

      {serverError && !Object.keys(fieldErrors(serverError)).length && <p className="form-error">{serverError.message}</p>}

      <div className="form__actions">
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  );
}
