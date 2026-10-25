/* ==========================================================================
   validation.js — small, composable validators.

   CONCEPTS IN THIS FILE
   • Pure functions ......... same input -> same output, no side effects
   • Higher-order functions . minLen(3) *returns* a validator function
   • Closures ............... the returned function remembers n / min / max
   • Regular expressions .... email and phone patterns
   • Convention ............. every validator returns '' (valid) or a message
   ========================================================================== */
export const V = {
  // `v && …` guards null/undefined before calling String methods.
  required: (v) => (v && String(v).trim().length ? '' : 'This field is required.'),

  // Higher-order: call minLen(3) once to get a validator that checks length >= 3.
  minLen: (n) => (v) => (String(v || '').trim().length >= n ? '' : `Must be at least ${n} characters.`),

  // ^ and $ anchor the pattern; [^\s@]+ means "one or more non-space, non-@ characters".
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') ? '' : 'Enter a valid email address.'),

  // Indian mobile numbers: 10 digits starting 6–9.
  phone: (v) => (/^[6-9]\d{9}$/.test(String(v || '').trim()) ? '' : 'Enter a valid 10-digit phone number.'),

  range: (min, max) => (v) => {
    const n = Number(v);
    if (v === '' || Number.isNaN(n)) return 'Enter a valid number.';
    return n < min || n > max ? `Must be between ${min} and ${max}.` : '';
  },

  // Second argument `all` is the whole form's values — lets one field depend on another.
  match: (other, label = 'fields') => (v, all) => (all[other] === v ? '' : `The ${label} must match.`),

  checked: (msg = 'You must accept this to continue.') => (v) => (v ? '' : msg)
};
