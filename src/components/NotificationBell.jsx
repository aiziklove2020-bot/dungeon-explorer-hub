import { useState, useEffect, useId, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification
} from '../firebase/notifications';
import { useForumAuth } from '../context/ForumAuthContext';
import { declineRoomInvite } from '../firebase/liveChat';
import { logError } from '../utils/logger';

// Closure over `t` so all strings are i18n-driven (no hardcoded Hebrew).
const buildFormatTimeAgo = (t) => (ts) => {
  if (!ts) return '';
  const sec = ts.seconds || 0;
  const diff = Math.floor(Date.now() / 1000) - sec;
  if (diff < 60) return t('time.now');
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t('time.minutesShort')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('time.hoursShort')}`;
  return `${Math.floor(diff / 86400)} ${t('time.days')}`;
};

const NotificationBell = ({ userId, triggerClassName }) => {
  const { t } = useLanguage();
  const formatTimeAgo = buildFormatTimeAgo(t);
  const navigate = useNavigate();
  const { forumUser } = useForumAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Per-notification "is the accept/decline button currently busy?" so the
  // user doesn't double-click and we can disable both buttons during the
  // network round-trip.
  const [pendingInviteAction, setPendingInviteAction] = useState({});
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, (items) => {
      setNotifs(items.slice(0, 20));
      setUnreadCount(items.filter(n => !n.read).length);
    });
    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markReadLocal = async (n) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setUnreadCount(c => Math.max(0, c - 1));
    }
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  };

  const handleClick = async (n) => {
    // Pending invites have explicit Accept / Decline buttons — clicking the
    // card body shouldn't navigate (it'd be ambiguous: which action did the
    // user mean?). Once read (already accepted/declined or otherwise dealt
    // with), fall through to the normal "go to room" behavior.
    if (n.type === 'chatRoomInvite' && !n.read) return;
    await markReadLocal(n);
    setOpen(false);
    if (n.type === 'reply' || n.type === 'mention_topic') {
      navigate(`/forum/${n.refId}`);
    } else if (n.type === 'comment' || n.type === 'mention_blog') {
      navigate(`/blog/${n.refId}`);
    } else if (n.type === 'follow') {
      navigate(`/profile/${n.fromUserId}`);
    } else if (n.type === 'pm') {
      navigate(`/messages/${n.fromUserId}`);
    } else if (
      (n.type === 'chatMention' || n.type === 'chatRoomInvite' || n.type === 'chatRoomInviteDeclined')
      && n.refId
    ) {
      // chatMention carries refMessageId so we can deep-link to the
      // exact message that mentioned the recipient. ChatRoomView reads
      // ?m=<id> and flashes that bubble for ~2.8s, then strips the
      // param so refresh doesn't re-flash. Other chat-* types navigate
      // to the room without focusing.
      const focusMid =
        n.type === 'chatMention' && typeof n.refMessageId === 'string'
          ? n.refMessageId.trim()
          : '';
      const url = focusMid
        ? `/chat/${n.refId}?m=${encodeURIComponent(focusMid)}`
        : `/chat/${n.refId}`;
      navigate(url);
    }
  };

  const handleAcceptInvite = async (n) => {
    if (!n?.refId) return;
    if (pendingInviteAction[n.id]) return;
    setPendingInviteAction(p => ({ ...p, [n.id]: 'accept' }));
    try {
      await markReadLocal(n);
      setOpen(false);
      navigate(`/chat/${n.refId}`);
    } catch (err) {
      logError('NotificationBell.acceptInvite', err);
    } finally {
      setPendingInviteAction(p => {
        const { [n.id]: _drop, ...rest } = p;
        return rest;
      });
    }
  };

  const handleDeclineInvite = async (n) => {
    if (!n?.refId) return;
    if (pendingInviteAction[n.id]) return;
    setPendingInviteAction(p => ({ ...p, [n.id]: 'decline' }));
    try {
      await declineRoomInvite(n.refId, forumUser);
      // Tell the inviter — best-effort; the decline itself already
      // succeeded so we don't surface failures of this side-channel.
      if (n.fromUserId && forumUser?.id) {
        createNotification({
          userId: n.fromUserId,
          type: 'chatRoomInviteDeclined',
          fromUserId: forumUser.id,
          fromUserName: (forumUser.nickname || '').slice(0, 40),
          refId: n.refId,
          refTitle: n.refTitle || '',
          message: t('notifications.chatInviteDeclined') || 'דחה/תה את ההזמנה שלך לחדר'
        }).catch(() => {});
      }
      await markReadLocal(n);
    } catch (err) {
      logError('NotificationBell.declineInvite', err);
      alert(err?.message || t('chat.loadError') || 'שגיאה');
    } finally {
      setPendingInviteAction(p => {
        const { [n.id]: _drop, ...rest } = p;
        return rest;
      });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userId);
    setNotifs(prev => prev.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  if (!userId) return null;

  const bellAriaLabel = unreadCount > 0
    ? `${t('a11y.notifications') || t('notifications.title')} (${unreadCount})`
    : (t('a11y.notifications') || t('notifications.title'));

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={triggerClassName || 'relative p-1.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-400 hover:text-white transition-colors'}
        aria-label={bellAriaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {unreadCount > 0
          ? `${unreadCount} ${t('a11y.unreadNotifications') || t('notifications.title')}`
          : ''}
      </span>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('notifications.title')}
          className="fixed left-1/2 -translate-x-1/2 top-20 w-[min(22rem,calc(100vw-1.5rem))] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[200] overflow-hidden"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
            <span className="text-white font-bold text-sm">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs text-zinc-300 hover:text-white">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-8">{t('notifications.empty')}</p>
            ) : (
              notifs.map(n => {
                const isPendingInvite = n.type === 'chatRoomInvite' && !n.read;
                const busy = pendingInviteAction[n.id];
                return (
                  <div
                    key={n.id}
                    className={`border-b border-zinc-800/50 transition-colors relative ${!n.read ? 'bg-zinc-800/30' : ''} ${isPendingInvite ? '' : 'hover:bg-zinc-800/50'}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      disabled={isPendingInvite}
                      className={`w-full text-right px-4 py-3 ${isPendingInvite ? 'cursor-default' : ''}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-bold text-pink-400">{n.fromUserName}</span>{' '}
                            {n.message}
                          </p>
                          {n.refTitle && <p className="text-xs text-zinc-400 truncate mt-0.5">{n.refTitle}</p>}
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-3 left-3" />}
                    </button>
                    {isPendingInvite && (
                      <div className="px-4 pb-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptInvite(n)}
                          disabled={!!busy}
                          className="inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                        >
                          <Check size={14} aria-hidden />
                          {busy === 'accept'
                            ? (t('loading') || '…')
                            : (t('notifications.accept') || 'אשר')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineInvite(n)}
                          disabled={!!busy}
                          className="inline-flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700"
                        >
                          <X size={14} aria-hidden />
                          {busy === 'decline'
                            ? (t('loading') || '…')
                            : (t('notifications.decline') || 'דחה')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
