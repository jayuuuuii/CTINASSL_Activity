import { useState } from 'react';
import { Menu, X, ShoppingBag, User } from 'lucide-react';
import Logo from './Logo.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = [
  { id: 'home', label: 'Home', match: ['', 'home'] },
  { id: 'shop', label: 'Shop', match: ['shop', 'product'] },
  { id: 'categories', label: 'Categories', match: ['categories'] },
  { id: 'about', label: 'About', match: ['about'] },
];

export default function Header({ section }) {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const close = () => setOpen(false);

  return (
    <header className="header">
      <div className="container header__inner">
        <a href="#/home" className="header__brand" onClick={close}>
          <Logo tone="light" />
        </a>

        <nav className={`header__nav ${open ? 'is-open' : ''}`} aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.id} href={`#/${l.id}`} className={l.match.includes(section) ? 'is-active' : ''} onClick={close}>
              {l.label}
            </a>
          ))}
          {isAdmin && (
            <a href="#/admin" onClick={close}>
              Admin panel
            </a>
          )}
        </nav>

        <div className="header__tools">
          <a
            href={user ? (isAdmin ? '#/admin' : '#/account') : '#/login'}
            className={`header__tool ${['account', 'login', 'register', 'orders'].includes(section) ? 'is-active' : ''}`}
            onClick={close}
          >
            <User size={20} strokeWidth={1.5} />
            <span className="header__tool-label">{user ? user.fullName.split(' ')[0] : 'Log in'}</span>
          </a>
          {!isAdmin && (
            <a href="#/cart" className={`header__tool ${section === 'cart' || section === 'checkout' ? 'is-active' : ''}`} onClick={close} aria-label={`Cart, ${count} items`}>
              <ShoppingBag size={20} strokeWidth={1.5} />
              <span className="header__tool-label">Cart</span>
              {count > 0 && <span className="header__count">{count}</span>}
            </a>
          )}
          <button className="header__toggle" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X size={26} strokeWidth={1.5} /> : <Menu size={26} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </header>
  );
}
