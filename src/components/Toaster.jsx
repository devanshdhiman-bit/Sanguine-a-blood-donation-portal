// Toaster.jsx — renders the toast list that lives in the Context (src/context.jsx).
// role="status" + aria-live make screen readers announce each message.
import { useApp } from '../context.jsx';

export default function Toaster() {
  const { toasts } = useApp();
  return (
    <div id="toast-root" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}
          style={t.leaving ? { opacity: 0, transform: 'translateY(8px)' } : undefined}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span><span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
