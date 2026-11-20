import { useEffect, useRef, useState } from 'react';
import { Banknote, CreditCard, Lock } from 'lucide-react';
import PageBanner from '../../components/PageBanner.jsx';
import Field from '../../components/Field.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import Loading from '../../components/Loading.jsx';
import { api, fieldErrors } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { navigate } from '../../hooks/useHashRoute.js';
import { formatCurrency, newIdempotencyKey } from '../../utils.js';

const PAYMENTS = [
  { id: 'COD', icon: Banknote, title: 'Cash on Delivery', text: 'Pay the courier in cash when your order arrives.' },
  { id: 'ONLINE_SIMULATED', icon: CreditCard, title: 'Simulated Online Payment', text: 'For demonstration only: the order is marked paid instantly. No card details are asked for or stored.' },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, loading, refresh } = useCart();
  const [form, setForm] = useState({
    fullName: user.fullName || '', email: user.email || '', phone: user.phone || '', address: user.address || '', notes: '', paymentMethod: 'COD',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // One key per checkout attempt. A retry after a network hiccup reuses it, so the server
  // returns the first order instead of creating a second one.
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    refresh(); // prices and stock might have changed since the cart was opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a contact number with at least 7 digits.';
    if (!form.address.trim()) e.address = 'Enter the delivery address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function placeOrder(ev) {
    ev.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api('/orders', { method: 'POST', body: form, headers: { 'Idempotency-Key': key.current } });
      await refresh(); // the server emptied the cart
      navigate(`orders/${r.data.orderId}?placed=1`);
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(e);
      if (e.code === 'CART_INVALID' || e.code === 'CART_EMPTY') {
        key.current = newIdempotencyKey(); // the cart must change before trying again
        refresh();
      }
      setBusy(false);
    }
  }

  if (loading) return <div className="container section"><Loading /></div>;
  if (cart.items.length === 0 && !busy)
    return (
      <div className="container section">
        <p className="notice">Your cart is empty. <a href="#/shop">Go to the shop</a>.</p>
      </div>
    );

  return (
    <>
      <PageBanner eyebrow="Checkout" title="Delivery and payment" />
      <section className="section section--tight">
        <form className="container checkout" onSubmit={placeOrder} noValidate>
          <div className="checkout__main">
            <ErrorNotice error={error && !Object.keys(fieldErrors(error)).length ? error : null} />
            {cart.hasIssues && <p className="notice notice--warn">Some items in your cart need attention. <a href="#/cart">Review your cart</a> before placing the order.</p>}

            <fieldset className="panel">
              <legend>Your details</legend>
              <div className="form__grid">
                <Field id="c-name" label="Full name" error={errors.fullName}>
                  <input id="c-name" autoComplete="name" value={form.fullName} onChange={set('fullName')} />
                </Field>
                <Field id="c-email" label="Email address" error={errors.email}>
                  <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
                </Field>
                <Field id="c-phone" label="Contact number" error={errors.phone}>
                  <input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+63 917 123 4567" />
                </Field>
                <Field id="c-address" label="Delivery address" error={errors.address} className="span-2">
                  <textarea id="c-address" rows="2" autoComplete="street-address" value={form.address} onChange={set('address')} />
                </Field>
                <Field id="c-notes" label="Delivery notes (optional)" error={errors.notes} className="span-2">
                  <input id="c-notes" maxLength={300} value={form.notes} onChange={set('notes')} placeholder="e.g. Leave with the guard" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="panel">
              <legend>Payment method</legend>
              <div className="pay-options">
                {PAYMENTS.map(({ id, icon: Icon, title, text }) => (
                  <label key={id} className={`pay-option ${form.paymentMethod === id ? 'is-selected' : ''}`}>
                    <input type="radio" name="payment" value={id} checked={form.paymentMethod === id} onChange={set('paymentMethod')} />
                    <Icon size={28} strokeWidth={1} />
                    <span>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </span>
                  </label>
                ))}
              </div>
              {errors.paymentMethod && <p className="field__error">{errors.paymentMethod}</p>}
            </fieldset>
          </div>

          <aside className="summary">
            <h3>Order summary</h3>
            <ul className="summary__items">
              {cart.items.map((i) => (
                <li key={i.productId} className={i.issue ? 'has-issue' : ''}>
                  <ProductImage product={i} size="sm" />
                  <span>
                    {i.productName}
                    <small>{i.quantity} × {formatCurrency(i.unitPrice)}</small>
                    {i.issue && <small className="text-danger">{i.issue}</small>}
                  </span>
                  <strong>{i.issue ? '—' : formatCurrency(i.lineTotal)}</strong>
                </li>
              ))}
            </ul>
            <dl>
              <div><dt>Subtotal</dt><dd>{formatCurrency(cart.subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{cart.shippingFee ? formatCurrency(cart.shippingFee) : 'Free'}</dd></div>
              <div className="summary__total"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
            </dl>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy || cart.hasIssues}>
              <Lock size={16} strokeWidth={1.5} /> {busy ? 'Placing order…' : `Place order · ${formatCurrency(cart.total)}`}
            </button>
            <p className="summary__note">Totals are confirmed by our server when you place the order.</p>
          </aside>
        </form>
      </section>
    </>
  );
}
