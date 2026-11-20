import { useState } from 'react';
import Field from '../../components/Field.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { navigate } from '../../hooks/useHashRoute.js';
import { fieldErrors } from '../../api/client.js';

const safeNext = (next) => (next && /^[a-z0-9/_-]+$/i.test(next) && !next.startsWith('admin') ? next : 'account');

export default function RegisterPage({ params }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = 'Include at least one letter and one number.';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      const { confirm, ...fields } = form;
      await register(fields);
      navigate(safeNext(params.get('next')));
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err);
      setBusy(false);
    }
  }

  return (
    <section className="section auth">
      <form className="auth__card auth__card--wide" onSubmit={submit} noValidate>
        <p className="eyebrow">New customer</p>
        <h1>Create an account</h1>
        {error && !Object.keys(fieldErrors(error)).length && <p className="form-error">{error.message}</p>}
        <div className="form__grid">
          <Field id="r-name" label="Full name" error={errors.fullName} className="span-2">
            <input id="r-name" autoComplete="name" value={form.fullName} onChange={set('fullName')} autoFocus />
          </Field>
          <Field id="r-email" label="Email address" error={errors.email}>
            <input id="r-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field id="r-phone" label="Contact number (optional)" error={errors.phone}>
            <input id="r-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field id="r-address" label="Delivery address (optional)" error={errors.address} className="span-2">
            <input id="r-address" autoComplete="street-address" value={form.address} onChange={set('address')} />
          </Field>
          <Field id="r-pass" label="Password" error={errors.password} hint="At least 8 characters with a letter and a number.">
            <input id="r-pass" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          </Field>
          <Field id="r-confirm" label="Confirm password" error={errors.confirm}>
            <input id="r-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </Field>
        </div>
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="auth__alt">Already have an account? <a href="#/login">Log in</a></p>
      </form>
    </section>
  );
}
