import { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import ProductImage from './ProductImage.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency } from '../utils.js';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const toast = useToast();
  const [state, setState] = useState('idle'); // idle | busy | added
  const soldOut = product.quantity <= 0;

  async function add(e) {
    e.preventDefault();
    setState('busy');
    try {
      await addItem(product.productId, 1);
      setState('added');
      toast(`Added “${product.productName}” to your cart.`, 'success');
      setTimeout(() => setState('idle'), 1600);
    } catch (err) {
      toast(err.message, 'error');
      setState('idle');
    }
  }

  return (
    <article className={`pcard ${soldOut ? 'pcard--soldout' : ''}`}>
      <a href={`#/product/${product.productId}`} className="pcard__link">
        <ProductImage product={product} />
        {product.isFeatured && <span className="pcard__tag">Featured</span>}
        <div className="pcard__body">
          <span className="pcard__cat">{product.category}</span>
          <h3>{product.productName}</h3>
          <div className="pcard__row">
            <strong>{formatCurrency(product.price)}</strong>
            <StatusIndicator product={product} shopper />
          </div>
        </div>
      </a>
      <button className="btn btn--outline btn--sm pcard__add" onClick={add} disabled={soldOut || state === 'busy'}>
        {soldOut ? 'Sold out' : state === 'added' ? <><Check size={14} strokeWidth={1.5} /> Added</> : <><ShoppingBag size={14} strokeWidth={1.5} /> Add to cart</>}
      </button>
    </article>
  );
}
