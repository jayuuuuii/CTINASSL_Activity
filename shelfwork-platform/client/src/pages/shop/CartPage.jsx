import { useState } from 'react';
import { ShoppingBag, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import PageBanner from '../../components/PageBanner.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import QuantitySelector from '../../components/QuantitySelector.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Loading from '../../components/Loading.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../utils.js';

export default function CartPage() {
  const { cart, loading, updateItem, removeItem, clear } = useCart();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  const run = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (isAdmin)
    return (
      <div className="container section">
        <EmptyState icon={ShoppingBag} title="Admins don't have a cart" action={<a className="btn btn--primary" href="#/admin">Go to the admin panel</a>}>
          Log out and sign in with a customer account to shop.
        </EmptyState>
      </div>
    );

  const toFree = cart.freeShippingOver - cart.subtotal;

  return (
    <>
      <PageBanner eyebrow="Cart" title="Your cart" />
      <section className="section section--tight">
        <div className="container">
          {loading ? <Loading /> : cart.items.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<a className="btn btn--primary" href="#/shop">Start shopping</a>}>
              Browse the shop and add a few things you like.
            </EmptyState>
          ) : (
            <div className="cart">
              <div className="cart__lines">
                {cart.items.map((item) => (
                  <div className={`cart-line ${item.issue ? 'cart-line--issue' : ''}`} key={item.productId}>
                    <a href={`#/product/${item.productId}`}><ProductImage product={item} size="sm" /></a>
                    <div className="cart-line__info">
                      <a href={`#/product/${item.productId}`} className="cart-line__name">{item.productName}</a>
                      <span className="cart-line__unit">{formatCurrency(item.unitPrice)} each</span>
                      {item.issue && <span className="cart-line__issue"><AlertTriangle size={14} strokeWidth={1.5} /> {item.issue}</span>}
                    </div>
                    {item.availableQuantity > 0 && !item.issue?.includes('unavailable') ? (
                      <QuantitySelector
                        value={item.quantity}
                        max={Math.max(item.quantity, item.availableQuantity)}
                        disabled={busyId === item.productId}
                        onChange={(q) => run(item.productId, () => updateItem(item.productId, q))}
                      />
                    ) : <span className="cart-line__qty">× {item.quantity}</span>}
                    <strong className="cart-line__total">{item.issue ? '—' : formatCurrency(item.lineTotal)}</strong>
                    <button className="icon-btn icon-btn--danger" aria-label={`Remove ${item.productName}`} disabled={busyId === item.productId} onClick={() => run(item.productId, () => removeItem(item.productId))}>
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                <button className="link-btn" onClick={() => run('all', clear)}>Empty cart</button>
              </div>

              <aside className="summary">
                <h3>Order summary</h3>
                <dl>
                  <div><dt>Items ({cart.itemCount})</dt><dd>{formatCurrency(cart.subtotal)}</dd></div>
                  <div><dt>Delivery</dt><dd>{cart.shippingFee ? formatCurrency(cart.shippingFee) : 'Free'}</dd></div>
                  <div className="summary__total"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
                </dl>
                {toFree > 0 && cart.subtotal > 0 && <p className="summary__note">Add {formatCurrency(toFree)} more for free delivery.</p>}
                {cart.hasIssues && <p className="inline-msg inline-msg--error">Fix the highlighted items before checking out.</p>}
                <a
                  href={user ? '#/checkout' : '#/login?next=checkout'}
                  className={`btn btn--primary btn--lg btn--block ${cart.hasIssues || cart.subtotal === 0 ? 'is-disabled' : ''}`}
                  aria-disabled={cart.hasIssues || cart.subtotal === 0}
                  onClick={(e) => (cart.hasIssues || cart.subtotal === 0) && e.preventDefault()}
                >
                  {user ? 'Checkout' : 'Log in to check out'} <ArrowRight size={18} strokeWidth={1.5} />
                </a>
                <a href="#/shop" className="summary__continue">Continue shopping</a>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
