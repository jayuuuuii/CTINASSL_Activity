import { Pencil, Trash2 } from 'lucide-react';
import StatusIndicator from './StatusIndicator.jsx';
import ProductImage from './ProductImage.jsx';
import { formatCurrency, formatDate } from '../utils.js';

export default function ProductDetails({ product, onEdit, onDelete }) {
  const rows = [
    ['Product ID', product.productId],
    ['Category', product.category],
    ['Unit price', formatCurrency(product.price)],
    ['On hand', `${product.quantity} units`],
    ['Low-stock threshold', `${product.lowStockThreshold} units`],
    ['Stock value', formatCurrency(product.price * product.quantity)],
    ['Supplier', product.supplier || '—'],
    ['In shop', product.isAvailable ? 'Yes' : 'No (hidden)'],
    ['Featured', product.isFeatured ? 'Yes' : 'No'],
    ['Added', formatDate(product.createdAt)],
    ['Last updated', formatDate(product.updatedAt)],
  ];

  return (
    <div className="details">
      <ProductImage product={product} size="lg" />
      <div className="details__top">
        <h4>{product.productName}</h4>
        <StatusIndicator product={product} />
      </div>
      <p className="details__desc">{product.description || 'No description added.'}</p>
      <dl className="details__list">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="form__actions">
        <a className="btn btn--outline" href={`#/admin/transactions?productId=${product.productId}`}>Stock history</a>
        <button className="btn btn--danger-outline" onClick={onDelete}>
          <Trash2 size={16} strokeWidth={1.5} /> Delete
        </button>
        <button className="btn btn--primary" onClick={onEdit}>
          <Pencil size={16} strokeWidth={1.5} /> Edit product
        </button>
      </div>
    </div>
  );
}
