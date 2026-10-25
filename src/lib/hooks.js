/* ==========================================================================
   hooks.js — reusable React hooks.

   CONCEPTS IN THIS FILE
   • useSyncExternalStore ... subscribe React to data that lives OUTSIDE React
   • useQuery (custom hook) . run a Promise-returning function, track
                              loading / error / data, refetch when data changes
   • Cancellation flag ...... ignore a late response from an outdated request
                              (prevents race conditions & updates after unmount)
   • useRef ................. keep a mutable value without causing re-renders
   • useEffect cleanup ...... the function returned from an effect
   • IntersectionObserver ... browser API that reports when an element is visible
   • Controlled forms ....... React state is the single source of truth
   • Promise.resolve().then . normalise sync/async submit handlers
   • .then / .catch / .finally  promise chaining for the submitting flag
   ========================================================================== */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { read, subscribe, getVersion } from '../../js/lib/storage.js';

/** Live, synchronous view of a localStorage key (used for the session & prefs). */
export function useStored(key) {
  // args: (how to subscribe, how to read the current snapshot)
  return useSyncExternalStore(subscribe, () => read(key));
}

/**
 * useQuery(fetcher) — the async data hook used by every page.
 *   fetcher: () => Promise   (any function from api.js)
 *   returns: { data, loading, error }
 *
 * `loading` is true ONLY for the first load. When data changes later (e.g. you
 * add a request) we refetch silently and keep showing the old data meanwhile,
 * so the UI doesn't flash a spinner on every change.
 */
export function useQuery(fetcher) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });

  // Re-run whenever the storage version changes (set by any write anywhere).
  const version = useSyncExternalStore(subscribe, getVersion);

  // Store the latest fetcher in a ref so the effect doesn't depend on its identity
  // (an inline arrow function is a new function on every render).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false; // flips to true if this effect is superseded or the component unmounts

    fetcherRef.current()
      .then((data) => {                       // fulfilled
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {                     // rejected
        if (!cancelled) setState((s) => ({ ...s, loading: false, error }));
      });

    // Cleanup runs before the next effect and on unmount. A slow, outdated
    // response arriving later is now ignored.
    return () => { cancelled = true; };
  }, [version]);

  return state;
}

/** Reveal-on-scroll: returns [ref, shown]. Attach ref to an element. */
export function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setShown(true); return; } // graceful fallback
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); } // reveal once, then stop watching
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect(); // cleanup on unmount
  }, []);
  return [ref, shown];
}

/**
 * useForm(initial, rules, onValid)
 *   initial : starting values
 *   rules   : { fieldName: [validatorFn, …] }  (see validation.js)
 *   onValid : (values, reset) => void | Promise   — may be async!
 */
export function useForm(initial, rules, onValid) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false); // true while the submit promise is pending

  // Run a field's validators in order and return the first error message.
  const check = useCallback((name, vals) => {
    for (const rule of rules[name] || []) {
      const msg = rule(vals[name], vals); // pass ALL values so rules like match() can compare fields
      if (msg) return msg;
    }
    return '';
  }, [rules]);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  // One generic handler for every input: reads `name` from the element.
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const next = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(next);
    // Once a field shows an error, re-validate as the user types so it clears instantly.
    if (errors[name]) setErrors((er) => ({ ...er, [name]: check(name, next) }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (rules[name]) setErrors((er) => ({ ...er, [name]: check(name, values) }));
  };

  const reset = (vals = initial) => { setValues(vals); setErrors({}); };

  // Curried: handleSubmit(onInvalid) returns the real submit handler.
  const handleSubmit = (onInvalid) => (e) => {
    e.preventDefault();                       // stop the browser's full-page form submit
    if (submitting) return;                   // ignore double clicks while a request is in flight

    const next = {};
    Object.keys(rules).forEach((n) => { next[n] = check(n, values); });
    setErrors(next);
    const firstBad = Object.keys(next).find((n) => next[n]);
    if (firstBad) {
      onInvalid?.();                          // optional chaining: call only if provided
      document.getElementById(firstBad)?.focus(); // move focus to the first problem (accessibility)
      return;
    }

    setSubmitting(true);
    // Promise.resolve().then(fn): works whether onValid is sync or returns a promise,
    // and turns a sync `throw` into a rejection too.
    Promise.resolve()
      .then(() => onValid(values, reset))
      .catch((err) => console.error('Form submit failed', err)) // last-resort safety net
      .finally(() => setSubmitting(false));   // runs on success AND failure
  };

  return { values, errors, submitting, set, handleChange, handleBlur, handleSubmit, reset };
}
