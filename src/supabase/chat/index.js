import { getSupabaseClient, hasSupabaseChatAccessToken, supabaseChatConfigured } from '../client';
import { getLiveChatSettings } from '../../firebase/settings';
import { getForumUserById, getForumUsersByIds } from '../../firebase/forumUsers';
import { createNotification } from '../../firebase/notifications';
import { canInviteToPrivateRoom, isRoomStaff, canGlobalModerate, canPostInRoom } from '../../utils/liveChatPermissions';
import {
  MAIN_ROOM_ID,
  MUTES_COL,
  ROOMS_COL,
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_HEARTBEAT_HIDDEN_MS,
  PRESENCE_ONLINE_THRESHOLD_MS,
  MAX_TEXT,
  BURST_WINDOW_MS,
  BURST_MAX_MSG,
  MAX_INVITE_IDS,
  TYPING_TTL_MS
} from '../../firebase/liveChat/constants.js';
import {
  computeExpireAtFromDays,
  isMutedRecord,
  normalizeOutgoingChatText,
  nowMs
} from '../../firebase/liveChat/helpers.js';
import { maybeNotifyMentions, buildMemberNicknamesForMentions } from '../../firebase/liveChat/mentions.js';

function sb() {
  return getSupabaseClient();
}

/** Each subscription needs its own channel name; reusing e.g. `room-main` returns an already-subscribed channel and `.on()` after `subscribe()` throws. */
function uniqueRealtimeTopic(base) {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  return `${base}:${uuid}`;
}

/** Lean columns — smaller payloads on hot realtime refetches (avoid select('*')). */
const CHAT_MESSAGES_LIST_COLS =
  'id,room_id,author_forum_user_id,author_nickname,text,is_system,is_action,deleted,deleted_by,deleted_at,reply_to_message_id,created_at,expire_at';

const CHAT_PARTICIPANT_LIST_COLS =
  'room_id,forum_user_id,role,observe_mode,room_title,has_voice,joined_at,last_seen_at,last_message_at,last_read_message_id,last_read_at,recent_send_times_json';

const CHAT_TYPING_COLS = 'room_id,forum_user_id,updated_at';

const CHAT_REACTIONS_LIST_COLS = 'id,emoji,forum_user_id,created_at';

/** Coalesce burst postgres_changes refetches; skip overlapping runs; cancel pending on unsubscribe. */
const REALTIME_RELOAD_DEBOUNCE_MS = 140;

function createDebouncedReload(runAsync, debounceMs) {
  let timer = null;
  let inFlight = false;
  let trailing = false;

  const exec = async () => {
    if (inFlight) {
      trailing = true;
      return;
    }
    inFlight = true;
    try {
      await runAsync();
    } finally {
      inFlight = false;
      if (trailing) {
        trailing = false;
        void exec();
      }
    }
  };

  const schedule = () => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void exec();
    }, debounceMs);
  };

  const cancel = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { schedule, cancel };
}

function toRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    name: row.name || '',
    description: row.description || '',
    category: row.category || '',
    createdByForumUserId: row.created_by_forum_user_id,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
    slowModeSeconds: Number(row.slow_mode_seconds || 0),
    adminsOnlyMode: row.admins_only_mode === true,
    pinnedMessageId: row.pinned_message_id || null,
    inviteToken: row.invite_token || null,
    inviteLinkEnabled: row.invite_link_enabled === true,
    participantIds: Array.isArray(row.participant_ids_json) ? row.participant_ids_json : []
  };
}

const ROOM_DESCRIPTION_MAX = 200;
const ROOM_CATEGORY_MAX = 60;
const ROOM_NAME_MAX = 120;

const sanitizeRoomDescription = (s) =>
  String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, ROOM_DESCRIPTION_MAX);

const sanitizeRoomCategory = (s) =>
  String(s || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, ROOM_CATEGORY_MAX);

function toMember(row) {
  if (!row) return null;
  return {
    id: row.forum_user_id,
    role: row.role || 'member',
    observeMode: row.observe_mode === true,
    roomTitle: row.room_title || '',
    hasVoice: row.has_voice === true,
    joinedAt: row.joined_at ? new Date(row.joined_at) : null,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    lastReadMessageId: row.last_read_message_id || null,
    lastReadAt: row.last_read_at ? new Date(row.last_read_at) : null,
    recentSendTimes: Array.isArray(row.recent_send_times_json) ? row.recent_send_times_json : []
  };
}

function toMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_forum_user_id,
    authorNickname: row.author_nickname || '',
    text: row.text || '',
    createdAt: row.created_at ? new Date(row.created_at) : null,
    deleted: row.deleted === true,
    deletedBy: row.deleted_by || null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    replyToMessageId: row.reply_to_message_id || null,
    isSystem: row.is_system === true,
    isAction: row.is_action === true,
    expireAt: row.expire_at ? new Date(row.expire_at) : null
  };
}

export {
  MAIN_ROOM_ID,
  ROOMS_COL,
  MUTES_COL,
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_HEARTBEAT_HIDDEN_MS,
  PRESENCE_ONLINE_THRESHOLD_MS
};

export function supabaseChatReady() {
  return supabaseChatConfigured();
}

export async function ensureMainRoom() {
  // Idempotent insert: the row only needs to be created once. Under the
  // post-2026-05-14 RLS, the UPDATE branch of an upsert would require
  // chat_is_room_staff('main'), which is false for non-mods (creator is
  // 'system'). `ignoreDuplicates: true` translates to ON CONFLICT DO NOTHING,
  // so subsequent loads skip the UPDATE entirely. The 20260508 bootstrap
  // INSERT policy still allows the very first creator to write this row;
  // last_activity_at is maintained by chat_bump_room_activity on send.
  const { error } = await sb().from('chat_rooms').upsert(
    {
      id: MAIN_ROOM_ID,
      type: 'main',
      name: 'צ׳אט כללי',
      created_by_forum_user_id: 'system',
      participant_ids_json: [],
      closed_at: null,
      slow_mode_seconds: 0,
      admins_only_mode: false,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    },
    { ignoreDuplicates: true, onConflict: 'id' }
  );
  if (error) throw error;
}

