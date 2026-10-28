import { useState } from 'react';
import { UserX, Loader2 } from 'lucide-react';
import { callAdminSettings } from '../../utils/adminApi';

/**
 * Permanently deletes every member / site-account record (subscribers, site
 * accounts, subscription requests, advertisers, favourites, match chats and the
 * registrations stored on parties). Admin accounts and the parties stay.
 * The site has no accounts any more: registration is by WhatsApp only.
 */
const PurgeMembersButton = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const purge = async () => {
    if (busy) return;
    const typed = window.prompt('מחיקה לצמיתות של כל המנויים, המשתמשים והמפרסמים (המנהלים והמסיבות נשארים). אי אפשר לשחזר.\n\nכדי לאשר, כתבו: מחק');
    if (typed === null) return;
    if (typed.trim() !== 'מחק') { setResult('לא נמחק: צריך לכתוב "מחק" בדיוק'); return; }
    setBusy(true);
    setResult('');
    try {
      const { deleted } = await callAdminSettings('purge-members', { confirm: 'מחק' });
      const total = Object.entries(deleted || {}).filter(([k]) => k !== 'partiesCleared').reduce((n, [, v]) => n + (Number(v) || 0), 0);
      setResult(`נמחקו ${total} רשומות (מתוכן ${deleted?.users || 0} מנויים)`);
    } catch (err) {
      setResult(`המחיקה נכשלה: ${err.message || 'שגיאה'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={purge}
        disabled={busy}
        className="text-white text-sm font-bold flex items-center gap-2"
        style={{ background: '#3a0f1c', border: '1px solid #ff5a7a', borderRadius: 15, padding: '10px 16px' }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} style={{ color: '#ff5a7a' }} />}
        מחיקת כל המנויים והמשתמשים
      </button>
      {result && <span className="text-xs" style={{ color: result.startsWith('נמחקו') ? '#3ecf6d' : '#ff8a8a' }}>{result}</span>}
    </div>
  );
};

export default PurgeMembersButton;
