/* ==========================================================================
   context.jsx — React Context API: app-wide state for the React pages.

   WHAT LIVES WHERE (state architecture)
   • Context (here) ..... who is logged in (session) + toast notifications
   • Redux Toolkit ...... blood requests (src/store) — shared, persisted, derived data
   • Component state .... a single form's values / errors (useForm in lib/hooks.js)
   • localStorage ....... the durable copy; the plain-JS pages read the same keys

   CONCEPTS
   • createContext / Provider / useContext, wrapped in a custom hook (useApp)
   • useSyncExternalStore (via useStored) — React re-renders when the session
     changes anywhere (this tab, the shared header, another tab)
   • useCallback + useMemo — keep the context value stable so consumers
     don't re-render needlessly
   • Functional state updates, timers for toast fade-out
   Dark mode is owned by the shared header (js/shell.js), not duplicated here.
   ========================================================================== */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { KEYS, write } from '../js/lib/storage.js';
import { useStored } from './lib/hooks';

const Ctx = createContext(null);

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

export function AppProvider({ children }) {
  const user = useStored(KEYS.USER); // live value from localStorage
  const [toasts, setToasts] = useState([]);

  // Toast lifecycle: add -> after 3.2s mark "leaving" (CSS fade) -> after 3.5s remove.
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random(); // unique key for React's list rendering
    setToasts((t) => [...t, { id, message, type, leaving: false }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 3200);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const login = useCallback((u) => write(KEYS.USER, u), []);    // store the session
  const logout = useCallback(() => write(KEYS.USER, null), []); // null deletes the key

  const value = useMemo(() => ({ user, login, logout, toast, toasts }), [user, login, logout, toast, toasts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
