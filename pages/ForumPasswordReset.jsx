import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import SEO from '../components/SEO';

const ForumPasswordReset = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | invalid | expired | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || token.length < 32) {
      setStatus('invalid');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (status === 'invalid' || status === 'expired') return;
    if (!password || password.length < 4) {
      setError(t('auth.resetPasswordTooShort') || 'סיסמה חייבת להכיל לפחות 4 תווים');
      return;
    }
    if (password !== confirm) {
      setError(t('auth.resetPasswordsDoNotMatch') || 'הסיסמאות אינן תואמות');
      return;
    }
    setStatus('submitting');
    try {
      const resp = await fetch('/api/forum-auth?action=reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      if (resp.ok) {
        setStatus('success');
        setTimeout(() => navigate('/forum', { replace: true }), 2200);
        return;
      }
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 410 || data?.error === 'expired') {
        setStatus('expired');
      } else if (data?.error === 'password_too_short') {
        setStatus('idle');
        setError(t('auth.resetPasswordTooShort') || 'סיסמה חייבת להכיל לפחות 4 תווים');
      } else {
        setStatus('error');
        setError(t('auth.resetGenericError') || 'שגיאה. נסה שוב.');
      }
    } catch (err) {
      setStatus('error');
      setError(t('auth.resetGenericError') || 'שגיאה. נסה שוב.');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.95rem',
    direction: 'ltr',
    textAlign: 'right'
  };
  const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.25rem',
    opacity: status === 'submitting' ? 0.7 : 1
  };

  return (
    <div className="container" style={{ maxWidth: '520px', margin: '4rem auto', padding: '0 1rem' }} dir="rtl">
      <SEO
        title="איפוס סיסמה | מדברים BDSM"
        description="הגדר סיסמה חדשה לפורום באמצעות הקישור שנשלח לאימייל שלך."
        noindex
      />
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '1rem',
          background: 'rgba(24,24,27,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)'
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {t('auth.resetPasswordTitle') || 'איפוס סיסמת פורום'}
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {t('auth.resetPasswordSubtitle') || 'הזן סיסמה חדשה. הקישור תקף לשימוש חד-פעמי.'}
        </p>

        {status === 'invalid' && (
          <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>
            {t('auth.resetTokenInvalid') || 'הקישור לא תקף או שפג תוקפו'}
          </p>
        )}
        {status === 'expired' && (
          <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>
            {t('auth.resetTokenInvalid') || 'הקישור לא תקף או שפג תוקפו'}
          </p>
        )}
        {status === 'success' && (
          <p style={{ color: '#86efac', marginBottom: '1rem' }}>
            {t('auth.resetSuccess') || 'הסיסמה שונתה. אפשר להתחבר עכשיו'}
          </p>
        )}

        {(status === 'idle' || status === 'submitting' || status === 'error') && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.newPasswordPlaceholder') || 'סיסמה חדשה'}
              autoComplete="new-password"
              autoFocus
              disabled={status === 'submitting'}
              style={inputStyle}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder') || 'אשר סיסמה'}
              autoComplete="new-password"
              disabled={status === 'submitting'}
              style={inputStyle}
            />
            {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={status === 'submitting'} style={buttonStyle}>
              {status === 'submitting'
                ? (t('auth.resetSubmitting') || 'משנה סיסמה...')
                : (t('auth.resetSubmit') || 'עדכן סיסמה')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForumPasswordReset;
