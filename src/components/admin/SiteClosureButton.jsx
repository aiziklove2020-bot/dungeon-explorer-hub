import { useEffect, useState } from 'react';
import { Power, Loader2 } from 'lucide-react';
import { getSiteClosure, setSiteClosure } from '../../firebase/siteConfig';

/**
 * One button that closes or reopens the whole public site at once (no deploy).
 * While closed every public page shows only the closure screen, with the
 * optional text the admin typed; the admin panel keeps working.
 */
const SiteClosureButton = () => {
  const [state, setState] = useState(null); // { closed, text } once loaded
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteClosure().then(setState).catch(() => setError('לא הצלחתי לבדוק אם האתר פתוח'));
  }, []);

  const toggle = async () => {
    if (!state || busy) return;
    setError('');
    let text = state.text;
    if (!state.closed) {
      const typed = window.prompt('לסגור את האתר לכולם? אפשר לכתוב הודעה שתופיע מתחת ל"האתר סגור כרגע" (לא חובה):', state.text || '');
      if (typed === null) return;
      text = typed.trim();
    } else if (!window.confirm('לפתוח את האתר מחדש לכולם?')) {
      return;
    }
    setBusy(true);
    try {
      await setSiteClosure(!state.closed, text);
      setState({ closed: !state.closed, text });
    } catch {
      setError('השמירה נכשלה, נסה שוב');
    } finally {
      setBusy(false);
    }
  };

  const closed = state?.closed;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={!state || busy}
        className="text-white text-sm font-bold flex items-center gap-2"
        style={{ background: closed ? '#3a0f1c' : '#1c1120', border: `1px solid ${closed ? '#ff5a7a' : '#f4bfd733'}`, borderRadius: 15, padding: '10px 16px', opacity: state ? 1 : 0.6 }}
      >
        {busy || !state ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} style={{ color: closed ? '#3ecf6d' : '#ff5a7a' }} />}
        {!state ? 'בודק מצב האתר…' : closed ? 'האתר סגור · לפתוח את האתר' : 'סגירת האתר'}
      </button>
      {error && <span className="text-xs" style={{ color: '#ff8a8a' }}>{error}</span>}
    </div>
  );
};

export default SiteClosureButton;
