import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { useForumAuth } from '../../context/ForumAuthContext';
import { setForumUserEmail, getForumUserById } from '../../firebase/forumUsers';
import { logError } from '../../utils/logger';

const DISMISS_KEY = 'forumEmailBannerDismissedAt';
// Re-show the banner after a 7-day cooldown so we keep nudging unverified
// accounts without being annoying.
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForumEmailBanner = () => {
  const { forumUser, requestForumEmailVerification } = useForumAuth();
  const [hidden, setHidden] = useState(true);
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [localUser, setLocalUser] = useState(null);

  // Re-fetch the latest user doc so we can see fresh `emailVerified` after
  // the user clicks the magic link in another tab and comes back.
  useEffect(() => {
    let cancelled = false;
    if (!forumUser?.id) {
      setLocalUser(null);
      return undefined;
    }
    (async () => {
      try {
        const fresh = await getForumUserById(forumUser.id);
        if (!cancelled) setLocalUser(fresh || null);
      } catch (err) {
        logError('ForumEmailBanner.fetch', err);
      }
    })();
    return () => { cancelled = true; };
  }, [forumUser?.id]);

  useEffect(() => {
    if (!forumUser?.id) {
      setHidden(true);
      return;
    }
    const u = localUser || forumUser;
    const verified = u?.emailVerified === true;
    if (verified) {
      setHidden(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      const dismissedAt = raw ? Number(raw) : 0;
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) {
        setHidden(true);
        return;
      }
    } catch {
      /* ignore */
    }
    setHidden(false);
  }, [forumUser?.id, localUser]);

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const value = emailInput.trim();
    if (!EMAIL_RE.test(value.toLowerCase())) {
      setError('כתובת אימייל לא תקינה');
      return;
    }
    setSubmitting(true);
    try {
      await setForumUserEmail(forumUser.id, value);
      await requestForumEmailVerification({ forumUserId: forumUser.id });
      setLocalUser({ ...(localUser || forumUser), email: value, emailVerified: false });
      setInfo('שלחנו אליך מייל לאימות הכתובת');
      setEditing(false);
      setEmailInput('');
    } catch (err) {
      setError(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await requestForumEmailVerification({ forumUserId: forumUser.id });
      setInfo('שלחנו שוב מייל אימות');
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden || !forumUser?.id) return null;
  const u = localUser || forumUser;
  const hasEmail = Boolean(u?.email);

  return (
    <div
      dir="rtl"
      style={{
        background: 'rgba(220,38,38,0.08)',
        border: '1px solid rgba(220,38,38,0.35)',
        color: '#fff',
        padding: '0.85rem 1rem',
        margin: '0.75rem auto',
        borderRadius: '0.75rem',
        maxWidth: '900px',
        width: 'calc(100% - 1.5rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <Mail size={16} />
          <span style={{ fontWeight: 700 }}>
            {hasEmail ? 'אמת את כתובת האימייל שלך' : 'הוסף אימייל לאיפוס סיסמה'}
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="סגור"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '0.25rem'
          }}
        >
          <X size={16} />
        </button>
      </div>
      <p style={{ color: '#d4d4d8', fontSize: '0.85rem', margin: 0 }}>
        {hasEmail
          ? `שלחנו לך קישור לאימות הכתובת ${u.email}. אימות נדרש כדי לאפס סיסמה דרך מייל.`
          : 'בלי אימייל מאומת לא נוכל לאפס לך סיסמה. הוסף וחזור לאמת בלחיצה אחת.'}
      </p>
      {!hasEmail && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            alignSelf: 'flex-start',
            padding: '0.4rem 0.9rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: '#dc2626',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          הוסף אימייל
        </button>
      )}
      {!hasEmail && editing && (
        <form onSubmit={handleSaveEmail} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="example@email.com"
            disabled={submitting}
            autoFocus
            style={{
              flex: '1 1 220px',
              minWidth: '180px',
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: '0.9rem',
              direction: 'ltr',
              textAlign: 'right'
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'שולח...' : 'שמור ושלח אימות'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setEmailInput(''); setError(''); }}
            disabled={submitting}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: '#a1a1aa',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ביטול
          </button>
        </form>
      )}
      {hasEmail && (
        <button
          type="button"
          onClick={handleResend}
          disabled={submitting}
          style={{
            alignSelf: 'flex-start',
            padding: '0.4rem 0.9rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? 'שולח...' : 'שלח שוב מייל אימות'}
        </button>
      )}
      {error && <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
      {info && <p style={{ color: '#86efac', fontSize: '0.8rem', margin: 0 }}>{info}</p>}
    </div>
  );
};

export default ForumEmailBanner;
