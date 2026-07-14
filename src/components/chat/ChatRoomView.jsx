import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate as useTanstackNavigate, useSearch } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowRight,
  Send,
  Volume2,
  VolumeX,
  Pin,
  Eye,
  EyeOff,
  Users,
  Loader,
  Bell,
  Smile,
  ExternalLink,
  Settings,
  LogOut
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { normalizeOutgoingChatText } from '../../firebase/liveChat/helpers.js';
import { isSupabaseChatBackend } from '../../chat/backend';
import { useForumAuth } from '../../context/ForumAuthContext';
import { useSiteAuth } from '../../context/AuthContext';
import {
  sendTypingPulse,
  clearTyping,
  leaveRoom,
  sendChatMessage,
  loadOlderMessages,
  pinMessage,
  updateObserveMode,
  sendSystemLine,
  updateMemberLastRead,
  submitChatMessageReport,
  listPrivateRoomsWhereCanInvite,
  inviteForumUsersToPrivateRoom,
  removeParticipantFromPrivateRoom,
  PRESENCE_ONLINE_THRESHOLD_MS
} from '../../firebase/liveChat';
import {
  canGlobalModerate,
  isRoomStaff as userIsRoomStaff,
  canPostInRoom,
  isPrivateRoomInvitedParticipant
} from '../../utils/liveChatPermissions';

import {
  chatDraftKey,
  getDesktopNotifEnabled,
  setDesktopNotifEnabled
} from '../../utils/chatClient';
import { useChatRoom } from './hooks/useChatRoom';
import { useVisibleChatReactions } from './hooks/useVisibleChatReactions';
import { MessageBubble } from './MessageBubble';
import { MemberRow } from './MemberRow';
import { ModPanel } from './ModPanel';
import { ChannelSettingsDrawer } from './ChannelSettingsDrawer';
import { MobileMembersDrawer } from './MobileMembersDrawer';
import { ThreadDrawer } from './ThreadDrawer';
import ChatSessionExpired from './ChatSessionExpired';
import { EMOJI_INSERT_GRID } from './chatRoomConstants';
import {
  collectThreadMessageIds,
  memberLastSeenAtMs,
  pickTime,
  readSendOnEnterPreference,
  CHAT_SEND_ON_ENTER_KEY
} from './chatRoomUtils';

