import { useState, useEffect, useMemo, useCallback } from 'react';
import { getForumUsersByIds } from '../../../firebase/forumUsers';
import {
  joinRoom,
  subscribeRoom,
  subscribeMembers,
  subscribeMessages,
  subscribeLiveChatSettings,
  subscribeTyping,
  subscribeChatMute,
  heartbeatMember,
  buildMemberNicknamesForMentions,
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_HEARTBEAT_HIDDEN_MS
} from '../../../firebase/liveChat';
import { isSupabaseChatBackend } from '../../../chat/backend';
import { hasSupabaseChatAccessToken } from '../../../supabase/client';
import { pickTime } from '../chatRoomUtils';
import { isPrivateRoomInvitedParticipant } from '../../../utils/liveChatPermissions';

/** Recognise PostgREST/Supabase JWT-expired / missing-auth failures so the
 *  caller can swap the raw error message for the reconnect screen. Mirrors
 *  the heuristic used in `ChatLobby` so direct deep links and the lobby
 *  agree on what counts as a stale chat session. */
function looksLikeChatSessionExpired(err) {
  if (!isSupabaseChatBackend()) return false;
  if (!hasSupabaseChatAccessToken()) return true;
  const msg = String(err?.message || '');
  if (/jwt|token|auth|expired|claim|JWS|signature/i.test(msg)) return true;
  if (err?.status === 401) return true;
  if (err?.code === 'PGRST301') return true;
  return false;
}

/**
 * Subscriptions and derived room/message state for a single chat room.
 */
