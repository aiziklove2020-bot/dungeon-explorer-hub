import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { useSiteAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

/**
 * Landing: /chat/join/:inviteToken — add user to private room and open chat.
 */
const ChatInviteJoin = () => {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { forumUser } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(true);

  useEffect(() => {
    if (!forumUser?.id || !inviteToken) {
      setWorking(false);
      if (!inviteToken) setError(t('chat.inviteLinkInvalid'));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { joinPrivateRoomViaInvite } = await import('../firebase/liveChat');
        const result = await joinPrivateRoomViaInvite(inviteToken, forumUser, siteUser, {
          observeMode: false
        });
        const rid = result?.room?.id;
        if (!cancelled && rid) {
          navigate(`/chat/${rid}`, { replace: true });
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || t('chat.inviteJoinFailed'));
      } finally {
        if (!cancelled) setWorking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forumUser?.id, inviteToken, navigate, siteUser, t]);

  if (working) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 px-4 py-12" dir="rtl">
        <Loader className="animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-400">{t('chat.inviteJoining')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-12 text-center" dir="rtl">
        <p className="mb-6 max-w-md text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700"
        >
          {t('chat.backLobby')}
        </button>
      </div>
    );
  }

  return null;
};

export default ChatInviteJoin;
