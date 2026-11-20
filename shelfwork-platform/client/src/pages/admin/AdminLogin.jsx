import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import Field from '../../components/Field.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { navigate } from '../../hooks/useHashRoute.js';

export default function AdminLogin() {
  const { login, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.email, form.password, 'admin');
      navigate('admin');
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="auth__card" onSubmit={submit} noValidate>
        <div className="admin-login__brand"><Logo tone="dark" /></div>
        <p className="eyebrow"><ShieldCheck size={14} strokeWidth={1.5} /> Staff only</p>
        <h1>Admin login</h1>
        {user && user.role !== 'admin' && <p className="notice">You are signed in as a customer ({user.email}). Signing in here replaces that session.</p>}
        {error && <p className="form-error">{error.message}</p>}
        <Field id="a-email" label="Email address">
          <input id="a-email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
        </Field>
        <Field id="a-pass" label="Password">
          <input id="a-pass" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth__alt"><a href="#/home">Back to the shop</a></p>
      </form>
    </div>
  );
}
