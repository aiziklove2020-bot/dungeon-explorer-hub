import { useState } from 'react';
import { Mail, LogOut } from 'lucide-react';
import { useForumAuth } from '../../context/ForumAuthContext';
import { setForumUserEmail } from '../../firebase/forumUsers';
import { logError } from '../../utils/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Enforced gate shown to logged-in forum users who do NOT have an email on
 * file. They must add an email (and we kick off a verification mail) before
 * they can access any gated content. There is no dismiss action — the only
 * escapes are "save email" or "logout".
 *
 * This complements ForumEmailBanner, which stays for users that DO have an
 * email but haven't clicked the verification link yet (banner is dismissible
 * because their account is fully usable; only password-reset is gated).
 */
const ForumEmailRequiredScreen = () => {
  const { forumUser, refreshForumUser, requestForumEmailVerification, forumLogout } = useForumAuth();
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSave = async (e) => {
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
      // Fire-and-forget verification mail; the API is generic-success so we
      // don't surface failures here.
      requestForumEmailVerification({ forumUserId: forumUser.id }).catch(() => {});
      setInfo('שלחנו אליך מייל לאימות. בדוק את התיבה.');
      // Refresh the context's forumUser so the gate dismisses on next render.
      await refreshForumUser();
    } catch (err) {
      logError('ForumEmailRequiredScreen.save', err);
      setError(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8" dir="rtl">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
          <Mail size={28} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          נדרשת כתובת אימייל
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          חשבונך מצריך כתובת אימייל לפני שתוכל להמשיך. נשלח אליך מייל לאימות, וזה ישמש גם לאיפוס סיסמה בעתיד.
        </p>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="example@email.com"
            disabled={submitting}
            autoFocus
            required
            maxLength={120}
            autoComplete="email"
            dir="ltr"
            style={{ textAlign: 'right' }}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-red-500 focus:outline-none text-white text-sm transition-colors"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {info && <p className="text-emerald-400 text-xs">{info}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {submitting ? 'שומר...' : 'שמור ושלח מייל אימות'}
          </button>
        </form>
        <button
          type="button"
          onClick={forumLogout}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          <LogOut size={12} />
          התנתק
        </button>
      </div>
    </div>
  );
};

export default ForumEmailRequiredScreen;
