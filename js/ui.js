/* ==========================================================================
   ui.js — small DOM helpers shared by every plain-JavaScript page.

   CONCEPTS IN THIS FILE
   • Tagged template literal . html`...` builds markup and ESCAPES every value,
                               so a donor named "<img onerror=…>" is shown as
                               text instead of running (XSS protection).
   • Class instances ......... Safe marks a string as "already trusted HTML"
   • Event delegation ........ bindForm listens on the <form>, not each input
   • Promise.resolve().then() . the submit handler may be sync or async
   • .finally() .............. always re-enables the button, success or failure
   • requestAnimationFrame ... smooth count-up animation (ease-out cubic)
   ========================================================================== */

export const GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Wrapper that says "this string is already safe HTML — don't escape it again". */
class Safe {
  constructor(text) { this.text = text; }
  toString() { return this.text; }
}
export const raw = (text) => new Safe(text);

function toText(value) {
  if (value instanceof Safe) return value.text;
  if (Array.isArray(value)) return value.map(toText).join('');
  if (value === null || value === undefined || value === false) return '';
  return esc(value);
}

/** html`<p>${userText}</p>` — interpolated values are escaped unless they are Safe/arrays of Safe. */
export const html = (strings, ...values) =>
  new Safe(strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? toText(values[i]) : ''), ''));

/** Put markup into an element. Accepts one fragment or an ARRAY of fragments (joined with no separator). */
export const render = (element, safeHtml) => { element.innerHTML = toText(safeHtml); };

export const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(d).toLocaleDateString('en-IN', opts);

/* Markup for the three async states every Promise-driven page shows. */
export const loadingHTML = (label = 'Loading…') =>
  html`<p class="muted" role="status" aria-live="polite" style="padding:1rem 0">⏳ ${label}</p>`;
export const errorHTML = (error) =>
  html`<div class="empty-state" role="alert"><strong>Something went wrong</strong>${error && error.message ? error.message : 'Please try again.'}</div>`;
export const emptyHTML = (title, text = '') =>
  html`<div class="empty-state"><strong>${title}</strong>${text}</div>`;

/** Animated count-up. Safe to call again on the same element (e.g. after data loads). */
export function countUp(element, target, duration = 1200) {
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    element.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * bindForm(form, rules, { onValid, onInvalid, busyLabel })
 *   rules   : { fieldName: [validatorFn, …] }  — same V.* validators the React forms use
 *   onValid : (values, reset) => void | Promise — may be async
 * Expected markup:  <div class="field"><label for="x">…</label><input id="x" name="x"><div class="error-msg"></div></div>
 */
export function bindForm(form, rules, { onValid, onInvalid, busyLabel = 'Working…' } = {}) {
  const submitBtn = form.querySelector('[type="submit"]');
  let idleLabel = submitBtn ? submitBtn.textContent : '';
  let submitting = false;

  const values = () => {
    const out = {};
    [...form.elements].forEach((el) => {
      if (!el.name || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; return; }
      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  };

  const check = (name, vals) => {
    for (const rule of rules[name] || []) {
      const message = rule(vals[name], vals); // pass ALL values so match() can compare fields
      if (message) return message;
    }
    return '';
  };

  const show = (name, message) => {
    const input = form.elements[name];
    const field = input && (input.closest ? input.closest('.field') : null);
    if (!field) return;
    field.classList.toggle('error', !!message);
    const slot = field.querySelector('.error-msg');
    if (slot) slot.textContent = message;
    input.setAttribute('aria-invalid', String(!!message));
  };

  // Validate a field when the user leaves it; once it shows an error, re-check while typing.
  form.addEventListener('focusout', (e) => { if (rules[e.target.name]) show(e.target.name, check(e.target.name, values())); });
  form.addEventListener('input', (e) => {
    const field = e.target.closest && e.target.closest('.field');
    if (rules[e.target.name] && field && field.classList.contains('error')) show(e.target.name, check(e.target.name, values()));
  });

  const reset = (next = {}) => {
    form.reset();
    Object.entries(next).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
    Object.keys(rules).forEach((n) => show(n, ''));
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return; // ignore double-clicks while a request is in flight
    const vals = values();
    const errors = Object.keys(rules).map((n) => [n, check(n, vals)]);
    errors.forEach(([n, m]) => show(n, m));
    const firstBad = errors.find(([, m]) => m);
    if (firstBad) {
      if (onInvalid) onInvalid();
      const el = form.elements[firstBad[0]];
      if (el && el.focus) el.focus();
      return;
    }
    submitting = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = busyLabel; }
    Promise.resolve()
      .then(() => onValid(vals, reset))
      .catch((err) => console.error('Form submit failed', err))
      .finally(() => {
        submitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = idleLabel; }
      });
  });

  const setLabel = (text) => { idleLabel = text; if (submitBtn && !submitting) submitBtn.textContent = text; };

  return { values, reset, show, setLabel };
}