const ChatRoomView = ({ roomId, navigate }) => {
  const { t } = useLanguage();
  const searchParamsObj = useSearch({ strict: false });
  const tanstackNavigate = useTanstackNavigate();
  const { forumUser, isForumAdmin } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const {
    joinError,
    sessionExpired,
    reconnect,
    room,
    members,
    liveMessages,
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
    muteSnapshotReady,
    injectOptimisticMessage,
    removeOptimisticMessage
  } = useChatRoom(roomId, forumUser, siteUser);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sendError, setSendError] = useState('');
  const [soundOn, setSoundOn] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem('chat_sound') !== '0');
  const [highlightId, setHighlightId] = useState(null);
  const [threadFor, setThreadFor] = useState(null);
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  /** messageId → 'sending' | 'sent' for optimistic outgoing rows */
  const [outgoingDelivery, setOutgoingDelivery] = useState({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [desktopNotifOn, setDesktopNotifOn] = useState(
    () => typeof localStorage !== 'undefined' && getDesktopNotifEnabled()
  );
  const [sendOnEnter, setSendOnEnter] = useState(() =>
    typeof localStorage !== 'undefined' ? readSendOnEnterPreference() : true
  );
  const [invitePrivateContexts, setInvitePrivateContexts] = useState([]);
  const [presenceTick, setPresenceTick] = useState(0);
  /** @-mention autocomplete: { open, query, anchor, hi } | null.
   *  Populated entirely from in-room members (`memberNicknamesForMentions`),
   *  so opening the picker never hits the DB. */
  const [mentionPicker, setMentionPicker] = useState(null);
  const parentRef = useRef(null);
  const composerRef = useRef(null);
  const sendingMessageRef = useRef(false);
  const prevLenRef = useRef(0);
  const deepLinkDoneRef = useRef(null);
  const lastReadThrottleRef = useRef(0);
  const audioCtxRef = useRef(null);
  const presenceBaselineRef = useRef(new Map());
  const presencePrimedRef = useRef(false);
  const presenceNotifyThrottleRef = useRef(new Map());

  useEffect(() => {
    presenceBaselineRef.current = new Map();
    presencePrimedRef.current = false;
    presenceNotifyThrottleRef.current = new Map();
  }, [roomId]);

  const memberSelf = useMemo(
    () => members.find((m) => m.id === forumUser?.id),
    [members, forumUser?.id]
  );

  const canMod = room && userIsRoomStaff(room, forumUser, siteUser, memberSelf);
  const globalMod = canGlobalModerate(siteUser, forumUser);

  const canUseChatInteractions =
    !!memberSelf &&
    !!room &&
    !!forumUser &&
    !memberSelf.observeMode &&
    canPostInRoom(room, forumUser, siteUser, memberSelf);

  useEffect(() => {
    prevLenRef.current = 0;
    deepLinkDoneRef.current = null;
    setChannelSettingsOpen(false);
    setMobileMembersOpen(false);
    setOutgoingDelivery({});
  }, [roomId]);

  useEffect(() => {
    if (!mobileMembersOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMembersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMembersOpen]);

  useEffect(() => {
    if (room?.type !== 'private') return;
    const id = setInterval(() => setPresenceTick((n) => n + 1), 12000);
    return () => clearInterval(id);
  }, [room?.type]);

  // When the room closes (mod action, creator close, etc.) bounce everyone
  // who's currently inside back to the lobby. The room view will otherwise
  // sit on a "room closed" banner with the composer disabled, which is
  // confusing — the lobby filters closed rooms out of the listings, so
  // navigating away matches the user's mental model that "closed rooms
  // don't exist anymore".
  useEffect(() => {
    if (room?.closedAt) navigate('/chat');
  }, [room?.closedAt, navigate]);

  useEffect(() => {
    if (!forumUser?.id) {
      setInvitePrivateContexts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listPrivateRoomsWhereCanInvite(forumUser);
        // Exclude the current room — inviting someone to the room they're
        // already viewing (or that the viewer is already in) is a no-op.
        const filtered = roomId ? list.filter((ctx) => ctx?.roomId !== roomId) : list;
        if (!cancelled) setInvitePrivateContexts(filtered);
      } catch {
        if (!cancelled) setInvitePrivateContexts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [room?.type, forumUser?.id, forumUser?.role, roomId]);

  const handleInviteMemberToPrivate = useCallback(
    async (targetUserId, targetLabel, ctx) => {
      if (!forumUser?.id || targetUserId === forumUser.id || !ctx?.roomId) return;
      const roomName = (ctx.room?.name || t('chat.privateRooms')).slice(0, 80);
      const confirmText = t('chat.inviteConfirmPrivate')
        .replace('NAME', String(targetLabel).slice(0, 60))
        .replace('ROOMNAME', roomName);
      if (!window.confirm(confirmText)) return;
      try {
        await inviteForumUsersToPrivateRoom(ctx.roomId, [targetUserId], forumUser, ctx.memberSelf, ctx.room);
        alert(t('chat.inviteSentFromMain'));
      } catch (e) {
        const msg = e?.message || '';
        if (msg.includes('כבר משתתפים')) {
          alert(t('chat.inviteAlreadyInPrivate'));
        } else {
          alert(msg || t('error'));
        }
      }
    },
    [forumUser, t]
  );

  const rowVirtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 12,
    gap: 4,
    getItemKey: (index) => displayMessages[index]?.id ?? index,
    shouldAdjustScrollPositionOnItemSizeChange: (_item, _delta, instance) => {
      const el = instance.scrollElement;
      if (!el) return true;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      return distanceFromBottom < 120;
    }
  });

  const getVisibleMessageIdsRef = useRef(() => []);
  getVisibleMessageIdsRef.current = () =>
    rowVirtualizer.getVirtualItems().map((vi) => displayMessages[vi.index]?.id).filter(Boolean);

  const reactionListEpoch = `${displayMessages.length}:${liveMessages.length}`;
  const reactionsByMessageId = useVisibleChatReactions(
    roomId,
    parentRef,
    getVisibleMessageIdsRef,
    reactionListEpoch
  );

  const threadMessages = useMemo(() => {
    if (!threadFor?.id) return [];
    const ids = collectThreadMessageIds(displayMessages, threadFor.id);
    return displayMessages
      .filter((m) => ids.has(m.id))
      .sort((a, b) => pickTime(a) - pickTime(b));
  }, [displayMessages, threadFor]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatDraftKey(roomId));
      if (raw) setInput(raw);
      else setInput('');
    } catch {
      setInput('');
    }
    setMentionPicker(null);
  }, [roomId]);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (input) localStorage.setItem(chatDraftKey(roomId), input);
        else localStorage.removeItem(chatDraftKey(roomId));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [input, roomId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!room?.id) return undefined;
    const prevTitle = document.title;
    const roomLabel =
      room.type === 'main' ? t('chat.mainRoom') : String(room.name || '').trim() || room.id || '';
    document.title = `${roomLabel} · ${t('chat.title')}`;
    return () => {
      document.title = prevTitle;
    };
  }, [room?.id, room?.type, room?.name, t]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onDoc = (e) => {
      if (e.target.closest?.('[data-chat-emoji-root]')) return;
      setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [emojiOpen]);

  useEffect(() => {
    if (displayMessages.length > prevLenRef.current && prevLenRef.current > 0 && soundOn) {
      const last = displayMessages[displayMessages.length - 1];
      if (last && last.authorId !== forumUser?.id && !last.isSystem) {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
          const ctx = audioCtxRef.current;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = 880;
          g.gain.value = 0.04;
          o.start();
          o.stop(ctx.currentTime + 0.06);
        } catch { /* ignore */ }
      }
    }
    if (
      displayMessages.length > prevLenRef.current &&
      prevLenRef.current > 0
    ) {
      const last = displayMessages[displayMessages.length - 1];
      if (
        last &&
        last.authorId !== forumUser?.id &&
        !last.isSystem &&
        typeof document !== 'undefined' &&
        document.hidden &&
        getDesktopNotifEnabled() &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(room?.type === 'main' ? t('chat.mainRoom') : room?.name || t('chat.title'), {
            body: `${last.authorNickname || ''}: ${(last.text || '').slice(0, 120)}`,
            tag: `chat-${roomId}-${last.id}`,
            silent: true
          });
        } catch { /* ignore */ }
      }
    }
    prevLenRef.current = displayMessages.length;
  }, [displayMessages, forumUser?.id, soundOn, room?.type, room?.name, roomId, t]);

  useEffect(() => {
    const viewerId = forumUser?.id;
    if (!viewerId || !room?.id) return;

    const now = Date.now();
    const onlineMs = PRESENCE_ONLINE_THRESHOLD_MS;
    function isOnline(doc) {
      const ms = memberLastSeenAtMs(doc?.lastSeenAt);
      return ms > 0 && now - ms < onlineMs;
    }

    const eligibleMembers = members.filter((m) => {
      if (!m?.id || m.id === viewerId) return false;
      if (room.type === 'private' && !isPrivateRoomInvitedParticipant(room, m.id)) return false;
      return true;
    });

    const currentIds = new Set(eligibleMembers.map((m) => m.id));
    const baseline = presenceBaselineRef.current;
    const throttleMap = presenceNotifyThrottleRef.current;
    for (const id of [...baseline.keys()]) {
      if (!currentIds.has(id)) {
        baseline.delete(id);
        throttleMap.delete(id);
      }
    }

    const throttleMs = 90_000;
    const notifyLabel = (uid) =>
      String(nickMap[uid] || uid || '').trim().slice(0, 60) || uid;

    const fireNotify = (uid) => {
      const lastFire = throttleMap.get(uid) || 0;
      if (now - lastFire < throttleMs) return;
      throttleMap.set(uid, now);

      if (soundOn) {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
          const ctx = audioCtxRef.current;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = 523.25;
          g.gain.value = 0.028;
          o.start();
          o.stop(ctx.currentTime + 0.05);
        } catch {
          /* ignore */
        }
      }

      const label = notifyLabel(uid);
      const body = t('chat.notifyUserOnline').replace('{name}', label);
      if (
        typeof document !== 'undefined' &&
        document.hidden &&
        getDesktopNotifEnabled() &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(room.type === 'main' ? t('chat.mainRoom') : room?.name || t('chat.title'), {
            body,
            tag: `chat-presence-${roomId}-${uid}-${Math.floor(now / throttleMs)}`,
            silent: true
          });
        } catch {
          /* ignore */
        }
      }
    };

    if (!presencePrimedRef.current) {
      if (members.length === 0) return;
      for (const m of eligibleMembers) {
        baseline.set(m.id, isOnline(m));
      }
      presencePrimedRef.current = true;
      return;
    }

    for (const m of eligibleMembers) {
      const cur = isOnline(m);
      const had = baseline.has(m.id);
      const prevKnown = had ? baseline.get(m.id) : undefined;

      if (!had) {
        baseline.set(m.id, cur);
        if (cur) fireNotify(m.id);
        continue;
      }

      baseline.set(m.id, cur);
      if (cur && prevKnown === false) {
        fireNotify(m.id);
      }
    }
  }, [
    members,
    room,
    roomId,
    forumUser?.id,
    presenceTick,
    soundOn,
    nickMap,
    t
  ]);

  useEffect(() => {
    if (!displayMessages.length) return;
    if (searchParamsObj?.m) return;
    let cancelled = false;
    // estimateSize is intentionally generous (200) so the virtualizer
    // doesn't under-allocate before measuring; the side effect is that
    // on first paint scrollToIndex(last, 'end') lands mid-list because
    // the estimated total height is much larger than the eventual real
    // height. We belt-and-suspenders by also pinning scrollTop to the
    // physical bottom, and we re-run the pin a couple of times after
    // mount so we still land at the bottom once rows measure for real.
    const scrollToBottom = () => {
      if (cancelled) return;
      const lastIndex = displayMessages.length - 1;
      if (lastIndex >= 0) {
        rowVirtualizer.scrollToIndex(lastIndex, { align: 'end' });
      }
      const el = parentRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
    const t1 = setTimeout(scrollToBottom, 60);
    const t2 = setTimeout(scrollToBottom, 240);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Note: `displayMessages.length` deliberately omitted from deps —
    // re-firing on "load older" would yank the scroll back to bottom
    // and undo the very action the user just initiated.
  }, [liveMessages.length, roomId, searchParamsObj, rowVirtualizer]);

  const targetMid = searchParamsObj?.m;
  useEffect(() => {
    if (!targetMid) return;
    if (!displayMessages.length) return;
    const idx = displayMessages.findIndex((m) => m.id === targetMid);
    if (idx < 0) return;
    const token = `${roomId}:${targetMid}`;
    if (deepLinkDoneRef.current === token) return;
    deepLinkDoneRef.current = token;
    setHighlightId(targetMid);
    requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(idx, { align: 'center' });
    });
    const clearHl = setTimeout(() => setHighlightId(null), 2800);
    tanstackNavigate({
      search: (prev) => {
        const { m, ...rest } = prev || {};
        return rest;
      },
      replace: true,
    });
    return () => clearTimeout(clearHl);
  }, [targetMid, displayMessages, roomId, rowVirtualizer, tanstackNavigate]);

  const handleChatScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || !forumUser?.id || !displayMessages.length) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (!atBottom) return;
    const now = Date.now();
    if (now - lastReadThrottleRef.current < 2500) return;
    lastReadThrottleRef.current = now;
    const last = displayMessages[displayMessages.length - 1];
    if (last?.id) {
      updateMemberLastRead(roomId, forumUser.id, last.id).catch(() => {});
    }
  }, [displayMessages, forumUser?.id, roomId]);

  const handleReport = useCallback(
    async (msg) => {
      if (!forumUser?.id) return;
      const reason = window.prompt(t('chat.reportReason'), '');
      if (reason == null || !String(reason).trim()) return;
      try {
        await submitChatMessageReport({
          roomId,
          messageId: msg.id,
          reporterId: forumUser.id,
          reporterNickname: forumUser.nickname,
          reason: String(reason).trim()
        });
        alert(t('chat.reportThanks'));
      } catch (e) {
        alert(e.message || 'שגיאה');
      }
    },
    [forumUser, roomId, t]
  );

  const toggleDesktopNotif = async () => {
    if (!desktopNotifOn) {
      if (typeof Notification === 'undefined') {
        alert(t('chat.desktopNotifUnsupported'));
        return;
      }
      const p = Notification.permission;
      if (p === 'default') {
        const r = await Notification.requestPermission();
        if (r !== 'granted') return;
      } else if (p === 'denied') {
        alert(t('chat.desktopNotifBlocked'));
        return;
      }
      setDesktopNotifEnabled(true);
      setDesktopNotifOn(true);
    } else {
      setDesktopNotifEnabled(false);
      setDesktopNotifOn(false);
    }
  };

  const replySnippet = useCallback(
    (mid) => {
      const m = displayMessages.find((x) => x.id === mid);
      return m ? (m.text || '').slice(0, 80) : '';
    },
    [displayMessages]
  );

  const visibleMembers = useMemo(() => {
    const viewerStaff = globalMod || isForumAdmin;
    return members.filter((m) => {
      if (viewerStaff) return true;
      if (m.id === forumUser?.id) return true;
      return !m.observeMode;
    });
  }, [members, globalMod, isForumAdmin, forumUser?.id]);

  /** Private rooms: everyone in participantIds ∪ members, with presence and invited-only rows. */
  const privateMemberRows = useMemo(() => {
    if (room?.type !== 'private') return null;
    const ids = new Set([...(room.participantIds || [])]);
    members.forEach((x) => ids.add(x.id));
    const now = Date.now();
    const rows = [...ids]
      .map((id) => {
        const m = members.find((x) => x.id === id);
        // Hide forum admins who opened the room without being on participantIds (except their own client).
        if (!isPrivateRoomInvitedParticipant(room, id) && id !== forumUser?.id) return null;
        // Invited members always appear (incl. forum admins on the invite list), even in observe mode.
        const lastMs = memberLastSeenAtMs(m?.lastSeenAt);
        const presenceOnline = lastMs > 0 && now - lastMs < PRESENCE_ONLINE_THRESHOLD_MS;
        const inParticipants = (room.participantIds || []).includes(id);
        const invitedOnly = inParticipants && !m;
        const rowMember =
          m ||
          ({
            id,
            role: 'member',
            observeMode: false,
            roomTitle: '',
            joinedAt: null,
            lastSeenAt: null,
            hasVoice: false
          });
        return { id, m: rowMember, presenceOnline, invitedOnly };
      })
      .filter(Boolean);
    rows.sort((a, b) =>
      String(nickMap[a.id] || a.id).localeCompare(String(nickMap[b.id] || b.id), 'he', { sensitivity: 'base' })
    );
    return rows;
  }, [room, members, forumUser?.id, nickMap, presenceTick]);

  const rosterForSidebar = useMemo(() => {
    if (room?.type === 'private' && privateMemberRows) {
      return privateMemberRows.map((row) => ({
        ...row,
        canRemoveThisUser:
          canMod &&
          row.id !== forumUser?.id &&
          !(
            row.id === room?.createdByForumUserId &&
            !canGlobalModerate(siteUser, forumUser)
          )
      }));
    }
    return visibleMembers.map((m) => ({
      id: m.id,
      m,
      presenceOnline: undefined,
      invitedOnly: false,
      canRemoveThisUser: false
    }));
  }, [
    room,
    privateMemberRows,
    visibleMembers,
    canMod,
    forumUser?.id,
    siteUser,
    forumUser
  ]);

  const handleRemoveParticipantFromPrivate = useCallback(
    async (targetId) => {
      if (!window.confirm(t('chat.removeFromRoomConfirm'))) return;
      try {
        await removeParticipantFromPrivateRoom(
          roomId,
          targetId,
          forumUser,
          siteUser,
          memberSelf,
          room
        );
      } catch (e) {
        alert(e.message || t('error'));
      }
    },
    [roomId, forumUser, siteUser, memberSelf, room, t]
  );

  const roomAdminById = useMemo(() => {
    if (!room) return {};
    const out = {};
    const creatorId = room.createdByForumUserId;
    for (const mem of members) {
      if (!mem?.id) continue;
      if (mem.role === 'roomAdmin' || mem.id === creatorId) out[mem.id] = true;
    }
    if (creatorId) out[creatorId] = true;
    return out;
  }, [members, room?.createdByForumUserId]);

  const memberRoomTitleById = useMemo(() => {
    const out = {};
    for (const mem of members) {
      if (mem?.id && mem.roomTitle) out[mem.id] = mem.roomTitle;
    }
    return out;
  }, [members]);

  const memberRowSharedProps = useMemo(
    () => ({
      forumUser,
      siteUser,
      room,
      memberSelf,
      roomId,
      canMod,
      globalMod,
      forumRoleById,
      roomAdminById,
      t,
      invitePrivateContexts,
      onInviteToPrivateRoom: handleInviteMemberToPrivate
    }),
    [
      forumUser,
      siteUser,
      room,
      memberSelf,
      roomId,
      canMod,
      globalMod,
      forumRoleById,
      roomAdminById,
      t,
      invitePrivateContexts,
      handleInviteMemberToPrivate
    ]
  );

  const composerBlocked =
    !memberSelf ||
    !room ||
    room.closedAt ||
    memberSelf.observeMode ||
    (room.type === 'main' && settings.globalChatMuted && !globalMod) ||
    !canPostInRoom(room, forumUser, siteUser, memberSelf);

  const submitComposerMessage = useCallback(async () => {
    if (composerBlocked || sendingMessageRef.current) return;
    const text = input.trim();
    if (!text || !forumUser?.id) return;
    if (memberSelf?.observeMode) return;
    const replySnapshot = replyTo;
    const replyId = replySnapshot?.id || null;
    let optimisticId = null;
    sendingMessageRef.current = true;
    setInput('');
    setMentionPicker(null);
    setReplyTo(null);
    setSendError('');
    try {
      const sendOpts = {
        replyToMessageId: replyId,
        cachedLiveChatSettings: {
          retentionDays: settings.retentionDays,
          globalChatMuted: settings.globalChatMuted === true
        }
      };
      if (memberNicknamesForMentions.length > 0) {
        sendOpts.memberNicknamesForMentions = memberNicknamesForMentions;
      }
      if (muteSnapshotReady) {
        sendOpts.cachedMuteDoc = cachedMuteDoc;
      }

      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        const { displayText: outgoingBody, isAction } = normalizeOutgoingChatText(text);
        optimisticId = isSupabaseChatBackend()
          ? crypto.randomUUID()
          : crypto.randomUUID().replace(/-/g, '').slice(0, 72);
        sendOpts.preassignedMessageId = optimisticId;
        injectOptimisticMessage({
          id: optimisticId,
          authorId: forumUser.id,
          authorNickname: String(forumUser.nickname || '').slice(0, 40),
          text: outgoingBody,
          createdAt: new Date(),
          deleted: false,
          deletedBy: null,
          deletedAt: null,
          replyToMessageId: replyId,
          isSystem: false,
          isAction,
          expireAt: null
        });
        setOutgoingDelivery((prev) => ({ ...prev, [optimisticId]: 'sending' }));
      }

      await sendChatMessage(roomId, forumUser, siteUser, text, sendOpts);
      await clearTyping(roomId, forumUser.id);
      if (optimisticId) {
        setOutgoingDelivery((prev) => ({ ...prev, [optimisticId]: 'sent' }));
        window.setTimeout(() => {
          setOutgoingDelivery((prev) => {
            const next = { ...prev };
            delete next[optimisticId];
            return next;
          });
        }, 4000);
      }
    } catch (err) {
      if (optimisticId) {
        removeOptimisticMessage(optimisticId);
        setOutgoingDelivery((prev) => {
          const next = { ...prev };
          delete next[optimisticId];
          return next;
        });
      }
      setInput(text);
      if (replySnapshot) setReplyTo(replySnapshot);
      setSendError(err.message || 'שגיאה בשליחת ההודעה');
    } finally {
      sendingMessageRef.current = false;
    }
  }, [
    composerBlocked,
    input,
    forumUser,
    memberSelf,
    roomId,
    replyTo,
    room,
    siteUser,
    settings.retentionDays,
    settings.globalChatMuted,
    memberNicknamesForMentions,
    muteSnapshotReady,
    cachedMuteDoc,
    injectOptimisticMessage,
    removeOptimisticMessage
  ]);

  const handleSend = async (e) => {
    e.preventDefault();
    await submitComposerMessage();
  };

  const toggleSendOnEnter = (checked) => {
    setSendOnEnter(checked);
    try {
      localStorage.setItem(CHAT_SEND_ON_ENTER_KEY, checked ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const handleLoadOlder = async () => {
    if (!displayMessages.length || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldest = displayMessages[0];
      const batch = await loadOlderMessages(roomId, oldest, 40);
      if (batch.length < 40) setHasMoreOlder(false);
      setOlderMessages((prev) => [...batch, ...prev]);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleLeave = async () => {
    await leaveRoom(roomId, forumUser.id);
    navigate('/chat');
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem('chat_sound', next ? '1' : '0');
    } catch { /* ignore */ }
  };

  const toggleObserve = async (nextObserve) => {
    if (!isForumAdmin) return;
    try {
      await updateObserveMode(roomId, forumUser.id, nextObserve, true);
      if (!nextObserve) {
        await sendSystemLine(roomId, `${forumUser.nickname || 'משתמש'} נכנס/ה לחדר`);
      }
    } catch (e) {
      alert(e.message || 'שגיאה');
    }
  };

  const composerPlaceholder = (() => {
    if (!composerBlocked) return t('chat.placeholder');
    if (memberSelf?.observeMode) return t('chat.observeHint');
    if (room?.type === 'main' && settings.globalChatMuted && !globalMod) return t('chat.globalMuted');
    if (
      room &&
      forumUser &&
      memberSelf &&
      room.adminsOnlyMode &&
      !canPostInRoom(room, forumUser, siteUser, memberSelf)
    ) {
      return t('chat.adminsOnlyHint');
    }
    return '…';
  })();

  /** Candidates for the @-mention picker — purely client-side filter over
   *  the in-room member roster (memberNicknamesForMentions is built from
   *  `members` + `nickMap` in useChatRoom, no fetch). */
  const mentionCandidates = useMemo(() => {
    if (!mentionPicker?.open) return [];
    const q = String(mentionPicker.query || '').toLowerCase();
    return memberNicknamesForMentions
      .filter((m) => m?.id && m.nickname && m.id !== forumUser?.id)
      .filter((m) => !q || m.nickname.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionPicker, memberNicknamesForMentions, forumUser?.id]);

  /** Scan the textarea backwards from the caret looking for `@<token>` with
   *  no whitespace in between. Returns null if not currently typing a
   *  mention (e.g. after a space, or no `@` at all). */
  const detectMentionAtCaret = useCallback((value, caret) => {
    if (typeof caret !== 'number' || caret <= 0) return null;
    let i = caret - 1;
    while (i >= 0) {
      const ch = value[i];
      if (ch === '@') {
        // Allow @ at start or after whitespace (avoid email-style addresses).
        const prev = i > 0 ? value[i - 1] : '';
        if (prev && !/\s/.test(prev)) return null;
        return { anchor: i, query: value.slice(i + 1, caret) };
      }
      if (/\s/.test(ch)) return null;
      i -= 1;
    }
    return null;
  }, []);

  const refreshMentionFromCaret = useCallback(
    (value, caret) => {
      const found = detectMentionAtCaret(value, caret);
      if (!found) {
        setMentionPicker(null);
        return;
      }
      setMentionPicker((prev) => ({
        open: true,
        query: found.query,
        anchor: found.anchor,
        // reset highlight when query changes; preserve when it doesn't
        hi: prev && prev.query === found.query && prev.anchor === found.anchor ? prev.hi : 0
      }));
    },
    [detectMentionAtCaret]
  );

  const applyMentionSelection = useCallback(
    (member) => {
      if (!member?.nickname || !mentionPicker?.open) return;
      const ta = composerRef.current;
      const caret = ta ? ta.selectionStart : input.length;
      const before = input.slice(0, mentionPicker.anchor);
      const after = input.slice(caret);
      const insert = `@${member.nickname} `;
      const next = `${before}${insert}${after}`;
      setInput(next);
      setMentionPicker(null);
      // Restore caret right after the inserted nickname (next tick — wait
      // for React to flush the value before we touch the DOM selection).
      requestAnimationFrame(() => {
        const newCaret = before.length + insert.length;
        if (composerRef.current) {
          composerRef.current.focus();
          composerRef.current.setSelectionRange(newCaret, newCaret);
        }
      });
    },
    [input, mentionPicker]
  );

  const handleComposerKeyDown = useCallback(
    (e) => {
      // Mention-picker keyboard nav takes precedence over send-on-enter.
      if (mentionPicker?.open && mentionCandidates.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionPicker((p) => (p ? { ...p, hi: (p.hi + 1) % mentionCandidates.length } : p));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionPicker((p) =>
            p ? { ...p, hi: (p.hi - 1 + mentionCandidates.length) % mentionCandidates.length } : p
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          applyMentionSelection(mentionCandidates[mentionPicker.hi] || mentionCandidates[0]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionPicker(null);
          return;
        }
      }
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (e.nativeEvent.isComposing) return;
      if (!sendOnEnter || composerBlocked) return;
      e.preventDefault();
      void submitComposerMessage();
    },
    [sendOnEnter, composerBlocked, submitComposerMessage, mentionPicker, mentionCandidates, applyMentionSelection]
  );

  if (sessionExpired) {
    // Stale Supabase chat JWT — let the user re-auth in place via the
    // forum login modal instead of forcing a manual logout/login cycle.
    return (
      <ChatSessionExpired
        secondaryLabel={t('chat.backLobby')}
        onSecondary={() => navigate('/chat')}
        onReconnected={reconnect}
      />
    );
  }

  if (joinError) {
    return (
      <div
        className="flex flex-1 min-h-0 flex-col items-center justify-center container mx-auto px-4 py-8 text-center"
        dir="rtl"
      >
        <p className="text-red-300 mb-6" role="alert">{joinError}</p>
        <button type="button" onClick={() => navigate('/chat')} className="text-red-500 font-bold underline">
          {t('chat.backLobby')}
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center text-zinc-500">
        <Loader className="animate-spin" />
      </div>
    );
  }

  const pinned = room.pinnedMessageId
    ? displayMessages.find((m) => m.id === room.pinnedMessageId)
    : null;

  const privateRoomStaff = room.type === 'private' && canMod;
  const showModPanelInSidebar = canMod && room.type === 'main';

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden" dir="rtl">
      <div className="sticky top-0 z-10 shrink-0 border-b border-zinc-800 bg-zinc-950 px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2">
        <div className="flex min-w-0 flex-nowrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            aria-label={t('chat.backLobby')}
            className="-my-0.5 inline-flex min-h-[40px] min-w-[40px] shrink-0 touch-manipulation items-center justify-center gap-1 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:min-h-0 sm:min-w-0 sm:py-1"
          >
            <ArrowRight size={17} className="sm:h-[18px] sm:w-[18px]" />
            <span className="hidden sm:inline">{t('chat.backLobby')}</span>
          </button>
          <div className="relative flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 sm:justify-start sm:gap-1.5">
            <div className="flex min-w-0 w-full max-w-full flex-1 flex-nowrap items-center justify-center gap-1 sm:justify-start">
              <h1 className="min-w-0 flex-1 truncate whitespace-nowrap text-center text-sm font-bold leading-tight text-zinc-100 sm:flex-initial sm:text-start sm:text-base lg:max-w-full lg:text-lg">
                {room.type === 'main' ? t('chat.mainRoom') : (room.name || room.id)}
              </h1>
              <button
                type="button"
                className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-800/90 bg-zinc-900/50 px-1 py-0.5 text-[10px] font-semibold text-zinc-400 touch-manipulation hover:bg-zinc-900 hover:text-zinc-200 lg:hidden"
                onClick={() => setMobileMembersOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={mobileMembersOpen}
                aria-label={`${t('chat.members')} (${rosterForSidebar.length})`}
              >
                <Users size={12} className="shrink-0 opacity-80" aria-hidden />
                <span>{rosterForSidebar.length}</span>
              </button>
              {isForumAdmin && memberSelf && (
                <button
                  type="button"
                  onClick={() => void toggleObserve(!memberSelf.observeMode)}
                  title={memberSelf.observeMode ? t('chat.enterVisible') : t('chat.observe')}
                  aria-label={memberSelf.observeMode ? t('chat.enterVisible') : t('chat.observe')}
                  className={`-my-0.5 inline-flex min-h-[40px] min-w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-lg p-1.5 hover:bg-zinc-900 sm:min-h-0 sm:min-w-0 sm:p-1 ${
                    memberSelf.observeMode
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {memberSelf.observeMode ? <Eye size={17} aria-hidden /> : <EyeOff size={17} aria-hidden />}
                </button>
              )}
              {room.adminsOnlyMode && (
                <span className="shrink-0 rounded border border-amber-700/80 bg-amber-950/50 px-1 py-0.5 text-[9px] font-bold leading-none text-amber-200 sm:text-[10px]">
                  {t('chat.adminsOnlyBadge')}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-0 sm:gap-0.5 lg:gap-1">
            <button
              type="button"
              onClick={toggleSound}
              className="flex min-h-[40px] min-w-[40px] touch-manipulation items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white sm:min-h-0 sm:min-w-0 sm:p-2"
              aria-label={soundOn ? t('chat.soundOff') : t('chat.soundOn')}
              aria-pressed={soundOn}
              title={soundOn ? t('chat.soundOff') : t('chat.soundOn')}
            >
              {soundOn ? <Volume2 size={17} className="sm:h-[18px] sm:w-[18px]" aria-hidden="true" /> : <VolumeX size={17} className="sm:h-[18px] sm:w-[18px]" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={toggleDesktopNotif}
              className={`flex min-h-[40px] min-w-[40px] touch-manipulation items-center justify-center rounded-lg p-2 sm:min-h-0 sm:min-w-0 sm:p-2 ${
                desktopNotifOn ? 'text-amber-400' : 'text-zinc-400'
              } hover:bg-zinc-900 hover:text-white`}
              aria-label={desktopNotifOn ? t('chat.desktopNotifOff') : t('chat.desktopNotifOn')}
              aria-pressed={desktopNotifOn}
              title={
                desktopNotifOn ? t('chat.desktopNotifOff') : t('chat.desktopNotifOn')
              }
            >
              <Bell size={17} className="sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            </button>
            {privateRoomStaff && (
              <button
                type="button"
                onClick={() => setChannelSettingsOpen(true)}
                className="flex min-h-[40px] min-w-[40px] touch-manipulation items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white sm:min-h-0 sm:min-w-0 sm:p-2"
                title={t('chat.channelSettings')}
                aria-label={t('chat.channelSettings')}
              >
                <Settings size={17} className="sm:h-[18px] sm:w-[18px]" />
              </button>
            )}
            {room.type !== 'main' && (
              <button
                type="button"
                onClick={handleLeave}
                aria-label="יציאה"
                title="יציאה"
                className="flex min-h-[40px] min-w-[40px] shrink-0 touch-manipulation items-center justify-center whitespace-nowrap rounded-lg p-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-2 sm:text-sm"
              >
                <LogOut size={17} className="sm:hidden" aria-hidden />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {settings.globalChatMuted && room.type === 'main' && (
        <div className="border-b border-amber-900 bg-amber-950/50 px-4 py-2 text-center text-sm text-amber-200">
          {t('chat.globalMuted')}
        </div>
      )}

      {room.closedAt && (
        <div className="border-b border-red-900 bg-red-950/40 px-4 py-2 text-center text-sm text-red-200">
          {t('chat.roomClosed')}
        </div>
      )}

      {room.linkedTopicId &&
        (() => {
          const parts = String(room.linkedTopicId).split('/').filter(Boolean);
          const href = parts.length >= 2 ? `/forum/${parts[0]}/${parts[1]}` : null;
          if (!href) return null;
          return (
            <div className="flex flex-wrap items-center justify-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-center text-sm text-zinc-300">
              <ExternalLink size={14} className="shrink-0 text-amber-500" />
              <Link to={href} className="break-words font-medium text-amber-400 hover:underline">
                {t('chat.linkedTopic')}
              </Link>
            </div>
          );
        })()}

      {room.description && (
        <div
          className="border-b border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-center text-xs text-zinc-400 sm:px-4"
          title={room.description}
        >
          <span className="truncate inline-block max-w-full align-middle">{room.description}</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex min-w-0 flex-1 flex-col border-e border-zinc-800">
          {pinned && !pinned.deleted && (
            <div className="flex items-start gap-2 border-b border-zinc-800 bg-zinc-900/50 px-3 py-2 sm:px-4">
              <Pin size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-amber-400">{t('chat.pinned')}</div>
                <p className="line-clamp-3 text-sm text-zinc-200">{pinned.text}</p>
              </div>
              {canMod && (
                <button
                  type="button"
                  className="text-xs font-bold text-zinc-400 hover:text-white hover:underline"
                  onClick={() => pinMessage(roomId, null, forumUser, siteUser, memberSelf, room)}
                >
                  {t('chat.unpin')}
                </button>
              )}
            </div>
          )}

          <div
            ref={parentRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-2 sm:px-4 py-2 sm:py-3"
            onScroll={handleChatScroll}
          >
            {hasMoreOlder && (
              <div className="mb-2 text-center">
                <button
                  type="button"
                  disabled={loadingOlder}
                  aria-disabled={loadingOlder}
                  onClick={handleLoadOlder}
                  className="text-xs text-red-300 hover:text-red-200 disabled:text-zinc-500"
                >
                  {loadingOlder ? '…' : t('chat.loadOlder')}
                </button>
              </div>
            )}
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const msg = displayMessages[vi.index];
                if (!msg) return null;
                return (
                  <div
                    key={msg.id}
                    data-index={vi.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vi.start}px)`
                    }}
                  >
                    <MessageBubble
                      msg={msg}
                      roomId={roomId}
                      forumUser={forumUser}
                      siteUser={siteUser}
                      memberSelf={memberSelf}
                      room={room}
                      nicknameMap={nickMap}
                      memberRoomTitleById={memberRoomTitleById}
                      forumRoleById={forumRoleById}
                      roomAdminById={roomAdminById}
                      onReply={(m) => setReplyTo(m)}
                      canMod={canMod}
                      canUseChatInteractions={canUseChatInteractions}
                      replySnippet={replySnippet}
                      highlightId={highlightId}
                      onReport={handleReport}
                      onOpenThread={(m) => setThreadFor(m)}
                      t={t}
                      virtualListRow
                      parentReactionPool={reactionsByMessageId}
                      deliveryStatus={outgoingDelivery[msg.id]}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {typingUsers.filter((x) => {
            if (x.userId === forumUser?.id) return false;
            return isPrivateRoomInvitedParticipant(room, x.userId);
          }).length > 0 && (
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-500 sm:px-4 sm:py-1">
              {t('chat.typing')}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {sendError && (
              <div className="mb-1 rounded-md bg-red-950/60 px-2 py-1 text-xs text-red-300 sm:mb-2" role="alert">
                {sendError}
              </div>
            )}
            {replyTo && (
              <div className="mb-1 flex items-center justify-between gap-2 rounded-md bg-white/95 px-2 py-1 text-xs sm:mb-2">
                <span className="min-w-0 truncate font-bold text-black">
                  <span className="text-black">{t('chat.replyingTo')}:</span>{' '}
                  <span className="text-zinc-800">{(replyTo.text || '').slice(0, 60)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 touch-manipulation py-0.5 text-xs font-bold text-red-700 hover:underline sm:py-1"
                >
                  {t('chat.cancelReply')}
                </button>
              </div>
            )}
            <div className="flex min-w-0 w-full items-end gap-1 sm:gap-2">
              <div className="relative shrink-0" data-chat-emoji-root>
                <button
                  type="button"
                  disabled={composerBlocked}
                  aria-disabled={composerBlocked}
                  aria-label={t('a11y.openEmoji') || t('chat.emoji')}
                  aria-expanded={emojiOpen}
                  className="mb-0.5 flex min-h-[36px] min-w-[36px] touch-manipulation items-center justify-center rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white disabled:text-zinc-600 sm:min-h-[44px] sm:min-w-[44px] sm:p-2.5"
                  title={t('chat.emoji')}
                  onClick={() => setEmojiOpen((o) => !o)}
                >
                  <Smile size={22} aria-hidden="true" />
                </button>
                {emojiOpen && !composerBlocked && (
                  <div className="absolute start-0 bottom-full z-[20100] mb-1 grid max-h-[min(40vh,240px)] w-[min(16rem,calc(100vw-2rem))] grid-cols-4 gap-1 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
                    {EMOJI_INSERT_GRID.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className="rounded p-1 text-xl hover:bg-zinc-800"
                        onClick={() => {
                          setInput((prev) => (prev ? `${prev}${em}` : em));
                          sendTypingPulse(roomId, forumUser.id);
                          setEmojiOpen(false);
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative flex min-w-0 flex-1">
                <label htmlFor="chat-composer-textarea" className="sr-only">
                  {t('a11y.composer') || t('chat.send')}
                </label>
                <textarea
                  id="chat-composer-textarea"
                  ref={composerRef}
                  value={input}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInput(v);
                    sendTypingPulse(roomId, forumUser.id);
                    refreshMentionFromCaret(v, e.target.selectionStart);
                  }}
                  onKeyUp={(e) => refreshMentionFromCaret(e.target.value, e.target.selectionStart)}
                  onClick={(e) => refreshMentionFromCaret(e.target.value, e.target.selectionStart)}
                  onBlur={() => {
                    // Defer so a click on a picker option still gets to fire.
                    setTimeout(() => setMentionPicker(null), 120);
                  }}
                  onKeyDown={handleComposerKeyDown}
                  disabled={composerBlocked}
                  aria-disabled={composerBlocked}
                  aria-label={t('a11y.composer') || t('chat.send')}
                  placeholder={composerPlaceholder}
                  className="min-h-[40px] max-h-32 w-full min-w-0 flex-1 resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-base text-white placeholder:text-zinc-400 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm disabled:bg-zinc-900 disabled:text-zinc-400"
                  rows={2}
                  enterKeyHint={sendOnEnter ? 'send' : 'enter'}
                />
                {mentionPicker?.open && mentionCandidates.length > 0 && (
                  <div
                    className="absolute bottom-full start-0 mb-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl z-[20100]"
                    role="listbox"
                    aria-label={t('a11y.mentionList') || 'אזכור משתמש'}
                  >
                    {mentionCandidates.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={idx === mentionPicker.hi}
                        // Use onMouseDown so we apply the selection BEFORE the
                        // textarea's onBlur fires (which would close the picker).
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyMentionSelection(m);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-right text-sm transition-colors ${
                          idx === mentionPicker.hi
                            ? 'bg-red-900/40 text-white'
                            : 'text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-pink-400 font-bold">@</span>
                        <span className="truncate">{m.nickname}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={composerBlocked || !input.trim()}
                aria-disabled={composerBlocked || !input.trim()}
                aria-label={t('chat.send')}
                className="flex min-h-[36px] min-w-[36px] shrink-0 touch-manipulation items-center justify-center self-end rounded-xl bg-red-600 p-2 text-white hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-400 sm:min-h-[44px] sm:min-w-[44px] sm:p-3"
              >
                <Send size={20} aria-hidden="true" />
              </button>
            </div>
            <label
              className="mt-1.5 hidden cursor-pointer select-none items-center gap-2 text-[11px] text-zinc-400 lg:mt-2 lg:flex"
              title={t('chat.sendOnEnterHint')}
            >
              <input
                type="checkbox"
                className="size-3.5 rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-red-500"
                checked={sendOnEnter}
                onChange={(e) => toggleSendOnEnter(e.target.checked)}
              />
              <span>{t('chat.sendOnEnter')}</span>
            </label>
          </form>
        </div>

        <aside className="hidden w-64 flex-col border-s border-zinc-800 bg-zinc-950 lg:flex xl:w-72">
          <div className="flex items-center gap-1.5 border-b border-zinc-800 px-2.5 py-2 text-xs font-bold text-zinc-300">
            <Users size={14} className="shrink-0 text-zinc-500" />
            <span className="truncate">
              {t('chat.members')} ({rosterForSidebar.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {rosterForSidebar.map((row) => (
              <MemberRow
                key={row.id}
                {...memberRowSharedProps}
                m={row.m}
                nick={nickMap[row.id]}
                presenceOnline={row.presenceOnline}
                invitedOnly={row.invitedOnly}
                canRemoveThisUser={row.canRemoveThisUser}
                onRemoveParticipantFromPrivate={handleRemoveParticipantFromPrivate}
              />
            ))}
          </div>

          {showModPanelInSidebar && (
            <ModPanel
              roomId={roomId}
              room={room}
              forumUser={forumUser}
              siteUser={siteUser}
              memberSelf={memberSelf}
              globalMod={globalMod}
              t={t}
            />
          )}
        </aside>
      </div>

      <ChannelSettingsDrawer
        open={privateRoomStaff && channelSettingsOpen}
        onClose={() => setChannelSettingsOpen(false)}
        roomId={roomId}
        room={room}
        forumUser={forumUser}
        siteUser={siteUser}
        memberSelf={memberSelf}
        globalMod={globalMod}
        t={t}
      />

      <MobileMembersDrawer
        open={mobileMembersOpen}
        onClose={() => setMobileMembersOpen(false)}
        rosterForSidebar={rosterForSidebar}
        memberRowSharedProps={memberRowSharedProps}
        nickMap={nickMap}
        onRemoveParticipantFromPrivate={handleRemoveParticipantFromPrivate}
        canMod={canMod}
        roomId={roomId}
        room={room}
        forumUser={forumUser}
        siteUser={siteUser}
        memberSelf={memberSelf}
        globalMod={globalMod}
        t={t}
      />

      <ThreadDrawer
        open={!!threadFor}
        onClose={() => setThreadFor(null)}
        threadMessages={threadMessages}
        roomId={roomId}
        forumUser={forumUser}
        siteUser={siteUser}
        memberSelf={memberSelf}
        room={room}
        nickMap={nickMap}
        memberRoomTitleById={memberRoomTitleById}
        forumRoleById={forumRoleById}
        roomAdminById={roomAdminById}
        canMod={canMod}
        canUseChatInteractions={canUseChatInteractions}
        replySnippet={replySnippet}
        outgoingDelivery={outgoingDelivery}
        onReply={(m) => {
          setReplyTo(m);
          setThreadFor(null);
        }}
        onReport={handleReport}
        t={t}
      />
    </div>
  );
};

export default ChatRoomView;