export async function getRoom(roomId) {
  const { data, error } = await sb().from('chat_rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw error;
  return toRoom(data);
}

export function subscribeRoom(roomId, callback) {
  let active = true;
  const pull = async () => {
    if (!active) return;
    try {
      const r = await getRoom(roomId);
      if (active) callback(r);
    } catch {
      if (active) callback(null);
    }
  };
  void pull();
  const { schedule: schedulePull, cancel: cancelPull } = createDebouncedReload(pull, REALTIME_RELOAD_DEBOUNCE_MS);
  const channel = sb()
    .channel(uniqueRealtimeTopic(`room-${roomId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` }, schedulePull)
    .subscribe();
  return () => {
    active = false;
    cancelPull();
    sb().removeChannel(channel);
  };
}

export async function listActiveRooms(limitN = 120) {
  const { data, error } = await sb()
    .from('chat_rooms')
    .select('*')
    .is('closed_at', null)
    .order('last_activity_at', { ascending: false })
    .limit(limitN);
  if (error) throw error;
  return (data || []).map(toRoom);
}

export async function listMyPrivateRooms(forumUserId, limitN = 80) {
  if (!forumUserId) return [];
  // Source of truth is chat_rooms.participant_ids_json (the canonical invite
  // list). Querying chat_room_participants would also surface rooms a forum
  // admin "peeked into" via joinRoom — joinRoom inserts a participant row
  // even when the admin is NOT on the invite list, which would pollute the
  // admin's personal "my private rooms" lobby with every room they ever
  // moderated. participant_ids_json is mutated only by createPrivateRoom
  // and inviteForumUsersToPrivateRoom, so it cleanly represents "rooms
  // I was actually invited to". This matches the Firebase implementation
  // which queries participantIds.array-contains.
  // `participant_ids_json` is a jsonb column, so the contains operator must
  // be sent as a JSON literal (`cs.["abc"]`), not the Postgres array literal
  // (`cs.{abc}`) that supabase-js produces from a JS array — that one is for
  // real `_text[]` columns and PostgREST rejects it on jsonb with
  //   22P02  invalid input syntax for type json
  // Using `.filter()` with `JSON.stringify([id])` forces the JSON form.
  const { data, error } = await sb()
    .from('chat_rooms')
    .select('*')
    .eq('type', 'private')
    .filter('participant_ids_json', 'cs', JSON.stringify([forumUserId]))
    .order('last_activity_at', { ascending: false })
    .limit(limitN);
  if (error) throw error;
  return (data || []).map(toRoom);
}

export function subscribeMainRoomLastActivity(callback) {
  return subscribeRoom(MAIN_ROOM_ID, (room) => {
    const ms = room?.lastActivityAt instanceof Date ? room.lastActivityAt.getTime() : 0;
    callback(ms);
  });
}

export function subscribeLiveChatSettings(callback) {
  let active = true;
  getLiveChatSettings()
    .then((s) => active && callback(s))
    .catch(() => active && callback({ retentionDays: 3, globalChatMuted: false }));
  return () => {
    active = false;
  };
}

export function subscribeMembers(roomId, callback) {
  let active = true;
  const load = async () => {
    if (!active) return;
    const { data, error } = await sb()
      .from('chat_room_participants')
      .select(CHAT_PARTICIPANT_LIST_COLS)
      .eq('room_id', roomId);
    if (!active) return;
    if (error) return callback([]);
    callback((data || []).map(toMember));
  };
  void load();
  const { schedule, cancel } = createDebouncedReload(load, REALTIME_RELOAD_DEBOUNCE_MS);
  const channel = sb()
    .channel(uniqueRealtimeTopic(`members-${roomId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `room_id=eq.${roomId}` }, schedule)
    .subscribe();
  return () => {
    active = false;
    cancel();
    sb().removeChannel(channel);
  };
}

export function subscribeMessages(roomId, onMessages, pageSize = 80) {
  let active = true;
  const load = async () => {
    if (!active) return;
    let data;
    let error;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sb()
        .from('chat_messages')
        .select(CHAT_MESSAGES_LIST_COLS)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(pageSize);
      data = res.data;
      error = res.error;
      if (!error) break;
      await new Promise((r) => setTimeout(r, 250 + attempt * 150));
      if (!active) return;
    }
    if (!active) return;
    if (error) return onMessages([]);
    const rows = (data || []).map(toMessage).reverse();
    onMessages(rows);
  };
  void load();
  const { schedule, cancel } = createDebouncedReload(load, REALTIME_RELOAD_DEBOUNCE_MS);
  const channel = sb()
    .channel(uniqueRealtimeTopic(`messages-${roomId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, schedule)
    .subscribe();
  return () => {
    active = false;
    cancel();
    sb().removeChannel(channel);
  };
}

export function subscribeTyping(roomId, callback) {
  let active = true;
  const load = async () => {
    if (!active) return;
    const { data, error } = await sb()
      .from('chat_typing')
      .select(CHAT_TYPING_COLS)
      .eq('room_id', roomId);
    if (!active) return;
    if (error) return callback([]);
    const now = Date.now();
    callback(
      (data || [])
        .filter((t) => {
          const ms = t.updated_at ? new Date(t.updated_at).getTime() : 0;
          return now - ms < TYPING_TTL_MS;
        })
        .map((t) => ({ userId: t.forum_user_id, updatedAt: t.updated_at ? new Date(t.updated_at) : null }))
    );
  };
  void load();
  const { schedule, cancel } = createDebouncedReload(load, REALTIME_RELOAD_DEBOUNCE_MS);
  const channel = sb()
    .channel(uniqueRealtimeTopic(`typing-${roomId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_typing', filter: `room_id=eq.${roomId}` }, schedule)
    .subscribe();
  return () => {
    active = false;
    cancel();
    sb().removeChannel(channel);
  };
}

export function subscribeReactions(roomId, messageId, callback) {
  let active = true;
  const load = async () => {
    if (!active) return;
    const { data, error } = await sb()
      .from('chat_reactions')
      .select(CHAT_REACTIONS_LIST_COLS)
      .eq('room_id', roomId)
      .eq('message_id', messageId);
    if (!active) return;
    if (error) return callback([]);
    callback((data || []).map((r) => ({ id: r.id, emoji: r.emoji, userId: r.forum_user_id, createdAt: new Date(r.created_at) })));
  };
  void load();
  const { schedule, cancel } = createDebouncedReload(load, REALTIME_RELOAD_DEBOUNCE_MS);
  const channel = sb()
    .channel(uniqueRealtimeTopic(`reactions-${roomId}-${messageId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions', filter: `message_id=eq.${messageId}` }, schedule)
    .subscribe();
  return () => {
    active = false;
    cancel();
    sb().removeChannel(channel);
  };
}

export async function joinRoom(roomId, forumUser, _siteUser, opts = {}) {
  if (roomId === MAIN_ROOM_ID) {
    await ensureMainRoom();
  }
  const room = await getRoom(roomId);
  if (!room) throw new Error('החדר לא נמצא');
  if (room.closedAt) throw new Error('החדר סגור');
  const isForumAdmin = forumUser?.role === 'forumAdmin';
  const isInvited =
    Array.isArray(room.participantIds) && room.participantIds.includes(forumUser.id);
  // Channels are public like 'main' — anyone with a chat session can join.
  const canAccess = room.type === 'main' || room.type === 'channel' || isForumAdmin || isInvited;
  if (!canAccess) throw new Error('אין גישה לחדר');
  const existing = await sb()
    .from('chat_room_participants')
    .select('*')
    .eq('room_id', roomId)
    .eq('forum_user_id', forumUser.id)
    .maybeSingle();
  const nowIso = new Date().toISOString();
  // Defense-in-depth: a forum admin who opens a private room they weren't
  // invited to is moderating, not chatting. Force observe-mode on entry so
  // they can't accidentally write/react in someone else's private room. The
  // admin can still flip out of observe-mode explicitly via the in-room
  // toggle if they want to participate.
  const adminPeek = isForumAdmin && room.type === 'private' && !isInvited;
  const observeMode = adminPeek
    ? true
    : isForumAdmin && room.type === 'private'
      ? !!opts.observeMode
      : false;
  if (existing.data) {
    const { error } = await sb()
      .from('chat_room_participants')
      .update({
        observe_mode: observeMode,
        last_seen_at: nowIso
      })
      .eq('room_id', roomId)
      .eq('forum_user_id', forumUser.id);
    if (error) throw error;
  } else {
    const role = room.createdByForumUserId === forumUser.id ? 'roomAdmin' : 'member';
    const { error } = await sb().from('chat_room_participants').insert({
      room_id: roomId,
      forum_user_id: forumUser.id,
      role,
      observe_mode: observeMode,
      room_title: '',
      has_voice: false,
      joined_at: nowIso,
      last_seen_at: nowIso,
      recent_send_times_json: []
    });
    if (error) throw error;
  }
  const member = await sb()
    .from('chat_room_participants')
    .select('*')
    .eq('room_id', roomId)
    .eq('forum_user_id', forumUser.id)
    .single();
  if (member.error) throw member.error;
  return { room, member: toMember(member.data) };
}

export async function updateObserveMode(roomId, forumUserId, observeMode, isForumAdmin) {
  if (!isForumAdmin) throw new Error('אין הרשאה');
  const { error } = await sb()
    .from('chat_room_participants')
    .update({ observe_mode: !!observeMode })
    .eq('room_id', roomId)
    .eq('forum_user_id', forumUserId);
  if (error) throw error;
}

export async function heartbeatMember(roomId, forumUserId) {
  if (!roomId || !forumUserId) return;
  await sb()
    .from('chat_room_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('forum_user_id', forumUserId);
}

export async function leaveRoom(roomId, forumUserId) {
  if (!roomId || !forumUserId) return;
  await sb().from('chat_room_participants').delete().eq('room_id', roomId).eq('forum_user_id', forumUserId);
}

export async function tryDeleteRoomIfEmpty(roomId) {
  const room = await getRoom(roomId);
  if (!room || room.type === 'main') return false;
  const members = await sb().from('chat_room_participants').select('forum_user_id').eq('room_id', roomId).limit(1);
  if ((members.data || []).length > 0) return false;
  await sb().from('chat_rooms').delete().eq('id', roomId);
  return true;
}

export async function sendTypingPulse(roomId, forumUserId) {
  if (!roomId || !forumUserId) return;
  const now = new Date();
  const expireAt = new Date(now.getTime() + 120000).toISOString();
  await sb().from('chat_typing').upsert({
    room_id: roomId,
    forum_user_id: forumUserId,
    updated_at: now.toISOString(),
    expire_at: expireAt
  });
}

export async function clearTyping(roomId, forumUserId) {
  if (!roomId || !forumUserId) return;
  await sb().from('chat_typing').delete().eq('room_id', roomId).eq('forum_user_id', forumUserId);
}

export async function loadOlderMessages(roomId, oldestMessage, pageSize = 40) {
  if (!roomId || !oldestMessage?.createdAt) return [];
  const ts = new Date(oldestMessage.createdAt).toISOString();
  const { data, error } = await sb()
    .from('chat_messages')
    .select(CHAT_MESSAGES_LIST_COLS)
    .eq('room_id', roomId)
    .lt('created_at', ts)
    .order('created_at', { ascending: false })
    .limit(pageSize);
  if (error) return [];
  return (data || []).map(toMessage).reverse();
}

export async function updateMemberLastRead(roomId, forumUserId, messageId) {
  if (!roomId || !forumUserId || !messageId) return;
  await sb()
    .from('chat_room_participants')
    .update({ last_read_message_id: messageId, last_read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('forum_user_id', forumUserId);
}

export async function sendChatMessage(roomId, forumUser, siteUser, text, opts = {}) {
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  if (!hasSupabaseChatAccessToken()) {
    throw new Error('נדרש חיבור מחדש לצ׳אט — התנתקו מהפורום והתחברו שוב.');
  }
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.length > MAX_TEXT) throw new Error('הודעה ריקה או ארוכה מדי');

  const [{ data: memberRow }, room] = await Promise.all([
    sb()
      .from('chat_room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('forum_user_id', forumUser.id)
      .maybeSingle(),
    getRoom(roomId)
  ]);

  const member = toMember(memberRow);
  if (!room?.id || room.closedAt) throw new Error('החדר סגור');
  if (!member) throw new Error('יש להצטרף לחדר');
  if (member.observeMode) throw new Error('מצב צפייה — עבור ל״נכנס״ כדי לכתוב');
  if (!canPostInRoom(room, forumUser, siteUser, member)) {
    throw new Error('במצב זה רק מנהלים ומי שקיבל קול יכולים לכתוב');
  }

  let retentionDays = opts.cachedLiveChatSettings?.retentionDays;
  let globalChatMuted = opts.cachedLiveChatSettings?.globalChatMuted;
  if (retentionDays == null || globalChatMuted === undefined) {
    const fetched = await getLiveChatSettings();
    if (retentionDays == null) retentionDays = fetched.retentionDays;
    if (globalChatMuted === undefined) globalChatMuted = fetched.globalChatMuted;
  }
  const settings = { retentionDays, globalChatMuted };
  if (room.type === 'main' && settings.globalChatMuted && !canGlobalModerate(siteUser, forumUser)) {
    throw new Error('הצ׳אט הכללי מושתק על ידי מנהלים');
  }

  let muteDoc;
  if (Object.prototype.hasOwnProperty.call(opts, 'cachedMuteDoc')) {
    muteDoc = opts.cachedMuteDoc;
  } else {
    muteDoc = await getChatMute(forumUser.id);
  }
  if (isMutedRecord(muteDoc, roomId)) throw new Error('אתה מושתק');

  const slow = Number(room.slowModeSeconds) || 0;
  if (slow > 0 && !canGlobalModerate(siteUser, forumUser)) {
    const lastMs = member.lastMessageAt instanceof Date ? member.lastMessageAt.getTime() : 0;
    if (lastMs && nowMs() - lastMs < slow * 1000) throw new Error(`המתן ${slow} שניות בין הודעות`);
  }

  const { displayText, isAction } = normalizeOutgoingChatText(trimmed);

  if (!canGlobalModerate(siteUser, forumUser)) {
    const prev = Array.isArray(member.recentSendTimes) ? member.recentSendTimes : [];
    const burst = prev.filter((x) => typeof x === 'number' && nowMs() - x < BURST_WINDOW_MS);
    if (burst.length >= BURST_MAX_MSG) throw new Error('יותר מדי הודעות בזמן קצר — המתן רגע');
  }

  const expireAt = opts.expireAt instanceof Date ? opts.expireAt : computeExpireAtFromDays(settings.retentionDays).toDate();
  const createdAtIso = new Date().toISOString();
  const preset = opts.preassignedMessageId ? String(opts.preassignedMessageId).trim() : '';
  const msgId =
    preset ||
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`);
  const { error } = await sb().from('chat_messages').insert({
    id: msgId,
    room_id: roomId,
    author_forum_user_id: String(forumUser.id),
    author_nickname: String(forumUser.nickname || '').slice(0, 40),
    text: displayText,
    is_system: false,
    is_action: isAction,
    deleted: false,
    reply_to_message_id: opts.replyToMessageId || null,
    created_at: createdAtIso,
    expire_at: expireAt.toISOString()
  });
  if (error) throw error;

  const prev = Array.isArray(member.recentSendTimes) ? member.recentSendTimes : [];
  const burst = prev.filter((x) => typeof x === 'number' && nowMs() - x < BURST_WINDOW_MS);
  burst.push(nowMs());
  await Promise.all([
    sb()
      .from('chat_room_participants')
      .update({
        last_message_at: createdAtIso,
        last_seen_at: createdAtIso,
        recent_send_times_json: burst.slice(-25)
      })
      .eq('room_id', roomId)
      .eq('forum_user_id', forumUser.id),
    // Non-staff cannot UPDATE chat_rooms directly under the post-2026-05-14
    // WITH CHECK; this RPC is SECURITY DEFINER and only bumps activity.
    sb().rpc('chat_bump_room_activity', { p_room_id: roomId })
  ]);

  void (async () => {
    try {
      if (!displayText.includes('@')) return;
      let nickRows = Array.isArray(opts.memberNicknamesForMentions)
        ? opts.memberNicknamesForMentions
        : null;
      if (!nickRows?.length) {
        const membersSnap = await sb()
          .from('chat_room_participants')
          .select('forum_user_id')
          .eq('room_id', roomId);
        const ids = (membersSnap.data || []).map((m) => m.forum_user_id).filter(Boolean);
        const map = await getForumUsersByIds(ids);
        nickRows = Object.values(map)
          .filter((u) => u?.nickname)
          .map((u) => ({ id: u.id, nickname: u.nickname }));
      }
      await maybeNotifyMentions(roomId, displayText, forumUser, nickRows || [], {
        roomName: room?.name || '',
        messageId: msgId
      });
    } catch {
      /* non-fatal */
    }
  })();

  return msgId;
}

export async function toggleReaction(roomId, messageId, forumUser, siteUser, emoji) {
  if (!forumUser?.id || !emoji) return;
  const room = await getRoom(roomId);
  if (!room || room.closedAt) return;
  const memberRes = await sb()
    .from('chat_room_participants')
    .select('*')
    .eq('room_id', roomId)
    .eq('forum_user_id', forumUser.id)
    .maybeSingle();
  const member = toMember(memberRes.data);
  if (!member || member.observeMode) return;
  if (!canPostInRoom(room, forumUser, siteUser, member)) throw new Error('במצב זה רק מנהלים ומי שקיבל קול יכולים להגיב');
  const safeEmoji = [...emoji].slice(0, 4).join('') || '👍';

  // The whole "delete-all + maybe-insert" toggle runs inside the
  // SECURITY DEFINER RPC `chat_set_reaction`. That sidesteps two failure
  // modes the client-side path was hitting under rapid clicks:
  //   - "duplicate key value violates unique constraint chat_reactions_pkey"
  //   - "new row violates row-level security policy (USING expression)
  //      for table chat_reactions"
  // both of which were races between two in-flight upserts. The function
  // is a single transaction and re-enforces read access via
  // chat_can_read_room. See migration 20260519_chat_set_reaction.sql.
  const { error } = await sb().rpc('chat_set_reaction', {
    p_room_id: roomId,
    p_message_id: messageId,
    p_emoji: safeEmoji
  });
  if (error) throw error;
}

export async function sendSystemLine(roomId, text) {
  const settings = await getLiveChatSettings();
  const expireAt = computeExpireAtFromDays(settings.retentionDays).toDate().toISOString();
  const { error } = await sb().rpc('chat_send_system_line', {
    p_room_id: roomId,
    p_text: String(text || '').slice(0, 500),
    p_expire_at: expireAt
  });
  if (error) throw error;
}

function randHex(len = 32) {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(len / 2);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.slice(0, len);
}

export async function createPrivateRoom(creatorId, name, invitedForumUserIds, options = {}) {
  if (!creatorId) throw new Error('לא מחובר');
  if (!hasSupabaseChatAccessToken()) {
    throw new Error('נדרש חיבור מחדש לצ׳אט — התנתקו מהפורום והתחברו שוב.');
  }
  const creatorIsForumAdmin = options?.creatorIsForumAdmin === true;
  const inviterNickname = String(options?.inviterNickname || '').slice(0, 40);
  const description = sanitizeRoomDescription(options?.description);
  if (!creatorIsForumAdmin) {
    const mine = await sb()
      .from('chat_rooms')
      .select('id, closed_at')
      .eq('type', 'private')
      .eq('created_by_forum_user_id', creatorId)
      .limit(20);
    const openCount = (mine.data || []).filter((r) => !r.closed_at).length;
    if (openCount >= 1) {
      throw new Error('ניתן לנהל חדר פרטי אחד פעיל בכל זמן. סגרו חדר קיים כדי ליצור חדש, או פנו למנהל פורום.');
    }
  }
  const roomId = randHex(24);
  const participantIds = [...new Set([creatorId, ...(invitedForumUserIds || [])])];
  const nowIso = new Date().toISOString();
  // Surface insert errors so the caller (ChatLobby) can show a real reason
  // instead of the cryptic "room not found" produced when joinRoom later
  // tries to read a row that was never written.
  const { error: roomErr } = await sb().from('chat_rooms').insert({
    id: roomId,
    type: 'private',
    name: String(name || 'חדר פרטי').slice(0, 120),
    description,
    created_by_forum_user_id: creatorId,
    created_at: nowIso,
    updated_at: nowIso,
    last_activity_at: nowIso,
    participant_ids_json: participantIds,
    slow_mode_seconds: 0
  });
  if (roomErr) throw new Error(roomErr.message || 'יצירת החדר נכשלה');
  // Insert the creator's own participant row first; without it the creator
  // can't even read the room they just made (RLS check fails). For other
  // invited members we tolerate per-row failures (RLS refuses inserts on
  // behalf of others) — they'll be added when they join via invite/admin.
  const { error: selfPartErr } = await sb().from('chat_room_participants').insert({
    room_id: roomId,
    forum_user_id: creatorId,
    role: 'roomAdmin',
    observe_mode: false,
    room_title: '',
    has_voice: false,
    joined_at: nowIso,
    last_seen_at: nowIso,
    recent_send_times_json: []
  });
  if (selfPartErr) throw new Error(selfPartErr.message || 'שגיאה בהצטרפות לחדר שיצרת');
  const otherIds = participantIds.filter((uid) => uid !== creatorId);
  if (otherIds.length > 0) {
    await Promise.all(
      otherIds.map((uid) =>
        sb().from('chat_room_participants').upsert({
          room_id: roomId,
          forum_user_id: uid,
          role: 'member',
          observe_mode: false,
          room_title: '',
          has_voice: false,
          joined_at: nowIso,
          last_seen_at: nowIso,
          recent_send_times_json: []
        })
      )
    );
    // Mirror inviteForumUsersToPrivateRoom: every invitee gets an invite
    // notification with Accept/Decline buttons. The invitee is technically
    // already a participant (so Accept = navigate in is instant), but they
    // can still Decline, which removes them via chat_decline_invite.
    const trimmedName = String(name || '').slice(0, 100);
    for (const uid of otherIds) {
      createNotification({
        userId: uid,
        type: 'chatRoomInvite',
        fromUserId: creatorId,
        fromUserName: inviterNickname,
        refId: roomId,
        refTitle: trimmedName,
        message: 'הוזמנת לחדר צ׳אט פרטי'
      }).catch(() => {});
    }
  }
  return { id: roomId, type: 'private', name, participantIds };
}

/**
 * Create a public chat channel. Channels behave like the bootstrap 'main'
 * room (visible to every chat user, no invite list required) but can be
 * created in arbitrary numbers and grouped by category. Only forum admins
 * may call this — the RLS insert policy also enforces this server-side.
 */
export async function createChannel(creatorId, name, options = {}) {
  if (!creatorId) throw new Error('לא מחובר');
  if (!options?.creatorIsForumAdmin) {
    throw new Error('רק מנהל פורום יכול ליצור ערוץ');
  }
  if (!hasSupabaseChatAccessToken()) {
    throw new Error('נדרש חיבור מחדש לצ׳אט — התנתקו מהפורום והתחברו שוב.');
  }
  const trimmedName = String(name || '').trim().slice(0, ROOM_NAME_MAX);
  if (!trimmedName) throw new Error('שם ערוץ חסר');
  const description = sanitizeRoomDescription(options.description);
  const category = sanitizeRoomCategory(options.category);
  const roomId = randHex(24);
  const nowIso = new Date().toISOString();
  const { error: roomErr } = await sb().from('chat_rooms').insert({
    id: roomId,
    type: 'channel',
    name: trimmedName,
    description,
    category,
    created_by_forum_user_id: creatorId,
    created_at: nowIso,
    updated_at: nowIso,
    last_activity_at: nowIso,
    participant_ids_json: [],
    slow_mode_seconds: 0
  });
  if (roomErr) throw new Error(roomErr.message || 'יצירת הערוץ נכשלה');
  // The creator is automatically the roomAdmin so they can manage the channel
  // (slow mode, admins-only mode, etc.) without an additional join step.
  const { error: selfPartErr } = await sb().from('chat_room_participants').insert({
    room_id: roomId,
    forum_user_id: creatorId,
    role: 'roomAdmin',
    observe_mode: false,
    room_title: '',
    has_voice: false,
    joined_at: nowIso,
    last_seen_at: nowIso,
    recent_send_times_json: []
  });
  // Channel membership for everyone else is lazy (created on first join).
  // The creator's own member row is required because canPostInRoom under
  // adminsOnlyMode reads the row's `role` to decide if the creator may post.
  if (selfPartErr) throw new Error(selfPartErr.message || 'שגיאה בהצטרפות לערוץ שיצרת');
  return { id: roomId, type: 'channel', name: trimmedName, description, category };
}

export async function setRoomCategory(roomId, newCategory, forumUser, siteUser, memberDoc, room) {
  const can = canGlobalModerate(siteUser, forumUser) || isRoomStaff(room, forumUser, siteUser, memberDoc);
  if (!can) throw new Error('אין הרשאה לעריכת הקטגוריה');
  const category = sanitizeRoomCategory(newCategory);
  const { error } = await sb()
    .from('chat_rooms')
    .update({ category, updated_at: new Date().toISOString() })
    .eq('id', roomId);
  if (error) throw error;
}

/**
 * List all open channels. Channels are public so this works for any signed-in
 * chat user (RLS lets them read channel rows just like main).
 */
export async function listChannels(limitN = 80) {
  const { data, error } = await sb()
    .from('chat_rooms')
    .select('*')
    .eq('type', 'channel')
    .is('closed_at', null)
    .order('category', { ascending: true })
    .order('last_activity_at', { ascending: false })
    .limit(limitN);
  if (error) throw error;
  return (data || []).map(toRoom);
}

export async function listPrivateRoomsWhereCanInvite(forumUser) {
  if (!forumUser?.id) return [];
  const mine = await listMyPrivateRooms(forumUser.id);
  const open = mine.filter((r) => r?.type === 'private' && !r.closedAt);
  const out = [];
  for (const r of open) {
    const memberSnap = await sb()
      .from('chat_room_participants')
      .select('*')
      .eq('room_id', r.id)
      .eq('forum_user_id', forumUser.id)
      .maybeSingle();
    const memberSelf = toMember(memberSnap.data);
    if (canInviteToPrivateRoom(r, forumUser, memberSelf)) {
      out.push({ roomId: r.id, room: r, memberSelf });
    }
  }
  return out;
}

export async function inviteForumUsersToPrivateRoom(roomId, invitedForumUserIds, forumUser, memberDoc, room) {
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  if (!room || room.type !== 'private') throw new Error('הזמנה זמינה רק בחדר פרטי');
  if (!canInviteToPrivateRoom(room, forumUser, memberDoc)) throw new Error('אין הרשאה להזמין — רק יוצר החדר או מנהל חדר');
  const raw = [...new Set((invitedForumUserIds || []).filter(Boolean))].filter((id) => id !== forumUser.id);
  if (raw.length === 0) throw new Error('לא נבחרו משתמשים');
  const toAdd = raw.slice(0, MAX_INVITE_IDS);
  const existing = new Set(room.participantIds || []);
  const newIds = toAdd.filter((id) => !existing.has(id));
  if (newIds.length === 0) throw new Error('כל הנבחרים כבר משתתפים בחדר');
  const nextParticipantIds = [...existing, ...newIds];
  await sb().from('chat_rooms').update({
    participant_ids_json: nextParticipantIds,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  }).eq('id', roomId);
  await Promise.all(
    newIds.map((uid) => sb().from('chat_room_participants').upsert({
      room_id: roomId,
      forum_user_id: uid,
      role: 'member',
      observe_mode: false,
      room_title: '',
      has_voice: false,
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      recent_send_times_json: []
    }))
  );
  const labels = await Promise.all(newIds.map((id) => getForumUserById(id)));
  const names = labels.map((u, i) => (u?.nickname || newIds[i]).slice(0, 40)).join(', ');
  await sendSystemLine(roomId, `${(forumUser.nickname || '').slice(0, 40)} הזמין/ה את ${names} לחדר`.slice(0, 500));
  for (const uid of newIds) {
    createNotification({
      userId: uid,
      type: 'chatRoomInvite',
      fromUserId: forumUser.id,
      fromUserName: (forumUser.nickname || '').slice(0, 40),
      refId: roomId,
      refTitle: (room.name || '').slice(0, 100),
      message: 'הוזמנת לחדר צ׳אט פרטי'
    }).catch(() => {});
  }
  return newIds.length;
}

/**
 * Decline a private-room invite. Removes the caller from the room's
 * participant list and the participants table via the
 * `chat_decline_invite` SECURITY DEFINER RPC (the strict update RLS
 * blocks non-staff from doing it directly). Idempotent: safe to call
 * even if the room is gone or the user was already removed.
 */
export async function declineRoomInvite(roomId) {
  if (!hasSupabaseChatAccessToken()) {
    throw new Error('נדרש חיבור מחדש לצ׳אט — התנתקו מהפורום והתחברו שוב.');
  }
  const id = String(roomId || '').trim();
  if (!id) throw new Error('חסר מזהה חדר');
  const { error } = await sb().rpc('chat_decline_invite', { p_room_id: id });
  if (error) throw new Error(error.message || 'שגיאה בדחיית ההזמנה');
}

export async function setPrivateRoomInviteLink(roomId, enabled, forumUser, siteUser, memberDoc, room) {
  if (!room || room.type !== 'private') throw new Error('רק בחדר פרטי');
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  const payload = {
    invite_link_enabled: !!enabled,
    updated_at: new Date().toISOString()
  };
  if (!room.inviteToken) payload.invite_token = randHex(32);
  await sb().from('chat_rooms').update(payload).eq('id', roomId);
}

export async function regeneratePrivateRoomInviteToken(roomId, forumUser, siteUser, memberDoc, room) {
  if (!room || room.type !== 'private') throw new Error('רק בחדר פרטי');
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  const token = randHex(32);
  await sb().from('chat_rooms').update({
    invite_token: token,
    invite_link_enabled: true,
    updated_at: new Date().toISOString()
  }).eq('id', roomId);
  return token;
}

export async function findPrivateRoomByInviteToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  const row = await sb().from('chat_rooms').select('*').eq('type', 'private').eq('invite_token', t).maybeSingle();
  return toRoom(row.data);
}

export async function joinPrivateRoomViaInvite(token, forumUser, siteUser, opts = {}) {
  if (!forumUser?.id) throw new Error('יש להתחבר לפורום');
  const room = await findPrivateRoomByInviteToken(token);
  if (!room?.id) throw new Error('קישור לא תקף או שפג תוקף');
  if (room.closedAt) throw new Error('הערוץ סגור');
  if (!room.inviteLinkEnabled || room.inviteToken !== String(token || '').trim()) {
    throw new Error('קישור ההצטרפות אינו פעיל');
  }
  const nextIds = [...new Set([...(room.participantIds || []), forumUser.id])];
  await sb().from('chat_rooms').update({
    participant_ids_json: nextIds,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  }).eq('id', room.id);
  return joinRoom(room.id, forumUser, siteUser, opts);
}

export async function removeParticipantFromPrivateRoom(roomId, targetForumUserId, forumUser, siteUser, memberSelf, room) {
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  if (!targetForumUserId) throw new Error('חסר משתמש');
  if (targetForumUserId === forumUser.id) throw new Error('להסרת עצמך השתמש ב״יציאה״ מהחדר');
  if (!room || room.type !== 'private') throw new Error('רק בחדר פרטי');
  if (!isRoomStaff(room, forumUser, siteUser, memberSelf)) throw new Error('אין הרשאה להסיר משתתפים');
  const ownerId = room.createdByForumUserId;
  if (ownerId && targetForumUserId === ownerId && !canGlobalModerate(siteUser, forumUser)) throw new Error('לא ניתן להסיר את יוצר החדר');

  const nextIds = (room.participantIds || []).filter((id) => id !== targetForumUserId);
  await sb().from('chat_rooms').update({
    participant_ids_json: nextIds,
    updated_at: new Date().toISOString()
  }).eq('id', roomId);
  await sb().from('chat_room_participants').delete().eq('room_id', roomId).eq('forum_user_id', targetForumUserId);
  const targetUser = await getForumUserById(targetForumUserId);
  const targetNick = (targetUser?.nickname || targetForumUserId).slice(0, 40);
  await sendSystemLine(roomId, `${(forumUser.nickname || '').slice(0, 40)} הסיר/ה את ${targetNick} מהחדר`.slice(0, 500));
  await tryDeleteRoomIfEmpty(roomId);
}

/**
 * Close a chat room. Mirrors the Firebase implementation:
 *
 *   - global moderators / site admins can close any room,
 *   - room staff (creator + roomAdmin) can close their own private room.
 *
 * Without the staff branch the lobby's `atPrivateRoomCreateLimit` gate
 * (one open private room per non-admin) had no client-driven release
 * valve — a regular user could never get back to the "I can create a
 * room" state on their own. RLS already permits the write
 * (`chat_rooms_update WITH CHECK chat_is_room_staff(id)`), so this is a
 * client-side trust check only.
 */
export async function closeRoom(roomId, forumUser, siteUser, memberDoc, room) {
  let roomDoc = room;
  if (!roomDoc || roomDoc.id !== roomId) {
    roomDoc = await getRoom(roomId);
  }
  const allowed =
    canGlobalModerate(siteUser, forumUser) ||
    (roomDoc?.type === 'private' && isRoomStaff(roomDoc, forumUser, siteUser, memberDoc));
  if (!allowed) throw new Error('אין הרשאה');
  const { error } = await sb().from('chat_rooms').update({
    closed_at: new Date().toISOString(),
    closed_by_forum_user_id: forumUser?.id || null,
    closed_by_site_admin: siteUser?.level === 'admin',
    updated_at: new Date().toISOString()
  }).eq('id', roomId);
  if (error) throw error;
}

export async function setRoomDescription(roomId, newDescription, forumUser, siteUser, memberDoc, room) {
  const can = canGlobalModerate(siteUser, forumUser) || isRoomStaff(room, forumUser, siteUser, memberDoc);
  if (!can) throw new Error('אין הרשאה לעריכת התיאור');
  const description = sanitizeRoomDescription(newDescription);
  const { error } = await sb()
    .from('chat_rooms')
    .update({ description, updated_at: new Date().toISOString() })
    .eq('id', roomId);
  if (error) throw error;
}

export async function renameRoom(roomId, newName, forumUser, siteUser, memberDoc, room) {
  const can = canGlobalModerate(siteUser, forumUser) || isRoomStaff(room, forumUser, siteUser, memberDoc);
  if (!can) throw new Error('אין הרשאה לשינוי שם');
  await sb().from('chat_rooms').update({
    name: String(newName || '').slice(0, 120),
    updated_at: new Date().toISOString()
  }).eq('id', roomId);
}

export async function setMemberRoomTitle(roomId, targetForumUserId, title, forumUser, siteUser, actorMemberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, actorMemberDoc)) throw new Error('אין הרשאה');
  await sb().from('chat_room_participants').update({ room_title: String(title || '').slice(0, 40) })
    .eq('room_id', roomId).eq('forum_user_id', targetForumUserId);
}

export async function setRoomSlowMode(roomId, seconds, forumUser, siteUser, memberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  const sec = Math.min(3600, Math.max(0, Number(seconds) || 0));
  await sb().from('chat_rooms').update({ slow_mode_seconds: sec, updated_at: new Date().toISOString() }).eq('id', roomId);
}

export async function setRoomAdminsOnlyMode(roomId, enabled, forumUser, siteUser, memberDoc, room) {
  if (!room?.id) throw new Error('החדר לא נמצא');
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc) && !(room.type === 'main' && canGlobalModerate(siteUser, forumUser))) {
    throw new Error('אין הרשאה לשינוי מצב חדר');
  }
  const next = !!enabled;
  await sb().from('chat_rooms').update({ admins_only_mode: next, updated_at: new Date().toISOString() }).eq('id', roomId);
  await sendSystemLine(roomId, next ? 'מצב דיבור: רק מנהלים ומי שקיבל קול יכולים לכתוב' : 'מצב דיבור: כולם יכולים לכתוב');
}

export async function setMemberVoice(roomId, targetForumUserId, hasVoice, forumUser, siteUser, actorMemberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, actorMemberDoc)) throw new Error('אין הרשאה');
  await sb().from('chat_room_participants').update({ has_voice: !!hasVoice }).eq('room_id', roomId).eq('forum_user_id', targetForumUserId);
}

export async function promoteRoomAdmin(roomId, targetForumUserId, promote, forumUser, siteUser, actorMemberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, actorMemberDoc)) throw new Error('אין הרשאה');
  await sb().from('chat_room_participants').update({ role: promote ? 'roomAdmin' : 'member' }).eq('room_id', roomId).eq('forum_user_id', targetForumUserId);
}

export async function pinMessage(roomId, messageId, forumUser, siteUser, memberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  await sb().from('chat_rooms').update({
    pinned_message_id: messageId || null,
    pinned_by_forum_user_id: messageId ? forumUser?.id || null : null,
    pinned_at: messageId ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq('id', roomId);
}

export async function softDeleteMessage(roomId, messageId, forumUser, siteUser, memberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc) && forumUser?.id !== room?.createdByForumUserId) throw new Error('אין הרשאה');
  await sb().from('chat_messages').update({
    deleted: true,
    deleted_by: forumUser?.id || null,
    deleted_at: new Date().toISOString()
  }).eq('room_id', roomId).eq('id', messageId);
}

export async function setRoomLinkedTopic(roomId, linkedTopicId, forumUser, siteUser, memberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc) && !canGlobalModerate(siteUser, forumUser)) throw new Error('אין הרשאה');
  await sb().from('chat_rooms').update({
    linked_topic_id: linkedTopicId || null,
    updated_at: new Date().toISOString()
  }).eq('id', roomId);
}

export async function getChatMute(userId) {
  if (!userId) return null;
  const { data } = await sb().from('chat_mutes').select('*').eq('forum_user_id', userId).maybeSingle();
  if (!data) return null;
  return {
    globalUntil: data.global_until ? new Date(data.global_until) : null,
    roomMutes: data.room_mutes_json || {}
  };
}

export function subscribeChatMute(userId, callback) {
  let active = true;
  const load = async () => {
    if (!active) return;
    callback(await getChatMute(userId));
  };
  void load();
  const { schedule, cancel } = createDebouncedReload(load, REALTIME_RELOAD_DEBOUNCE_MS);
  const channel = sb()
    .channel(uniqueRealtimeTopic(`mutes-${userId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_mutes', filter: `forum_user_id=eq.${userId}` }, schedule)
    .subscribe();
  return () => {
    active = false;
    cancel();
    sb().removeChannel(channel);
  };
}

export async function setChatMute(userId, actorForumUserId, hours, roomId = null) {
  if (!userId || !actorForumUserId) throw new Error('חסר מידע');
  const until = new Date(Date.now() + Math.max(1, Number(hours) || 1) * 3600000).toISOString();
  const current = await getChatMute(userId);
  const roomMutes = { ...(current?.roomMutes || {}) };
  let payload = {
    forum_user_id: userId,
    updated_at: new Date().toISOString(),
    updated_by: actorForumUserId,
    room_mutes_json: roomMutes,
    global_until: current?.globalUntil ? new Date(current.globalUntil).toISOString() : null
  };
  if (roomId) {
    roomMutes[roomId] = until;
    payload.room_mutes_json = roomMutes;
  } else {
    payload.global_until = until;
  }
  await sb().from('chat_mutes').upsert(payload);
}

export async function clearRoomMuteForUser(userId, roomId) {
  if (!userId || !roomId) return;
  const current = await getChatMute(userId);
  const roomMutes = { ...(current?.roomMutes || {}) };
  delete roomMutes[roomId];
  await sb().from('chat_mutes').upsert({
    forum_user_id: userId,
    global_until: current?.globalUntil ? new Date(current.globalUntil).toISOString() : null,
    room_mutes_json: roomMutes,
    updated_at: new Date().toISOString()
  });
}

export async function clearChatMute(userId) {
  if (!userId) return;
  await sb().from('chat_mutes').delete().eq('forum_user_id', userId);
}

/**
 * Forum-admin: scrub a user from the chat. Two modes:
 *   - `hardDeleteMessages: true`  → also wipes their authored messages (used
 *     by the admin "delete forum user" flow so their UID doesn't keep
 *     appearing in main-chat history after the account is gone).
 *   - `hardDeleteMessages: false` → kick only — removes participant rows so
 *     the user vanishes from member lists; if they reopen the chat
 *     `joinRoom('main', …)` will lazily re-create their main-room
 *     participant row (private rooms still require a fresh invite).
 *
 * Server-side authorisation is enforced inside `chat_purge_forum_user`
 * (SECURITY DEFINER + chat_is_forum_admin/chat_is_global_mod check); the
 * client-side flag is just to give the caller a clearer error.
 */
export async function purgeForumUserFromChat(targetForumUserId, opts = {}) {
  const id = String(targetForumUserId || '').trim();
  if (!id) throw new Error('חסר מזהה משתמש');
  if (!hasSupabaseChatAccessToken()) {
    throw new Error('נדרש חיבור מחדש לצ׳אט — התנתקו מהפורום והתחברו שוב.');
  }
  const hardDeleteMessages = opts.hardDeleteMessages === true;
  const { data, error } = await sb().rpc('chat_purge_forum_user', {
    p_target_id: id,
    p_hard_delete_messages: hardDeleteMessages
  });
  if (error) throw new Error(error.message || 'שגיאה במחיקת משתמש מהצ׳אט');
  // The function `returns table(...)`, which supabase-js surfaces as an
  // array of one row — normalise to a plain object so callers don't have
  // to remember the shape.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    participantsRemoved: Number(row?.participants_removed) || 0,
    roomsUpdated: Number(row?.rooms_updated) || 0,
    messagesDeleted: Number(row?.messages_deleted) || 0,
    emptyRoomsDeleted: Number(row?.empty_rooms_deleted) || 0
  };
}

export async function submitChatMessageReport({ roomId, messageId, reporterId, reporterNickname, reason }) {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`);
  await sb().from('chat_message_reports').insert({
    id,
    room_id: roomId,
    message_id: messageId,
    reporter_id: reporterId,
    reporter_nickname: String(reporterNickname || '').slice(0, 40),
    reason: String(reason || '').slice(0, 500),
    status: 'open',
    created_at: new Date().toISOString()
  });
}

export async function listChatMessageReports(limitN = 80) {
  const { data } = await sb().from('chat_message_reports').select('*').order('created_at', { ascending: false }).limit(limitN);
  return (data || []).map((r) => ({
    id: r.id,
    roomId: r.room_id,
    messageId: r.message_id,
    reporterId: r.reporter_id,
    reporterNickname: r.reporter_nickname,
    reason: r.reason,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at ? new Date(r.created_at) : null,
    processedAt: r.processed_at ? new Date(r.processed_at) : null
  }));
}

export async function updateChatReportStatus(reportId, status, notes = '') {
  await sb().from('chat_message_reports').update({
    status,
    notes: String(notes || '').slice(0, 500),
    processed_at: new Date().toISOString()
  }).eq('id', reportId);
}

export { buildMemberNicknamesForMentions, maybeNotifyMentions };

