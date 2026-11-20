import { Eye, Pencil, Trash2 } from 'lucide-react';
import StatusIndicator from './StatusIndicator.jsx';
import ProductImage from './ProductImage.jsx';
import { formatCurrency } from '../utils.js';

export default function ProductTable({ products, onView, onEdit, onDelete, onToggleAvailable }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="hide-sm">Category</th>
            <th className="num hide-sm">Price</th>
            <th className="num">On hand</th>
            <th>Status</th>
            <th>In shop</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productId} className={p.isAvailable ? '' : 'is-muted'}>
              <td>
                <div className="table__product">
                  <ProductImage product={p} size="sm" />
                  <div>
                    <button className="table__name" onClick={() => onView(p)}>{p.productName}</button>
                    <span className="table__sku">{p.productId} · {p.supplier || 'No supplier'}</span>
                  </div>
                </div>
              </td>
              <td className="hide-sm">{p.category}</td>
              <td className="num hide-sm">{formatCurrency(p.price)}</td>
              <td className="num">{p.quantity}</td>
              <td><StatusIndicator product={p} /></td>
              <td>
                <button
                  className={`switch ${p.isAvailable ? 'is-on' : ''}`}
                  role="switch"
                  aria-checked={p.isAvailable}
                  aria-label={`${p.productName} available in shop`}
                  onClick={() => onToggleAvailable(p)}
                >
                  <span />
                </button>
              </td>
              <td className="actions-col">
                <button className="icon-btn" title="View details" aria-label={`View ${p.productName}`} onClick={() => onView(p)}>
                  <Eye size={18} strokeWidth={1.5} />
                </button>
                <button className="icon-btn" title="Edit" aria-label={`Edit ${p.productName}`} onClick={() => onEdit(p)}>
                  <Pencil size={18} strokeWidth={1.5} />
                </button>
                <button className="icon-btn icon-btn--danger" title="Delete" aria-label={`Delete ${p.productName}`} onClick={() => onDelete(p)}>
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
