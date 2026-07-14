import { useState, useEffect, useId, useMemo } from 'react';
import { MessageCircle, Plus, Hash, Megaphone } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useForumAuth } from '../../context/ForumAuthContext';
import { getAllForumUsers } from '../../firebase/forumUsers';
import {
  MAIN_ROOM_ID,
  ensureMainRoom,
  listMyPrivateRooms,
  listActiveRooms,
  listChannels,
  createPrivateRoom,
  createChannel,
  joinRoom
} from '../../firebase/liveChat';
import { useSiteAuth } from '../../context/AuthContext';
import { markChatSeen } from '../../utils/chatClient';
import { logError } from '../../utils/logger';
import { isSupabaseChatBackend } from '../../chat/backend';
import { hasSupabaseChatAccessToken } from '../../supabase/client';
import Dialog from '../a11y/Dialog';
import ChatSessionExpired from './ChatSessionExpired';

const ChatLobby = ({ navigate }) => {
  const { t } = useLanguage();
  const { forumUser, isForumAdmin } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const createDialogTitleId = useId();
  const createChannelDialogTitleId = useId();
  const channelNameInputId = useId();
  const channelCategoryInputId = useId();
  const channelDescriptionInputId = useId();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Distinguish "Supabase chat JWT missing/expired" from generic load failure
  // so the UI can prompt the user to re-login (which is the actual fix when
  // their cross-tab JWT was wiped or expired) instead of just retrying.
  const [sessionExpired, setSessionExpired] = useState(false);
  // Bumped when the user re-authenticates through the in-place login modal.
  // The forum user id stays the same across a re-auth, so the load effect
  // below wouldn't otherwise re-fire and the lobby would remain stuck on
  // the "session expired" screen forever. Including this in the effect deps
  // forces a fresh load with the freshly-issued chat JWT.
  const [reloadKey, setReloadKey] = useState(0);
  const [myPrivate, setMyPrivate] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [channels, setChannels] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('חדר פרטי');
  const [newDescription, setNewDescription] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [forumUsers, setForumUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelCategory, setChannelCategory] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  useEffect(() => {
    markChatSeen();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!forumUser?.id) {
        setLoading(false);
        return;
      }
      setLoadError(null);
      setSessionExpired(false);
      // If we're on the Supabase backend and the chat JWT is missing/expired,
      // every PostgREST call below would fail with a generic "JWT expired" or
      // RLS error. Surface the right remediation up front instead.
      if (isSupabaseChatBackend() && !hasSupabaseChatAccessToken()) {
        if (!cancelled) {
          setSessionExpired(true);
          setLoading(false);
        }
        return;
      }
      // Wrap each step independently: even if optional admin extras fail (e.g.
      // RLS gating broader queries) we still want the lobby to finish loading
      // so the user can see the main room button + their private rooms.
      try {
        await ensureMainRoom();
        const mine = await listMyPrivateRooms(forumUser.id);
        if (!cancelled) setMyPrivate(mine.filter((r) => !r.closedAt));
        try {
          const ch = await listChannels(80);
          if (!cancelled) setChannels((ch || []).filter((r) => !r.closedAt));
        } catch (err) {
          // Channels list is optional surface; lobby still works without it.
          logError('ChatLobby.listChannels', err);
        }
        if (isForumAdmin) {
          try {
            const all = await listActiveRooms(80);
            if (!cancelled) setAllRooms(all.filter((r) => !r.closedAt));
          } catch (err) {
            logError('ChatLobby.listActiveRooms', err);
          }
        }
      } catch (err) {
        logError('ChatLobby.load', err);
        if (!cancelled) {
          // The most common cause of a Supabase load failure is a stale JWT
          // (PostgREST returns "JWT expired" / "invalid claim: ..."). Detect
          // this so we can show the "log out / log back in" hint instead of
          // a useless retry button.
          const msg = String(err?.message || '');
          const looksLikeAuth =
            isSupabaseChatBackend() &&
            (!hasSupabaseChatAccessToken()
              || /jwt|token|auth|expired|claim|JWS|signature/i.test(msg)
              || err?.status === 401
              || err?.code === 'PGRST301');
          if (looksLikeAuth) {
            setSessionExpired(true);
          } else {
            setLoadError(msg || t('chat.loadError') || 'שגיאה בטעינת הצ׳אט');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [forumUser?.id, isForumAdmin, t, reloadKey]);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    (async () => {
      const users = await getAllForumUsers();
      if (!cancelled) setForumUsers(users || []);
    })();
    return () => { cancelled = true; };
  }, [createOpen]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return forumUsers.filter((u) => {
      if (u.id === forumUser?.id || u.isBlocked) return false;
      if (!q) return true;
      return (u.nickname || '').toLowerCase().includes(q);
    }).slice(0, 40);
  }, [forumUsers, userQuery, forumUser?.id]);

  /** Non–forum-admins may only own one non-closed private room they created */
  const atPrivateRoomCreateLimit = useMemo(() => {
    if (isForumAdmin || !forumUser?.id) return false;
    const n = myPrivate.filter(
      (r) => r.createdByForumUserId === forumUser.id && !r.closedAt
    ).length;
    return n >= 1;
  }, [isForumAdmin, forumUser?.id, myPrivate]);

  const enterMain = async () => {
    try {
      await joinRoom(MAIN_ROOM_ID, forumUser, siteUser, { observeMode: false });
      navigate(`/chat/${MAIN_ROOM_ID}`);
    } catch (e) {
      alert(e.message || 'שגיאה');
    }
  };

  const openRoom = async (roomId) => {
    try {
      await joinRoom(roomId, forumUser, siteUser, { observeMode: false });
      navigate(`/chat/${roomId}`);
    } catch (e) {
      alert(e.message || 'שגיאה');
    }
  };

  const handleCreate = async () => {
    if (!forumUser?.id) return;
    if (atPrivateRoomCreateLimit) {
      alert(t('chat.privateRoomLimitReached'));
      return;
    }
    try {
      const invited = [...selectedIds];
      const room = await createPrivateRoom(forumUser.id, newName, invited, {
        creatorIsForumAdmin: !!isForumAdmin,
        inviterNickname: forumUser.nickname || '',
        description: newDescription
      });
      await joinRoom(room.id, forumUser, siteUser, { observeMode: false });
      setCreateOpen(false);
      setSelectedIds(new Set());
      setNewDescription('');
      navigate(`/chat/${room.id}`);
    } catch (e) {
      alert(e.message || 'שגיאה');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateChannel = async () => {
    if (!forumUser?.id || !isForumAdmin) return;
    const trimmed = channelName.trim();
    if (!trimmed) {
      alert(t('chat.channelName'));
      return;
    }
    setCreatingChannel(true);
    try {
      const room = await createChannel(forumUser.id, trimmed, {
        creatorIsForumAdmin: true,
        category: channelCategory,
        description: channelDescription
      });
      setCreateChannelOpen(false);
      setChannelName('');
      setChannelCategory('');
      setChannelDescription('');
      // Optimistically prepend so the new channel shows up immediately even
      // before the next listChannels refresh.
      setChannels((prev) => [
        {
          id: room.id,
          type: 'channel',
          name: room.name,
          description: room.description || '',
          category: room.category || '',
          participantIds: []
        },
        ...prev.filter((r) => r.id !== room.id)
      ]);
      navigate(`/chat/${room.id}`);
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setCreatingChannel(false);
    }
  };

  const channelsByCategory = useMemo(() => {
    const groups = new Map();
    for (const r of channels) {
      const key = (r.category || '').trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      // Empty (uncategorized) goes last.
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b, 'he');
    });
  }, [channels]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center text-zinc-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <ChatSessionExpired
        onReconnected={() => {
          setSessionExpired(false);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  if (loadError) {
    return (
      <ChatSessionExpired
        title={loadError}
        hint={t('chat.loadErrorHint')}
        secondaryLabel={t('chat.retry')}
        onSecondary={() => window.location.reload()}
        onReconnected={() => {
          setLoadError(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <div
      className="container mx-auto px-3 sm:px-4 max-w-3xl py-6 sm:py-10 w-full flex-1 min-h-0 overflow-y-auto overscroll-y-contain lg:flex-1 lg:min-h-0"
      dir="rtl"
    >
      <div className="flex items-start sm:items-center gap-3 mb-6 sm:mb-8">
        <MessageCircle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={32} />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('chat.title')}</h1>
          <p className="text-zinc-500 text-sm mt-1 leading-snug">{t('chat.subtitle')}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Hash size={18} className="text-red-400" aria-hidden="true" />
          {t('chat.mainRoom')}
        </h2>
        <button
          type="button"
          onClick={enterMain}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          {t('chat.enterMain')}
        </button>
      </div>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-bold text-white shrink-0 flex items-center gap-2">
            <Megaphone size={18} className="text-red-400" aria-hidden="true" />
            {t('chat.channels')}
          </h2>
          {isForumAdmin && (
            <button
              type="button"
              onClick={() => setCreateChannelOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold px-4 py-2.5 sm:py-2 rounded-xl touch-manipulation w-full sm:w-auto"
            >
              <Plus size={18} aria-hidden="true" />
              {t('chat.createChannel')}
            </button>
          )}
        </div>
        {channels.length === 0 ? (
          <p className="text-zinc-400 text-sm py-4">{t('chat.channelsEmpty')}</p>
        ) : (
          <div className="space-y-5">
            {channelsByCategory.map(([category, rooms]) => (
              <section key={category || '__none__'} aria-label={category || t('chat.channelUncategorized')}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {category || t('chat.channelUncategorized')}
                </h3>
                <ul className="space-y-2">
                  {rooms.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="w-full text-right rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-4 py-3 text-white transition-colors"
                      >
                        <span className="block font-medium">{r.name || r.id}</span>
                        {r.description && (
                          <span className="block text-zinc-300 text-xs mt-1 leading-snug">{r.description}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-bold text-white shrink-0">{t('chat.privateRooms')}</h2>
        <button
          type="button"
          onClick={() => !atPrivateRoomCreateLimit && setCreateOpen(true)}
          disabled={atPrivateRoomCreateLimit}
          aria-disabled={atPrivateRoomCreateLimit}
          title={atPrivateRoomCreateLimit ? t('chat.privateRoomLimitHint') : undefined}
          className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2.5 sm:py-2 rounded-xl touch-manipulation w-full sm:w-auto"
        >
          <Plus size={18} aria-hidden="true" />
          {t('chat.createRoom')}
        </button>
      </div>

      {myPrivate.length === 0 ? (
        <p className="text-zinc-400 text-sm py-6">{t('chat.noRooms')}</p>
      ) : (
        <ul className="space-y-2">
          {myPrivate.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => openRoom(r.id)}
                className="w-full text-right rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-4 py-3 text-white transition-colors"
              >
                <span className="block font-medium">{r.name || r.id}</span>
                {r.description && (
                  <span className="block text-zinc-300 text-xs mt-1 leading-snug">{r.description}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isForumAdmin && allRooms.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-amber-400 mb-3">{t('chat.allActiveRooms')}</h2>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {allRooms.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => openRoom(r.id)}
                  className="w-full text-right rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <span className="font-bold">
                    {r.type === 'main'
                      ? t('chat.mainRoom')
                      : r.type === 'channel'
                        ? `${r.name || 'ערוץ'} · ${t('chat.channelCreatedBadge')}`
                        : (r.name || 'פרטי')}
                  </span>
                  <span className="text-zinc-400 text-xs ms-2">{r.id}</span>
                  {r.description && (
                    <span className="block text-zinc-400 text-xs mt-0.5 leading-snug">{r.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        labelledBy={createDialogTitleId}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 pb-[env(safe-area-inset-bottom)]"
        panelClassName="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-zinc-700 border-b-0 sm:border-b bg-zinc-950 p-5 sm:p-6 max-h-[min(92dvh,100vh)] overflow-y-auto overscroll-contain touch-pan-y"
      >
        <div dir="rtl">
        <h3 id={createDialogTitleId} className="text-white font-bold text-lg mb-4">{t('chat.createRoom')}</h3>
        <label className="block mb-4">
          <span className="text-zinc-400 text-sm">{t('chat.roomName')}</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          />
        </label>
        <label className="block mb-4">
          <span className="text-zinc-400 text-sm">{t('chat.roomDescription')}</span>
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value.replace(/[\r\n]+/g, ' '))}
            maxLength={200}
            placeholder={t('chat.roomDescriptionPlaceholder')}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          />
        </label>
        <label className="block mb-2">
          <span className="text-zinc-400 text-sm">{t('chat.inviteNicknames')}</span>
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={t('chat.searchUsers')}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            aria-label={t('chat.searchUsers')}
          />
        </label>
        <ul className="max-h-40 overflow-y-auto border border-zinc-800 rounded-lg mb-6 divide-y divide-zinc-800" aria-label={t('chat.inviteNicknames')}>
          {filteredUsers.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => toggleSelect(u.id)}
                aria-pressed={selectedIds.has(u.id)}
                className={`w-full text-right px-3 py-2 text-sm ${selectedIds.has(u.id) ? 'bg-red-900/40 text-white' : 'text-zinc-300 hover:bg-zinc-900'}`}
              >
                {u.nickname}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-zinc-300 hover:text-white touch-manipulation rounded-xl border border-zinc-700 sm:border-0"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 sm:py-2 rounded-xl touch-manipulation"
          >
            {t('chat.createRoom')}
          </button>
        </div>
        </div>
      </Dialog>

      <Dialog
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        labelledBy={createChannelDialogTitleId}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 pb-[env(safe-area-inset-bottom)]"
        panelClassName="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-zinc-700 border-b-0 sm:border-b bg-zinc-950 p-5 sm:p-6 max-h-[min(92dvh,100vh)] overflow-y-auto overscroll-contain touch-pan-y"
      >
        <div dir="rtl">
        <h3 id={createChannelDialogTitleId} className="text-white font-bold text-lg mb-1">
          {t('chat.createChannel')}
        </h3>
        <p className="text-zinc-400 text-xs mb-4 leading-snug">{t('chat.createChannelHint')}</p>
        <label htmlFor={channelNameInputId} className="block mb-4">
          <span className="text-zinc-300 text-sm">{t('chat.channelName')}</span>
          <input
            id={channelNameInputId}
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            maxLength={120}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          />
        </label>
        <label htmlFor={channelCategoryInputId} className="block mb-2">
          <span className="text-zinc-300 text-sm">{t('chat.channelCategory')}</span>
          <input
            id={channelCategoryInputId}
            value={channelCategory}
            onChange={(e) => setChannelCategory(e.target.value.replace(/[\r\n\t]+/g, ' '))}
            maxLength={60}
            placeholder={t('chat.channelCategoryPlaceholder')}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          />
        </label>
        <p className="text-zinc-400 text-xs mb-4 leading-snug">{t('chat.channelCategoryHint')}</p>
        <label htmlFor={channelDescriptionInputId} className="block mb-6">
          <span className="text-zinc-300 text-sm">{t('chat.channelDescription')}</span>
          <input
            id={channelDescriptionInputId}
            value={channelDescription}
            onChange={(e) => setChannelDescription(e.target.value.replace(/[\r\n]+/g, ' '))}
            maxLength={200}
            placeholder={t('chat.channelDescriptionPlaceholder')}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
          />
        </label>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setCreateChannelOpen(false)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-zinc-300 hover:text-white touch-manipulation rounded-xl border border-zinc-700 sm:border-0"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleCreateChannel}
            disabled={creatingChannel || !channelName.trim()}
            aria-disabled={creatingChannel || !channelName.trim()}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-6 py-2.5 sm:py-2 rounded-xl touch-manipulation"
          >
            {t('chat.createChannel')}
          </button>
        </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ChatLobby;
