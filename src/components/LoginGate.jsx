import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import ForumLoginModal from './forum/ForumLoginModal';
import ForumEmailBanner from './forum/ForumEmailBanner';
import ForumEmailRequiredScreen from './forum/ForumEmailRequiredScreen';

const LoginGate = ({ children }) => {
  const { forumUser, loading: forumLoading } = useForumAuth();
  const { t } = useLanguage();
  const [forumLoginOpen, setForumLoginOpen] = useState(false);

  if (forumLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="text-zinc-300 text-sm" role="status" aria-live="polite">{t('loading') || 'טוען...'}</div>
      </div>
    );
  }

  if (!forumUser) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8" dir="rtl">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center" aria-hidden="true">
            <UserPlus size={28} className="text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {t('gate.forumTitle') || 'נדרש חשבון פורום ובלוג'}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t('gate.forumSubtitle') || 'כדי לצפות בפורום ובבלוג יש להתחבר או להירשם עם כינוי וסיסמה.'}
          </p>
          <button
            type="button"
            onClick={() => setForumLoginOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            <LogIn size={18} />
            {t('gate.forumLogin') || 'התחבר / הירשם'}
          </button>
        </div>
        <ForumLoginModal
          isOpen={forumLoginOpen}
          onClose={() => setForumLoginOpen(false)}
        />
      </div>
    );
  }

  // Hard gate: legacy accounts without an email on file MUST add one before
  // accessing gated content. The reminder banner (dismissible) only fires
  // for users who have an email but haven't clicked the verify link yet.
  const hasEmail = Boolean(forumUser.email && String(forumUser.email).trim());
  if (!hasEmail) {
    return <ForumEmailRequiredScreen />;
  }

  return (
    <>
      <ForumEmailBanner />
      {children}
    </>
  );
};

export default LoginGate;
