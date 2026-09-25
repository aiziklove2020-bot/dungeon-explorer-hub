import { useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useForumAuth } from '../../context/ForumAuthContext';
import { useSiteAuth } from '../../context/AuthContext';
import Dialog from '../a11y/Dialog';
// Shared modal styling (.login-modal-overlay, .login-modal, .login-modal-input,
// etc.) — used to live with the retired phone-only LoginModal; this is now the
// only consumer and is responsible for loading the stylesheet.
import '../LoginModal.css';

const ForumLoginModal = ({ isOpen, onClose, onLoggedIn }) => {
  const { forumLogin, forumRegister, forumResetPassword, requestForumPasswordReset } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const [tab, setTab] = useState('login'); // login | register | forgot | reset
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // After successful register: 'verification' (email sent) — keeps the modal open
  // long enough for the user to see what to do next without auto-closing.
  // After successful forgot-request: 'reset-sent'.
  const [postSubmit, setPostSubmit] = useState(null);

  const titleId = useId();
  const errorId = useId();
  const idNick = useId();
  const idPwd = useId();
  const idEmail = useId();
  const idName = useId();
  const idPhone = useId();
  const idForgot = useId();
  const idNewPwd = useId();
  const firstFieldRef = useRef(null);

  const needsSiteFields = tab === 'register' && !siteUser;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const NICKNAME_RE = /^[\p{L}\p{N}_-]+$/u;
  // Mirror of RESERVED_NICKNAMES in src/firebase/forumUsers.js — server-side
  // is the source of truth, this exists only to skip a network round-trip and
  // give the user the same Hebrew error inline.
  const RESERVED_NICKNAMES = new Set(['admin', 'administrator']);

  const reset = () => {
    setNickname('');
    setPassword('');
    setNewPassword('');
    setName('');
    setPhone('');
    setGender('');
    setEmail('');
    setForgotIdentifier('');
    setError('');
    setPostSubmit(null);
  };

  const handleTab = (t) => {
    setTab(t);
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (tab === 'forgot') {
      const idValue = forgotIdentifier.trim();
      if (!idValue) {
        setError('הזן כינוי או אימייל');
        return;
      }
      setLoading(true);
      try {
        await requestForumPasswordReset(idValue);
        setPostSubmit('reset-sent');
      } catch (err) {
        // The endpoint is generic-success on the wire; only true network errors
        // reach this branch.
        setError(err.message || 'שגיאה');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (tab === 'reset') {
      if (!newPassword || newPassword.length < 6) {
        setError('הסיסמה החדשה חייבת להכיל לפחות 6 תווים');
        return;
      }
    } else if (!nickname.trim() || !password) {
      setError('כינוי וסיסמה נדרשים');
      return;
    }
    if (tab === 'register' && !NICKNAME_RE.test(nickname.trim())) {
      setError('כינוי יכול להכיל אותיות, ספרות, מקף וקו תחתון בלבד');
      return;
    }
    if (tab === 'register' && RESERVED_NICKNAMES.has(nickname.trim().toLowerCase())) {
      setError('הכינוי הזה שמור — בחר כינוי אחר');
      return;
    }
    if (tab === 'register') {
      const trimmed = email.trim();
      if (!trimmed) {
        setError('כתובת אימייל נדרשת לרישום');
        return;
      }
      if (!EMAIL_RE.test(trimmed.toLowerCase())) {
        setError('כתובת אימייל לא תקינה');
        return;
      }
    }
    if (needsSiteFields) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!name.trim()) {
        setError('שם מלא נדרש');
        return;
      }
      if (!cleanPhone || cleanPhone.length !== 10 || !cleanPhone.startsWith('05')) {
        setError('מספר טלפון חייב להתחיל ב-05 ולהיות 10 ספרות');
        return;
      }
      if (!gender) {
        setError('יש לבחור מגדר');
        return;
      }
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await forumLogin(nickname.trim(), password);
        reset();
        // `onLoggedIn` runs after the login state has settled but before
        // the modal closes, so consumers (e.g. <ChatSessionExpired>) can
        // bump their internal reload key in the same React batch as the
        // dismissal — the data effects then re-fire with the fresh chat
        // JWT instead of staying stuck on the old "session expired" view.
        onLoggedIn?.();
        onClose?.();
      } else if (tab === 'reset') {
        // `nickname`/`password` still hold the values from the login attempt
        // that got redirected here (see the PASSWORD_RESET_REQUIRED catch
        // below) — forumResetPassword re-verifies the temporary password
        // server-side before accepting the new one.
        await forumResetPassword(nickname.trim(), password, newPassword);
        reset();
        onLoggedIn?.();
        onClose?.();
      } else {
        const siteFields = needsSiteFields
          ? { name: name.trim(), phone: phone.replace(/\D/g, ''), gender }
          : null;
        const trimmedEmail = email.trim();
        await forumRegister(nickname.trim(), password, siteFields, trimmedEmail);
        // Email is mandatory at registration, so always land on the
        // "check your inbox" screen so the user knows verification is next.
        setPostSubmit('verification');
      }
    } catch (err) {
      // An admin-issued temporary password ("reset login password" in the
      // admin panel) makes the next forumLogin throw this instead of logging
      // in. Before this, the modal just showed the raw English error code
      // with no way to proceed — the account was stuck until someone
      // realized what "PASSWORD_RESET_REQUIRED" meant. Route to a
      // set-new-password step instead.
      if (tab === 'login' && err.code === 'PASSWORD_RESET_REQUIRED') {
        setTab('reset');
        setNewPassword('');
        setError('');
      } else {
        setError(err.message || 'שגיאה');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
      <button
        type="button"
        onClick={() => handleTab('login')}
        aria-pressed={tab === 'login'}
        style={{
          flex: 1,
          padding: '0.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
          background: tab === 'login' ? '#dc2626' : 'rgba(255,255,255,0.08)',
          color: tab === 'login' ? '#fff' : '#a1a1aa',
          transition: 'background 0.2s'
        }}
      >
        התחברות
      </button>
      <button
        type="button"
        onClick={() => handleTab('register')}
        aria-pressed={tab === 'register'}
        style={{
          flex: 1,
          padding: '0.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
          background: tab === 'register' ? '#dc2626' : 'rgba(255,255,255,0.08)',
          color: tab === 'register' ? '#fff' : '#a1a1aa',
          transition: 'background 0.2s'
        }}
      >
        הרשמה
      </button>
    </div>
  );

  const renderForgotSuccess = () => (
    <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
      <p style={{ color: '#86efac', marginBottom: '1rem' }}>
        אם הכתובת קיימת ומאומתת, שלחנו לך מייל עם קישור לאיפוס
      </p>
      <button
        type="button"
        onClick={() => handleTab('login')}
        style={{
          padding: '0.6rem 1.25rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        חזרה להתחברות
      </button>
    </div>
  );

  const renderVerificationSent = () => (
    <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
      <p style={{ color: '#86efac', marginBottom: '0.5rem' }}>הרישום הסתיים, ברוך הבא!</p>
      <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1rem' }}>
        שלחנו אליך מייל לאימות הכתובת. אימות נדרש כדי לאפס את הסיסמה בעתיד.
      </p>
      <button
        type="button"
        onClick={() => { reset(); onClose?.(); }}
        style={{
          padding: '0.6rem 1.25rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: '#dc2626',
          color: '#fff',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        סגור
      </button>
    </div>
  );

  return (
    <Dialog
      open={!!isOpen}
      onClose={onClose}
      labelledBy={titleId}
      className="login-modal-overlay"
      panelClassName="login-modal"
      initialFocusRef={firstFieldRef}
    >
      <div dir="rtl">
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="סגור">
          <X size={20} aria-hidden="true" />
        </button>

        {tab !== 'forgot' && tab !== 'reset' && renderTabs()}

        <h2 id={titleId} className="login-modal-title">
          {tab === 'forgot'
            ? 'איפוס סיסמה'
            : tab === 'reset'
              ? 'נדרשת סיסמה חדשה'
              : tab === 'login'
                ? 'התחברות לפורום ובלוג'
                : 'הרשמה לפורום ובלוג'}
        </h2>
        <p className="login-modal-subtitle">
          {tab === 'forgot'
            ? 'הזן את הכינוי או האימייל שלך ונשלח קישור לאיפוס סיסמה'
            : tab === 'reset'
              ? 'הוגדרה עבורך סיסמה זמנית — בחר/י סיסמה חדשה כדי להמשיך'
              : tab === 'login'
                ? 'הזן כינוי וסיסמה כדי להתחבר'
                : 'בחר כינוי וסיסמה כדי ליצור חשבון'}
        </p>

        {postSubmit === 'reset-sent' && renderForgotSuccess()}
        {postSubmit === 'verification' && renderVerificationSent()}

        {!postSubmit && (
          <form onSubmit={handleSubmit} className="login-modal-form">
            {tab === 'forgot' ? (
              <>
                <label htmlFor={idForgot} className="sr-only">כינוי או אימייל</label>
                <input
                  id={idForgot}
                  ref={firstFieldRef}
                  type="text"
                  value={forgotIdentifier}
                  onChange={e => setForgotIdentifier(e.target.value)}
                  placeholder="כינוי או אימייל"
                  maxLength={120}
                  className="login-modal-input"
                  autoComplete="username"
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                />
              </>
            ) : tab === 'reset' ? (
              <>
                <label htmlFor={idNewPwd} className="sr-only">סיסמה חדשה</label>
                <input
                  id={idNewPwd}
                  ref={firstFieldRef}
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="סיסמה חדשה (לפחות 6 תווים)"
                  className="login-modal-input"
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                />
              </>
            ) : (
              <>
                <label htmlFor={idNick} className="sr-only">כינוי</label>
                <input
                  id={idNick}
                  ref={firstFieldRef}
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="כינוי"
                  maxLength={30}
                  className="login-modal-input"
                  autoComplete="username"
                  disabled={loading}
                />
                <label htmlFor={idPwd} className="sr-only">סיסמה</label>
                <input
                  id={idPwd}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  className="login-modal-input"
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  disabled={loading}
                />
                {tab === 'register' && (
                  <>
                    <label htmlFor={idEmail} className="sr-only">אימייל</label>
                    <input
                      id={idEmail}
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="אימייל (נדרש לאימות ולאיפוס סיסמה)"
                      maxLength={120}
                      className="login-modal-input"
                      autoComplete="email"
                      required
                      disabled={loading}
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                    />
                  </>
                )}
              </>
            )}

            {needsSiteFields && (
              <>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
                  <p style={{ color: '#a1a1aa', fontSize: '0.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                    פרטים נוספים לרישום
                  </p>
                </div>
                <label htmlFor={idName} className="sr-only">שם מלא</label>
                <input
                  id={idName}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="שם מלא"
                  maxLength={50}
                  className="login-modal-input"
                  disabled={loading}
                  autoComplete="name"
                />
                <label htmlFor={idPhone} className="sr-only">מספר טלפון</label>
                <input
                  id={idPhone}
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="מספר טלפון (05XXXXXXXX)"
                  maxLength={10}
                  className="login-modal-input"
                  disabled={loading}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="tel"
                  inputMode="numeric"
                />
                <fieldset style={{ display: 'flex', gap: '0.5rem', border: 0, padding: 0, margin: 0 }}>
                  <legend className="sr-only">מגדר</legend>
                  {[
                    { value: 'male', label: 'גבר' },
                    { value: 'female', label: 'אישה' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      disabled={loading}
                      aria-pressed={gender === opt.value}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        border: gender === opt.value ? '2px solid #dc2626' : '1px solid rgba(255,255,255,0.15)',
                        background: gender === opt.value ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)',
                        color: gender === opt.value ? '#fff' : '#a1a1aa',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
            {error && <p id={errorId} className="login-modal-error" role="alert">{error}</p>}
            <button type="submit" className="login-modal-submit" disabled={loading} aria-disabled={loading}>
              {loading
                ? 'טוען...'
                : tab === 'forgot'
                  ? 'שלח קישור איפוס'
                  : tab === 'reset'
                    ? 'שמור סיסמה חדשה והתחבר'
                    : tab === 'login'
                      ? 'היכנס'
                      : 'הירשם'}
            </button>

            {tab === 'login' && (
              <button
                type="button"
                onClick={() => handleTab('forgot')}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                  textDecoration: 'underline'
                }}
              >
                שכחתי סיסמה
              </button>
            )}
            {tab === 'forgot' && (
              <button
                type="button"
                onClick={() => handleTab('login')}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                  textDecoration: 'underline'
                }}
              >
                חזרה להתחברות
              </button>
            )}
          </form>
        )}
      </div>
    </Dialog>
  );
};

export default ForumLoginModal;
