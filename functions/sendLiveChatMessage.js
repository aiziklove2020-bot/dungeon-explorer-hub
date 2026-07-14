/**
 * Server-authoritative chat send: binds authorId to verified forum UID from custom token,
 * validates room/mute/slow/burst, writes message + member + room metadata in one transaction.
 * Mention notifications: notifyChatMentionsOnMessageCreate trigger on message create.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();
const ROOMS_COL = 'chatRooms';
const MAX_TEXT = 4000;
const BURST_WINDOW_MS = 10000;
const BURST_MAX_MSG = 8;
const MS_DAY = 24 * 60 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function computeExpireAtFromDays(retentionDays) {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 3;
  return Timestamp.fromMillis(Date.now() + days * MS_DAY);
}

function isMutedRecord(muteDoc, roomId) {
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

function canAccessRoom(room, forumUid, forumAdminClaim) {
  if (!room || room.closedAt) return false;
  if (room.type === 'main') return true;
  if (forumAdminClaim) return true;
  return Array.isArray(room.participantIds) && room.participantIds.includes(forumUid);
}

function roomStaff(room, forumUid, member, chatGlobalMod) {
  if (chatGlobalMod) return true;
  if (room.createdByForumUserId === forumUid) return true;
  if (member?.role === 'roomAdmin') return true;
  return false;
}

function canPost(room, forumUid, member, chatGlobalMod) {
  if (!room.adminsOnlyMode) return true;
  return roomStaff(room, forumUid, member, chatGlobalMod) || member?.hasVoice === true;
}

export const sendLiveChatMessage = onCall({ region: 'europe-west1' }, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Sign in for chat required');
  }
  const forumAdminClaim = request.auth.token.forumAdmin === true;
  const chatGlobalMod = request.auth.token.chatGlobalMod === true;

  const roomId = typeof request.data?.roomId === 'string' ? request.data.roomId.trim() : '';
  const textRaw = typeof request.data?.text === 'string' ? request.data.text : '';
  const replyToMessageIdRaw = request.data?.replyToMessageId;
  const replyToMessageId =
    replyToMessageIdRaw == null
      ? null
      : typeof replyToMessageIdRaw === 'string'
        ? replyToMessageIdRaw
        : null;
  const clientMessageIdRaw = typeof request.data?.clientMessageId === 'string'
    ? request.data.clientMessageId.trim()
    : '';

  if (!roomId) {
    throw new HttpsError('invalid-argument', 'roomId required');
  }

  const trimmed = textRaw.trim();
  if (!trimmed || trimmed.length > MAX_TEXT) {
    throw new HttpsError('invalid-argument', 'Empty or too long message');
  }

  let displayText = trimmed;
  let isAction = false;
  const slashMe = trimmed.match(/^\/me\s+([\s\S]*)$/i);
  if (slashMe) {
    isAction = true;
    displayText = (slashMe[1] || '').trim() || '…';
  }

  const roomRef = db.collection(ROOMS_COL).doc(roomId);
  const memberRef = roomRef.collection('members').doc(authUid);
  const messagesCol = roomRef.collection('messages');

  const safeClientMid =
    clientMessageIdRaw && /^[a-zA-Z0-9_-]{10,128}$/.test(clientMessageIdRaw)
      ? clientMessageIdRaw
      : null;

  let messageId = '';

  await db.runTransaction(async (txn) => {
    const [roomSnap, memberSnap] = await Promise.all([txn.get(roomRef), txn.get(memberRef)]);
    if (!roomSnap.exists) {
      throw new HttpsError('not-found', 'Room missing');
    }
    const room = roomSnap.data();
    if (!room || room.closedAt) {
      throw new HttpsError('failed-precondition', 'Room closed');
    }

    if (!canAccessRoom(room, authUid, forumAdminClaim)) {
      throw new HttpsError('permission-denied', 'No access');
    }

    if (!memberSnap.exists) {
      throw new HttpsError('failed-precondition', 'Join room first');
    }
    const member = memberSnap.data();

    if (member.observeMode === true) {
      throw new HttpsError('failed-precondition', 'Observe mode');
    }
    if (!canPost(room, authUid, member, chatGlobalMod)) {
      throw new HttpsError('permission-denied', 'Cannot post');
    }

    let retentionDays = 3;
    let globalChatMuted = false;
    const settingsSnap = await txn.get(db.doc('settings/liveChat'));
    const sd = settingsSnap.data();
    if (sd) {
      const rd = Number(sd.retentionDays);
      if (Number.isFinite(rd) && rd >= 1 && rd <= 365) retentionDays = Math.floor(rd);
      globalChatMuted = sd.globalChatMuted === true;
    }

    if (room.type === 'main' && globalChatMuted && !chatGlobalMod) {
      throw new HttpsError('permission-denied', 'Globally muted');
    }

    const muteRef = db.collection('chatMutes').doc(authUid);
    const muteSnap = await txn.get(muteRef);
    if (muteSnap.exists && isMutedRecord(muteSnap.data(), roomId)) {
      throw new HttpsError('permission-denied', 'Muted');
    }

    const slow = Number(room.slowModeSeconds) || 0;
    if (slow > 0 && !chatGlobalMod) {
      const last = member.lastMessageAt;
      const lastMs = last?.toMillis?.() || last?.seconds * 1000 || 0;
      if (lastMs && nowMs() - lastMs < slow * 1000) {
        throw new HttpsError('resource-exhausted', `Slow mode: ${slow}s`);
      }
    }

    if (!chatGlobalMod) {
      const prevTimes = Array.isArray(member.recentSendTimes) ? member.recentSendTimes : [];
      const recentBurst = prevTimes.filter((x) => typeof x === 'number' && nowMs() - x < BURST_WINDOW_MS);
      if (recentBurst.length >= BURST_MAX_MSG) {
        throw new HttpsError('resource-exhausted', 'Burst limit');
      }
    }

    const expireAt = computeExpireAtFromDays(retentionDays);
    let msgRef;
    if (safeClientMid) {
      msgRef = messagesCol.doc(safeClientMid);
      const dup = await txn.get(msgRef);
      if (dup.exists) {
        throw new HttpsError('already-exists', 'Duplicate clientMessageId');
      }
    } else {
      msgRef = messagesCol.doc();
    }
    messageId = msgRef.id;

    const authorForumSnap = await txn.get(db.collection('forumUsers').doc(authUid));
    const nick = String(authorForumSnap.data()?.nickname || '').slice(0, 40);

    const payload = {
      authorId: authUid,
      authorNickname: nick,
      text: displayText.slice(0, MAX_TEXT),
      createdAt: FieldValue.serverTimestamp(),
      deleted: false,
      expireAt,
      isSystem: false,
      isAction
    };
    if (replyToMessageId != null && replyToMessageId.length > 0) {
      payload.replyToMessageId = replyToMessageId;
    }
    txn.set(msgRef, payload);

    const prevBurst = Array.isArray(member.recentSendTimes) ? [...member.recentSendTimes] : [];
    const recentBurst = prevBurst.filter((x) => typeof x === 'number' && nowMs() - x < BURST_WINDOW_MS);
    recentBurst.push(nowMs());

    txn.update(memberRef, {
      lastMessageAt: Timestamp.now(),
      lastSeenAt: Timestamp.now(),
      recentSendTimes: recentBurst.slice(-25)
    });

    txn.update(roomRef, {
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  });

  return { messageId };
});
