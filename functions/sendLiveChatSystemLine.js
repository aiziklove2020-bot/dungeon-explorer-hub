/**
 * Writes a moderation/system message (isSystem) using Admin privileges.
 * Prefer this over client-side systemLine writes once rules deny client isSystem creates.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();
const ROOMS_COL = 'chatRooms';
const MS_DAY = 24 * 60 * 60 * 1000;

function computeExpireAtFromDays(retentionDays) {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 3;
  return Timestamp.fromMillis(Date.now() + days * MS_DAY);
}

function isForumRoomStaff(room, forumUid, member) {
  if (!room || !forumUid) return false;
  if (room.createdByForumUserId === forumUid) return true;
  if (member?.role === 'roomAdmin') return true;
  return false;
}

export const sendLiveChatSystemLine = onCall({ region: 'europe-west1' }, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Sign in for chat required');
  }
  const chatGlobalMod = request.auth.token.chatGlobalMod === true;
  const forumAdmin = request.auth.token.forumAdmin === true;

  const roomId = typeof request.data?.roomId === 'string' ? request.data.roomId.trim() : '';
  const textRaw = typeof request.data?.text === 'string' ? request.data.text : '';
  const text = textRaw.trim().slice(0, 500);
  if (!roomId || !text) {
    throw new HttpsError('invalid-argument', 'roomId and text required');
  }

  const roomRef = db.collection(ROOMS_COL).doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    throw new HttpsError('not-found', 'Room missing');
  }
  const room = roomSnap.data();
  if (room.closedAt) {
    throw new HttpsError('failed-precondition', 'Room closed');
  }

  const memberSnap = await roomRef.collection('members').doc(authUid).get();
  const member = memberSnap.exists ? memberSnap.data() : null;

  const staff = isForumRoomStaff(room, authUid, member);
  if (!chatGlobalMod && !forumAdmin && !staff) {
    throw new HttpsError('permission-denied', 'No permission for system line');
  }

  let retentionDays = 3;
  const settingsSnap = await db.doc('settings/liveChat').get();
  const sd = settingsSnap.data();
  if (sd) {
    const rd = Number(sd.retentionDays);
    if (Number.isFinite(rd) && rd >= 1 && rd <= 365) retentionDays = Math.floor(rd);
  }
  const expireAt = computeExpireAtFromDays(retentionDays);

  const batch = db.batch();
  const msgRef = roomRef.collection('messages').doc();
  batch.set(msgRef, {
    authorId: 'system',
    authorNickname: '',
    text,
    createdAt: FieldValue.serverTimestamp(),
    deleted: false,
    expireAt,
    isSystem: true,
    isAction: false
  });
  batch.update(roomRef, {
    lastActivityAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  await batch.commit();
  return { messageId: msgRef.id };
});
