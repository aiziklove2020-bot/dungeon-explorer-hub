import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { dbChat, getChatAuth, FUNCTIONS_REGION } from '../config';
import { getLiveChatSettings } from '../settings';
import { getForumUsersByIds } from '../forumUsers';
import { canGlobalModerate, canPostInRoom } from '../../utils/liveChatPermissions';
import {
  nowMs,
  isMutedRecord,
  computeExpireAtFromDays,
  skipClientChatMentions,
  canAccessRoom
} from './helpers.js';
import { getChatMute } from './mutes.js';
import { maybeNotifyMentions } from './mentions.js';
import { getRoom } from './roomQueries.js';
import { ROOMS_COL, MAX_TEXT, BURST_WINDOW_MS, BURST_MAX_MSG } from './constants.js';

function useLegacyDirectSend() {
  return (
    typeof import.meta !== 'undefined' &&
    String(import.meta.env?.VITE_CHAT_CALLABLE_SEND ?? 'true').toLowerCase() === 'false'
  );
}

function allowDevCallableFallback() {
  return (
    typeof import.meta !== 'undefined' &&
    import.meta.env?.DEV &&
    String(import.meta.env?.VITE_CHAT_CALLABLE_FALLBACK ?? '').toLowerCase() === 'true'
  );
}

function callableClientMessageId() {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return null;
  return crypto.randomUUID().replace(/-/g, '').slice(0, 72);
}

async function sendViaCallable(roomId, text, opts = {}) {
  const { replyToMessageId = null, preassignedMessageId: presetMid = null } = opts;
  if (!getChatAuth()?.currentUser) {
    throw new Error('יש להתחבר מחדש לפורום/צ׳אט כדי לשלוח הודעה');
  }
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length > MAX_TEXT) throw new Error('הודעה ריקה או ארוכה מדי');

  const sendFn = httpsCallable(getFunctions(app, FUNCTIONS_REGION), 'sendLiveChatMessage');
  const stripped =
    typeof presetMid === 'string' && presetMid.trim().length >= 10
      ? presetMid.replace(/-/g, '').slice(0, 72)
      : '';
  const fromPreset =
    stripped.length >= 10 && /^[a-zA-Z0-9_]{10,128}$/.test(stripped) ? stripped : null;
  const clientMessageId = fromPreset || callableClientMessageId();
  try {
    const result = await sendFn({
      roomId,
      text: trimmed,
      replyToMessageId: replyToMessageId || null,
      ...(clientMessageId && clientMessageId.length >= 10 ? { clientMessageId } : {})
    });
    const mid = result.data?.messageId;
    if (typeof mid === 'string' && mid) return mid;
    throw new Error('שגיאת שליחת הודעה');
  } catch (e) {
    const msg = e?.message || '';
    const code = e?.code || '';
    if (code.includes('already-exists') || msg.includes('already-exists')) {
      throw new Error('ההודעה כבר נשלחה');
    }
    if (code.includes('permission-denied') || msg.includes('permission')) {
      throw new Error('אין הרשאה לשלוח');
    }
    if (msg) throw new Error(msg);
    throw new Error('שגיאת שליחת הודעה');
  }
}

