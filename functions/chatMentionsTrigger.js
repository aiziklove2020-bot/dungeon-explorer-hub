/**
 * Server-side chat mention notifications (Phase D).
 * Runs on the same Firebase project as Firestore `chatRooms` (default DB). If live chat uses a
 * dedicated Firebase project, deploy an equivalent trigger there with access to `forumUsers`.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const db = getFirestore();

async function createNotificationIfNew({
  userId,
  type,
  fromUserId,
  fromUserName,
  refId,
  refTitle,
  message
}) {
  if (!userId || userId === fromUserId) return;
  const col = db.collection('notifications');
  const existing = await col
    .where('userId', '==', userId)
    .where('type', '==', type)
    .where('fromUserId', '==', fromUserId ?? null)
    .where('refId', '==', refId ?? null)
    .where('read', '==', false)
    .limit(1)
    .get();
  if (!existing.empty) return;
  await col.add({
    userId,
    type,
    fromUserId: fromUserId ?? null,
    fromUserName: (fromUserName || '').slice(0, 40),
    refId: refId ?? null,
    refTitle: (refTitle || '').slice(0, 100),
    message: (message || '').slice(0, 200),
    read: false,
    createdAt: Timestamp.now()
  });
}

async function loadMemberNicknamesForRoom(roomId) {
  const memSnap = await db.collection('chatRooms').doc(roomId).collection('members').get();
  const rows = [];
  await Promise.all(
    memSnap.docs.map(async (d) => {
      try {
        const u = await db.collection('forumUsers').doc(d.id).get();
        const nickname = String(u.data()?.nickname || '').trim();
        if (nickname) rows.push({ id: d.id, nickname });
      } catch (e) {
        logger.warn('chatMention forumUsers read failed', d.id, e);
      }
    })
  );
  return rows;
}

async function notifyMentionsFromText(roomId, text, author) {
  if (!text?.includes('@')) return;
  const memberNicknames = await loadMemberNicknamesForRoom(roomId);
  if (!memberNicknames.length) return;
  const lower = text.toLowerCase();
  const authorForumUser = { id: author.id, nickname: author.nickname || '' };
  for (const { id, nickname } of memberNicknames) {
    if (!nickname || id === authorForumUser.id) continue;
    const needle = `@${nickname.toLowerCase()}`;
    if (!lower.includes(needle)) continue;
    try {
      await createNotificationIfNew({
        userId: id,
        type: 'chatMention',
        fromUserId: authorForumUser.id,
        fromUserName: authorForumUser.nickname || '',
        refId: roomId,
        refTitle: '',
        message: `${authorForumUser.nickname || 'משתמש'} הזכיר אותך בצ׳אט`
      });
    } catch (e) {
      logger.warn('chatMention notify failed', e);
    }
  }
}

export const notifyChatMentionsOnMessageCreate = onDocumentCreated(
  'chatRooms/{roomId}/messages/{messageId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    if (!data || data.isSystem || data.deleted) return;
    const text = data.text;
    const authorId = data.authorId;
    if (!text || authorId === 'system' || !authorId) return;
    const roomId = event.params.roomId;
    try {
      await notifyMentionsFromText(roomId, text, {
        id: authorId,
        nickname: data.authorNickname || ''
      });
    } catch (e) {
      logger.error('notifyChatMentionsOnMessageCreate', e);
    }
  }
);
