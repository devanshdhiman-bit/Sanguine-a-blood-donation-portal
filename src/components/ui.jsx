/* ==========================================================================
   ui.jsx — small reusable presentational components.

   CONCEPTS
   • Props & children ...... components configured from outside
   • Polymorphic `as` prop . <Reveal as="section"> renders any tag
   • Rest props (...rest) .. forward unknown attributes to the DOM element
   • requestAnimationFrame . smooth, frame-synced count-up animation
   • Easing function ....... 1 - (1-p)^3 (ease-out cubic)
   • Controlled inputs ..... value + onChange come from useForm
   • Accessibility ......... aria-invalid, role="radiogroup", role="status"
   • Async UI states ....... <Loading/> and <ErrorNote/> for Promise results
   • Derived data .......... fmtDate formats with Intl via toLocaleDateString
   ========================================================================== */
import { useEffect, useState } from 'react';
import { useReveal } from '../lib/hooks';

export const GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/** Fades/slides in once scrolled into view (CSS handles the animation via .reveal/.in). */
export function Reveal({ className = '', children, as: Tag = 'div', ...rest }) {
  const [ref, shown] = useReveal();
  return <Tag ref={ref} className={`${className} reveal${shown ? ' in' : ''}`} {...rest}>{children}</Tag>;
}

/** Animated count-up number. Re-animates whenever `value` changes (e.g. when data finishes loading). */
export function Counter({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1200, 1);          // progress 0 -> 1 over 1.2s
      setN(Math.round((1 - Math.pow(1 - p, 3)) * value));   // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);         // schedule the next frame
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);                 // stop if unmounted mid-animation
  }, [value]);
  return <>{n.toLocaleString()}</>;
}

/** Shown while a Promise is pending. role="status" lets screen readers announce it. */
export function Loading({ label = 'Loading…' }) {
  return <p className="muted" role="status" aria-live="polite" style={{ padding: '1rem 0' }}>⏳ {label}</p>;
}

/** Shown when a Promise rejected. `error.message` comes from the ApiError thrown in api.js. */
export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="empty-state" role="alert"><strong>Something went wrong</strong>{error.message}</div>;
}

export function PageHero({ eyebrow, title, lead, center, children }) {
  return (
    <section className="page-hero">
      <div className={`container${center ? ' text-center' : ''}`}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {/* Conditional rendering with && : only draws the <p> when `lead` exists */}
        {lead && <p className="lead" style={center ? { maxWidth: '52ch', marginInline: 'auto' } : { maxWidth: '60ch' }}>{lead}</p>}
        {children}
      </div>
    </section>
  );
}

/** Label + input + error message. `f` is the object returned by useForm. */
export function Field({ f, name, label, hint, type = 'text', as = 'input', children, ...props }) {
  const Tag = as; // 'input' | 'select' | 'textarea' — a variable tag name
  const err = f.errors[name];
  return (
    <div className={`field${err ? ' error' : ''}`}>
      <label htmlFor={name}>{label} {hint && <span className="hint">{hint}</span>}</label>
      <Tag id={name} name={name} type={as === 'input' ? type : undefined} value={f.values[name]}
        onChange={f.handleChange} onBlur={f.handleBlur} aria-invalid={!!err} {...props}>{children}</Tag>
      <div className="error-msg">{err}</div>
    </div>
  );
}

/** Radio pills (blood group / urgency). The CSS hides the radio and styles the label. */
export function Picker({ name, label, options, value, onChange, className = 'bg-picker' }) {
  return (
    <div className={className} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        // display:contents makes the wrapper span invisible to layout, but the
        // `input:checked + label` CSS selector still sees them as siblings.
        <span key={o} style={{ display: 'contents' }}>
          <input type="radio" id={`${name}-${o}`} name={name} value={o} checked={value === o} onChange={() => onChange(o)} />
          <label htmlFor={`${name}-${o}`}>{o}</label>
        </span>
      ))}
    </div>
  );
}

// Intl-based date formatting with sensible defaults, overridable per call.
export const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(d).toLocaleDateString('en-IN', opts);

export function Empty({ title, children }) {
  return <div className="empty-state"><strong>{title}</strong>{children}</div>;
}
