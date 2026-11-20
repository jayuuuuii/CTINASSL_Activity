import { useState } from 'react';
import Field from '../../components/Field.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { navigate } from '../../hooks/useHashRoute.js';
import { fieldErrors } from '../../api/client.js';

/** Only allow redirects to pages inside this app. */
const safeNext = (next) => (next && /^[a-z0-9/_-]+$/i.test(next) && !next.startsWith('admin') ? next : 'account');

export default function LoginPage({ params }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(form.email, form.password, 'customer');
      navigate(user.role === 'admin' ? 'admin' : next);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err);
      setBusy(false);
    }
  }

  return (
    <section className="section auth">
      <form className="auth__card" onSubmit={submit} noValidate>
        <p className="eyebrow">Welcome back</p>
        <h1>Log in</h1>
        {error && !Object.keys(fieldErrors(error)).length && <p className="form-error">{error.message}</p>}
        <Field id="l-email" label="Email address" error={errors.email}>
          <input id="l-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
        </Field>
        <Field id="l-pass" label="Password" error={errors.password}>
          <input id="l-pass" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="auth__alt">New here? <a href={`#/register${params.get('next') ? `?next=${next}` : ''}`}>Create an account</a></p>
        <p className="auth__alt auth__alt--small">Staff? <a href="#/admin/login">Admin login</a></p>
      </form>
    </section>
  );
}
