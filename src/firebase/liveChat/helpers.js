import { Timestamp } from 'firebase/firestore';
import { MS_DAY } from './constants.js';

export function nowMs() {
  return Date.now();
}

/** Outgoing composer text (`/me` action) — must match Supabase/Firestore send paths. */
export function normalizeOutgoingChatText(trimmed) {
  const slashMe = trimmed.match(/^\/me\s+([\s\S]*)$/i);
  if (slashMe) {
    return {
      displayText: (slashMe[1] || '').trim() || '…',
      isAction: true
    };
  }
  return { displayText: trimmed, isAction: false };
}

export function isMutedRecord(muteDoc, roomId) {
  if (!muteDoc) return false;
  const t = nowMs();
  const gu = muteDoc.globalUntil;
  if (gu?.toMillis && gu.toMillis() > t) return true;
  if (gu?.seconds && gu.seconds * 1000 > t) return true;
  const ru = muteDoc.roomMutes?.[roomId];
  if (ru?.toMillis && ru.toMillis() > t) return true;
  if (ru?.seconds && ru.seconds * 1000 > t) return true;
  return false;
}

export function computeExpireAtFromDays(retentionDays) {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 3;
  return Timestamp.fromMillis(Date.now() + days * MS_DAY);
}

export function toFirestoreTimestamp(c) {
  if (!c) return null;
  if (c instanceof Timestamp) return c;
  if (typeof c.toDate === 'function') return Timestamp.fromDate(c.toDate());
  if (c instanceof Date) return Timestamp.fromDate(c);
  if (c.seconds != null) return new Timestamp(c.seconds, c.nanoseconds || 0);
  return null;
}

export function canAccessRoom(room, forumUserId, isForumAdmin) {
  if (!room || room.closedAt) return false;
  // Channels are public like the main room — no invite list required.
  if (room.type === 'main' || room.type === 'channel') return true;
  if (!forumUserId) return false;
  if (isForumAdmin) return true;
  return (room.participantIds || []).includes(forumUserId);
}

export function skipClientChatMentions() {
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHAT_MENTIONS_SERVER_ONLY === 'true';
}
