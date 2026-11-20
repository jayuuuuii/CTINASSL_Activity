import { useState } from 'react';
import { LayoutDashboard, Package, Tags, Truck, Boxes, Receipt, Users, History, Store, LogOut, Menu, X } from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { navigate } from '../../hooks/useHashRoute.js';

const NAV = [
  { id: '', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: Receipt },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'transactions', label: 'Stock history', icon: History },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'customers', label: 'Customers', icon: Users },
];

export default function AdminLayout({ section, title, actions, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin">
      <aside className={`admin__side ${open ? 'is-open' : ''}`}>
        <div className="admin__brand">
          <a href="#/admin"><Logo tone="light" /></a>
          <span className="admin__tag">Admin</span>
        </div>
        <nav aria-label="Admin">
          {NAV.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#/admin${id ? `/${id}` : ''}`} className={section === id ? 'is-active' : ''} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.5} /> {label}
            </a>
          ))}
        </nav>
        <div className="admin__side-foot">
          <a href="#/home"><Store size={18} strokeWidth={1.5} /> View shop</a>
        </div>
      </aside>

      <div className="admin__main">
        <header className="admin__top">
          <button className="icon-btn admin__menu" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
          <h1>{title}</h1>
          <div className="admin__user">
            <span>{user.fullName}</span>
            <button
              className="btn btn--outline btn--sm"
              onClick={async () => {
                await logout();
                navigate('admin/login');
              }}
            >
              <LogOut size={14} strokeWidth={1.5} /> Log out
            </button>
          </div>
        </header>
        {actions && <div className="admin__actions">{actions}</div>}
        <main className="admin__content">{children}</main>
      </div>
    </div>
  );
}