/** Direct Firestore write (VITE_CHAT_CALLABLE_SEND=false). */
async function sendChatMessageDirect(roomId, forumUser, siteUser, text, opts = {}) {
  const {
    replyToMessageId = null,
    memberNicknamesForMentions: prebuiltMentionRows = null,
    cachedLiveChatSettings = null,
    expireAt: expireAtOpt = null,
    preassignedMessageId: presetMid = null
  } = opts;
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length > MAX_TEXT) throw new Error('הודעה ריקה או ארוכה מדי');

  const room = await getRoom(roomId);
  if (!room?.id || room.closedAt) throw new Error('החדר סגור');
  const memberSnap = await getDoc(doc(dbChat, ROOMS_COL, roomId, 'members', forumUser.id));
  const member = memberSnap.exists() ? { id: memberSnap.id, ...memberSnap.data() } : null;
  if (!member) throw new Error('יש להצטרף לחדר');
  if (member.observeMode) throw new Error('מצב צפייה — עבור ל״נכנס״ כדי לכתוב');
  if (!canPostInRoom(room, forumUser, siteUser, member)) {
    throw new Error('במצב זה רק מנהלים ומי שקיבל קול יכולים לכתוב');
  }

  const isForumAdmin = forumUser.role === 'forumAdmin';
  if (!canAccessRoom(room, forumUser.id, isForumAdmin)) throw new Error('אין גישה');

  let retentionDays = cachedLiveChatSettings?.retentionDays;
  let globalChatMuted = cachedLiveChatSettings?.globalChatMuted;
  if (retentionDays == null || globalChatMuted === undefined) {
    const settings = await getLiveChatSettings();
    if (retentionDays == null) retentionDays = settings.retentionDays;
    if (globalChatMuted === undefined) globalChatMuted = settings.globalChatMuted;
  }
  if (room.type === 'main' && globalChatMuted && !canGlobalModerate(siteUser, forumUser)) {
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
    const last = member.lastMessageAt;
    const lastMs = last?.toMillis?.() || last?.seconds * 1000 || 0;
    if (lastMs && nowMs() - lastMs < slow * 1000) {
      throw new Error(`המתן ${slow} שניות בין הודעות`);
    }
  }

  let displayText = trimmed;
  let isAction = false;
  const slashMe = trimmed.match(/^\/me\s+([\s\S]*)$/i);
  if (slashMe) {
    isAction = true;
    displayText = (slashMe[1] || '').trim() || '…';
  }

  if (!canGlobalModerate(siteUser, forumUser)) {
    const prevTimes = Array.isArray(member.recentSendTimes) ? member.recentSendTimes : [];
    const recentBurst = prevTimes.filter((x) => typeof x === 'number' && nowMs() - x < BURST_WINDOW_MS);
    if (recentBurst.length >= BURST_MAX_MSG) {
      throw new Error('יותר מדי הודעות בזמן קצר — המתן רגע');
    }
  }

  const expireAt =
    expireAtOpt instanceof Timestamp ? expireAtOpt : computeExpireAtFromDays(retentionDays);
  const preset =
    typeof presetMid === 'string' && presetMid.trim().length >= 10
      ? presetMid.trim().slice(0, 128)
      : null;
  const msgRef = preset
    ? doc(dbChat, ROOMS_COL, roomId, 'messages', preset)
    : doc(collection(dbChat, ROOMS_COL, roomId, 'messages'));
  const msgPayload = {
    authorId: forumUser.id,
    authorNickname: (forumUser.nickname || '').slice(0, 40),
    text: displayText,
    createdAt: serverTimestamp(),
    deleted: false,
    expireAt,
    isSystem: false,
    isAction: !!isAction
  };
  if (replyToMessageId) {
    msgPayload.replyToMessageId = replyToMessageId;
  }
  await setDoc(msgRef, msgPayload);

  const memberRef = doc(dbChat, ROOMS_COL, roomId, 'members', forumUser.id);
  const prevTimes = Array.isArray(member.recentSendTimes) ? member.recentSendTimes : [];
  const recentBurst = prevTimes.filter((x) => typeof x === 'number' && nowMs() - x < BURST_WINDOW_MS);
  recentBurst.push(nowMs());

  await updateDoc(memberRef, {
    lastMessageAt: Timestamp.now(),
    lastSeenAt: Timestamp.now(),
    recentSendTimes: recentBurst.slice(-25)
  });

  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    lastActivityAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  let nickRows = Array.isArray(prebuiltMentionRows) ? prebuiltMentionRows : null;
  if (!nickRows?.length) {
    const membersSnap = await getDocs(collection(dbChat, ROOMS_COL, roomId, 'members'));
    const ids = membersSnap.docs.map((d) => d.id).filter(Boolean);
    const fu = await getForumUsersByIds(ids);
    nickRows = Object.values(fu)
      .filter((u) => u?.nickname)
      .map((u) => ({ id: u.id, nickname: String(u.nickname).trim() }));
  }
  if (!skipClientChatMentions()) {
    await maybeNotifyMentions(roomId, displayText, forumUser, nickRows, {
      roomName: room?.name || '',
      messageId: msgRef.id
    });
  }

  return msgRef.id;
}

export async function sendChatMessage(roomId, forumUser, siteUser, text, opts = {}) {
  if (useLegacyDirectSend()) {
    return sendChatMessageDirect(roomId, forumUser, siteUser, text, opts);
  }
  try {
    return await sendViaCallable(roomId, text, opts);
  } catch (e) {
    if (allowDevCallableFallback()) {
      console.warn('[chat] Callable failed, legacy direct send (DEV fallback)', e);
      return sendChatMessageDirect(roomId, forumUser, siteUser, text, opts);
    }
    throw e;
  }
}
