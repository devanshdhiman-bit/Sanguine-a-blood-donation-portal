/* ==========================================================================
   Auth.jsx — Login (with forgot-password) and Signup.

   CONCEPTS
   • Promise-based auth ....... api.login() REJECTS with a 401 ApiError on bad credentials
   • Promise.reject / resolve . see login() in api.js
   • async/await + try/catch .. success -> store session & redirect, failure -> toast
   • Multiple useForm instances in one component (login form + reset form)
   • Toggling views with state  `forgot` swaps which form is rendered
   • Password-strength meter .. derived from the typed value, never stored
   • Controlled demo fill ..... form.reset(valuesObject) pre-fills credentials
   • Delayed redirect ......... setTimeout + navigate() (inside the app) or goTo() (to a plain HTML page)
   ========================================================================== */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin, signup as apiSignup, delay } from '../../js/lib/api.js';
import { goTo } from '../nav.js';
import { useForm } from '../lib/hooks';
import { V } from '../../js/lib/validation.js';
import { useApp } from '../context.jsx';
import { Field } from '../components/ui.jsx';

// Curried helper: returns the callback useForm runs when validation fails.
const invalid = (toast) => () => toast('Please fix the highlighted fields.', 'error');

// Shown on both auth forms: this is NOT real authentication.
function DemoNotice() {
  return (
    <p className="muted" role="note" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
      <strong>Demo authentication only.</strong> There is no server: accounts live in this browser's localStorage and
      passwords are stored as plain text. Don't use a real password.
    </p>
  );
}

export function Login() {
  const { login, toast } = useApp();
  const nav = useNavigate();
  const [forgot, setForgot] = useState(false);

  const f = useForm({ email: '', password: '' }, { email: [V.required, V.email], password: [V.required, V.minLen(6)] }, async (v) => {
    try {
      const session = await apiLogin(v.email.trim(), v.password); // rejects when no account matches
      login(session);                                              // save the session (sync)
      toast(`Welcome back, ${session.name.split(' ')[0]}!`);
      setTimeout(() => nav('/dashboard'), 600);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Second, independent form instance. Awaiting delay() fakes "sending an email".
  const g = useForm({ email: '' }, { email: [V.required, V.email] }, async (v, reset) => {
    await delay(500);
    toast('Demo only: no email was sent and no password was changed.', 'info');
    reset();
  });

  return (
    <main id="main" tabIndex={-1} className="auth-shell">
      <div className="container" style={{ maxWidth: 460 }}>
        {!forgot ? (
          <form className="form-card" noValidate onSubmit={f.handleSubmit(invalid(toast))}>
            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
              <span className="eyebrow">Welcome back</span><h1 style={{ fontSize: '1.8rem' }}>Log in to Sanguine</h1>
            </div>
            <DemoNotice />
            <Field f={f} name="email" label="Email" type="email" placeholder="demo@sanguine.app" autoComplete="email" />
            <div className={`field${f.errors.password ? ' error' : ''}`}>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" value={f.values.password} onChange={f.handleChange}
                onBlur={f.handleBlur} placeholder="demo1234" autoComplete="current-password" />
              <div className="error-msg">{f.errors.password}</div>
              <div className="hint"><a href="#/login" onClick={(e) => { e.preventDefault(); setForgot(true); }}>Forgot password?</a></div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={f.submitting}>{f.submitting ? 'Logging in…' : 'Log In'}</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.6rem' }}
              onClick={() => f.reset({ email: 'demo@sanguine.app', password: 'demo1234' })}>Fill demo credentials</button>
            <p className="muted text-center" style={{ marginTop: '1rem' }}>New here? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Create an account</Link></p>
          </form>
        ) : (
          <form className="form-card" noValidate onSubmit={g.handleSubmit(invalid(toast))}>
            <h3>Reset your password</h3>
            <p className="muted">Demo only: this form does not send an email or reset anything.</p>
            <Field f={g} name="email" label="Email" type="email" placeholder="you@example.com" />
            <button type="submit" className="btn btn-primary btn-block" disabled={g.submitting}>{g.submitting ? 'Working…' : 'Try reset (demo)'}</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.6rem' }} onClick={() => setForgot(false)}>Back to log in</button>
          </form>
        )}
      </div>
    </main>
  );
}

export function Signup() {
  const { login, toast } = useApp();
  const f = useForm({ name: '', email: '', password: '', confirmPassword: '' }, {
    name: [V.required, V.minLen(3)], email: [V.required, V.email], password: [V.required, V.minLen(6)],
    // match() reads the *other* field from the whole-form values passed to every validator
    confirmPassword: [V.required, V.match('password', 'passwords')]
  }, async (v) => {
    try {
      const session = await apiSignup({ name: v.name.trim(), email: v.email.trim(), password: v.password }); // may reject (409)
      login(session);
      toast("Account created! Let's finish your donor profile.");
      setTimeout(() => goTo('donor.html'), 600); // donor profile is a plain HTML page
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Strength score = how many of 4 simple criteria pass. filter(Boolean) counts the trues.
  const p = f.values.password;
  const score = [p.length >= 6, /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

  return (
    <main id="main" tabIndex={-1} className="auth-shell">
      <div className="container" style={{ maxWidth: 460 }}>
        <form className="form-card" noValidate onSubmit={f.handleSubmit(invalid(toast))}>
          <div className="text-center" style={{ marginBottom: '1.5rem' }}>
            <span className="eyebrow">Join the demo</span><h1 style={{ fontSize: '1.8rem' }}>Create your account</h1>
          </div>
          <DemoNotice />
          <Field f={f} name="name" label="Full name" placeholder="e.g. Isha Verma" autoComplete="name" />
          <Field f={f} name="email" label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
          <div className={`field${f.errors.password ? ' error' : ''}`}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={p} onChange={f.handleChange} onBlur={f.handleBlur}
              placeholder="At least 6 characters" autoComplete="new-password" />
            <div className="strength-meter">{[0, 1, 2, 3].map((i) => <span key={i} className={i < score ? 'on' : ''} />)}</div>
            <div className="error-msg">{f.errors.password}</div>
          </div>
          <Field f={f} name="confirmPassword" label="Confirm password" type="password" placeholder="Re-enter password" autoComplete="new-password" />
          <button type="submit" className="btn btn-primary btn-block" disabled={f.submitting}>{f.submitting ? 'Creating account…' : 'Create Account'}</button>
          <p className="muted text-center" style={{ marginTop: '1rem' }}>Already registered? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Log in</Link></p>
        </form>
      </div>
    </main>
  );
}
