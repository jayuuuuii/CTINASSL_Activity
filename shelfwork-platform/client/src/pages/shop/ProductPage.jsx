import { useState } from 'react';
import { ArrowLeft, ShoppingBag, Check } from 'lucide-react';
import ProductImage from '../../components/ProductImage.jsx';
import StatusIndicator from '../../components/StatusIndicator.jsx';
import QuantitySelector from '../../components/QuantitySelector.jsx';
import ProductCard from '../../components/ProductCard.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';
import { useCart } from '../../context/CartContext.jsx';
import { formatCurrency } from '../../utils.js';
import { PackageX } from 'lucide-react';

export default function ProductPage({ productId }) {
  const { addItem, quantityOf } = useCart();
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState(null); // { tone, text }
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(() => api(`/products/${productId}`, { query: { view: 'public' } }), [productId]);
  const product = data?.data;
  const related = useAsync(
    () => (product ? api('/products', { query: { category: product.category, limit: 5, inStock: 'true' } }) : Promise.resolve(null)),
    [product?.category]
  );

  if (loading && !product) return <div className="container section"><Loading /></div>;
  if (error?.status === 404)
    return (
      <div className="container section">
        <EmptyState icon={PackageX} title="Product not found" action={<a className="btn btn--primary" href="#/shop">Back to the shop</a>}>
          It may have been removed or is no longer sold.
        </EmptyState>
      </div>
    );
  if (error) return <div className="container section"><ErrorNotice error={error} onRetry={reload} /></div>;

  const inCart = quantityOf(product.productId);
  const canAdd = Math.max(0, product.quantity - inCart);
  const soldOut = product.quantity <= 0;

  async function add() {
    setBusy(true);
    setMessage(null);
    try {
      await addItem(product.productId, qty);
      setMessage({ tone: 'success', text: `Added ${qty} to your cart.` });
      setQty(1);
    } catch (e) {
      setMessage({ tone: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="section section--tight">
        <div className="container">
          <a href="#/shop" className="back-link"><ArrowLeft size={16} strokeWidth={1.5} /> Back to shop</a>
          <div className="pdp">
            <ProductImage product={product} size="xl" />
            <div className="pdp__info">
              <a className="eyebrow" href={`#/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</a>
              <h1>{product.productName}</h1>
              <p className="pdp__price">{formatCurrency(product.price)}</p>
              <StatusIndicator product={product} shopper />
              <p className="pdp__desc">{product.description || 'No description yet.'}</p>

              {soldOut ? (
                <p className="notice notice--warn">Out of stock. Check back soon: we restock regularly.</p>
              ) : (
                <div className="pdp__buy">
                  <QuantitySelector value={Math.min(qty, Math.max(1, canAdd))} max={Math.max(1, canAdd)} onChange={setQty} disabled={canAdd === 0 || busy} />
                  <button className="btn btn--primary btn--lg" onClick={add} disabled={canAdd === 0 || busy}>
                    <ShoppingBag size={18} strokeWidth={1.5} /> {busy ? 'Adding…' : 'Add to cart'}
                  </button>
                </div>
              )}
              <p className="pdp__stock-note">
                {product.quantity} available{inCart > 0 ? ` · ${inCart} already in your cart` : ''}
                {!soldOut && canAdd === 0 && ' · you have all available units in your cart'}
              </p>
              {message && (
                <p className={`inline-msg inline-msg--${message.tone}`}>
                  {message.tone === 'success' && <Check size={16} strokeWidth={1.5} />} {message.text}{' '}
                  {message.tone === 'success' && <a href="#/cart">View cart</a>}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.data?.data?.filter((p) => p.productId !== product.productId).length > 0 && (
        <section className="section section--paper">
          <div className="container">
            <div className="section__head"><p className="eyebrow">More in {product.category}</p><h2>You may also like</h2></div>
            <div className="pgrid">
              {related.data.data.filter((p) => p.productId !== product.productId).slice(0, 4).map((p) => <ProductCard key={p.productId} product={p} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
