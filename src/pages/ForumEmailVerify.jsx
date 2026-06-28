import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import SEO from '../components/SEO';

const ForumEmailVerify = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { refreshForumUser } = useForumAuth();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('verifying'); // verifying | success | expired | invalid | error
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    if (!token || token.length < 32) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const resp = await fetch('/api/forum-auth?action=verify-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        if (resp.ok) {
          setStatus('success');
          // Pull the freshly verified user doc into context so the rest of
          // the app sees emailVerified=true without requiring a hard reload.
          refreshForumUser?.().catch(() => {});
          setTimeout(() => navigate('/forum', { replace: true }), 2200);
          return;
        }
        if (resp.status === 410) {
          setStatus('expired');
          return;
        }
        const data = await resp.json().catch(() => ({}));
        if (data?.error === 'invalid_token') {
          setStatus('invalid');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, [token, navigate]);

  const messageColor = status === 'success' ? '#86efac' : status === 'verifying' ? '#a1a1aa' : '#fca5a5';
  const message =
    status === 'verifying'
      ? (t('auth.verifyingEmail') || 'מאמת אימייל...')
      : status === 'success'
        ? (t('auth.verifyEmailSuccess') || 'האימייל אומת, תודה')
        : status === 'expired'
          ? (t('auth.verifyEmailExpired') || 'הקישור פג. שלח שוב?')
          : status === 'invalid'
            ? (t('auth.resetTokenInvalid') || 'הקישור לא תקף או שפג תוקפו')
            : (t('auth.resetGenericError') || 'שגיאה. נסה שוב.');

  return (
    <div className="container" style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1rem' }} dir="rtl">
      <SEO
        title="אימות אימייל | מדברים BDSM"
        description="אימות כתובת אימייל למשתמש פורום."
        noindex
      />
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '1rem',
          background: 'rgba(24,24,27,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          textAlign: 'center'
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          {t('auth.verifyEmailTitle') || 'אימות כתובת אימייל'}
        </h1>
        <p style={{ color: messageColor, fontSize: '1rem', margin: 0 }}>{message}</p>
        {(status === 'expired' || status === 'invalid' || status === 'error') && (
          <button
            type="button"
            onClick={() => navigate('/forum', { replace: true })}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t('auth.backToForum') || 'חזרה לפורום'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ForumEmailVerify;