export function useChatRoom(roomId, forumUser, siteUser) {
  const [joinError, setJoinError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Bumped by `reconnect()` after the user re-authenticates from the
  // in-place login modal. forumUser.id is unchanged across a re-auth, so
  // without this the join/subscribe effects below wouldn't re-mount and
  // the view would stay stuck on the "session expired" screen even though
  // the chat JWT is fresh.
  const [reloadKey, setReloadKey] = useState(0);
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [liveMessages, setLiveMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [settings, setSettings] = useState({ retentionDays: 3, globalChatMuted: false });
  const [typingUsers, setTypingUsers] = useState([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [nickMap, setNickMap] = useState({});
  const [forumRoleById, setForumRoleById] = useState({});
  const [cachedMuteDoc, setCachedMuteDoc] = useState(null);
  const [muteSnapshotReady, setMuteSnapshotReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await joinRoom(roomId, forumUser, siteUser, { observeMode: false });
      } catch (e) {
        if (cancelled) return;
        // Surface stale-JWT failures separately so the view can show the
        // reconnect screen instead of a raw "JWT expired" alert. Anything
        // else (room closed, no access, room not found) stays a normal
        // joinError so the back-to-lobby flow keeps working.
        if (looksLikeChatSessionExpired(e)) {
          setSessionExpired(true);
        } else {
          setJoinError(e.message || 'שגיאה');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, forumUser?.id, siteUser?.id, reloadKey]);

  useEffect(() => {
    setOlderMessages([]);
    setHasMoreOlder(true);
    setJoinError(null);
    setSessionExpired(false);
  }, [roomId]);

  // Re-mount realtime subscriptions on reconnect: changing the chat JWT
  // invalidates the cached supabase client (clearSupabaseAccessToken sets
  // supabaseClient = null), so any channels still attached to the old
  // client stop receiving updates. Including reloadKey forces a fresh
  // subscribe() on the new client.
  useEffect(() => {
    return subscribeRoom(roomId, setRoom);
  }, [roomId, reloadKey]);

  useEffect(() => {
    return subscribeLiveChatSettings(setSettings);
  }, [reloadKey]);

  useEffect(() => {
    return subscribeMembers(roomId, setMembers);
  }, [roomId, reloadKey]);

  useEffect(() => {
    return subscribeMessages(roomId, setLiveMessages, 80);
  }, [roomId, reloadKey]);

  const injectOptimisticMessage = useCallback((msg) => {
    if (!msg?.id) return;
    setLiveMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const removeOptimisticMessage = useCallback((messageId) => {
    if (!messageId) return;
    setLiveMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  useEffect(() => {
    return subscribeTyping(roomId, setTypingUsers);
  }, [roomId, reloadKey]);

  useEffect(() => {
    if (!forumUser?.id) {
      setCachedMuteDoc(null);
      setMuteSnapshotReady(false);
      return () => {};
    }
    setMuteSnapshotReady(false);
    return subscribeChatMute(forumUser.id, (doc) => {
      setCachedMuteDoc(doc);
      setMuteSnapshotReady(true);
    });
  }, [forumUser?.id, reloadKey]);

  useEffect(() => {
    const uid = forumUser?.id;
    if (!uid || !roomId) return;

    let visibleTimer = null;
    let hiddenTimer = null;

    const clearTimers = () => {
      if (visibleTimer != null) {
        clearInterval(visibleTimer);
        visibleTimer = null;
      }
      if (hiddenTimer != null) {
        clearInterval(hiddenTimer);
        hiddenTimer = null;
      }
    };

    const ping = () => {
      void heartbeatMember(roomId, uid);
    };

    const arm = () => {
      clearTimers();
      if (typeof document === 'undefined') {
        visibleTimer = setInterval(ping, PRESENCE_HEARTBEAT_VISIBLE_MS);
        return;
      }
      if (document.visibilityState === 'visible') {
        ping();
        visibleTimer = setInterval(ping, PRESENCE_HEARTBEAT_VISIBLE_MS);
      } else if (PRESENCE_HEARTBEAT_HIDDEN_MS > 0) {
        hiddenTimer = setInterval(ping, PRESENCE_HEARTBEAT_HIDDEN_MS);
      }
    };

    const onVisibility = () => arm();
    arm();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      clearTimers();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [roomId, forumUser?.id]);

  const displayMessages = useMemo(() => {
    const map = new Map();
    [...olderMessages, ...liveMessages].forEach((m) => map.set(m.id, m));
    return [...map.values()].sort((a, b) => pickTime(a) - pickTime(b));
  }, [olderMessages, liveMessages]);

  const roleFetchKey = useMemo(() => {
    const s = new Set(members.map((m) => m.id));
    displayMessages.forEach((m) => {
      if (m.authorId && m.authorId !== 'system') s.add(m.authorId);
    });
    if (room?.type === 'private' && Array.isArray(room.participantIds)) {
      room.participantIds.forEach((id) => {
        if (id) s.add(id);
      });
    }
    return [...s].sort().join(',');
  }, [members, displayMessages, room?.type, room?.participantIds]);

  useEffect(() => {
    if (!roleFetchKey) return;
    let cancelled = false;
    (async () => {
      const ids = roleFetchKey.split(',').filter(Boolean);
      if (ids.length === 0) return;
      const map = await getForumUsersByIds(ids);
      if (cancelled) return;
      const n = {};
      const r = {};
      Object.values(map).forEach((u) => {
        if (!u?.id) return;
        if (u.nickname) n[u.id] = u.nickname;
        r[u.id] = u.role || 'user';
      });
      setNickMap((prev) => ({ ...prev, ...n }));
      setForumRoleById((prev) => ({ ...prev, ...r }));
    })();
    return () => {
      cancelled = true;
    };
  }, [roleFetchKey]);

  const memberNicknamesForMentions = useMemo(() => {
    const rosterMembers =
      room?.type === 'private'
        ? members.filter((m) => m?.id && isPrivateRoomInvitedParticipant(room, m.id))
        : members;
    return buildMemberNicknamesForMentions(rosterMembers, nickMap);
  }, [members, nickMap, room]);

  // Called by <ChatSessionExpired> after the user re-authenticates inline.
  // Clears the expired flag and bumps the reload key so every dependent
  // effect (joinRoom + subscribeRoom/Members/Messages/Typing/Mute) fires
  // again on the freshly issued chat JWT.
  const reconnect = useCallback(() => {
    setJoinError(null);
    setSessionExpired(false);
    setOlderMessages([]);
    setHasMoreOlder(true);
    setReloadKey((k) => k + 1);
  }, []);

  return {
    joinError,
    setJoinError,
    sessionExpired,
    reconnect,
    room,
    members,
    liveMessages,
    injectOptimisticMessage,
    removeOptimisticMessage,
    olderMessages,
    setOlderMessages,
    settings,
    typingUsers,
    displayMessages,
    nickMap,
    forumRoleById,
    hasMoreOlder,
    setHasMoreOlder,
    loadingOlder,
    setLoadingOlder,
    memberNicknamesForMentions,
    cachedMuteDoc,
    muteSnapshotReady
  };
}
