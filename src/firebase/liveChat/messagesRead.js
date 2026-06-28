import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { dbChat } from '../config';
import { ROOMS_COL } from './constants.js';
import { toFirestoreTimestamp } from './helpers.js';

export async function loadOlderMessages(roomId, oldestMessage, pageSize = 40) {
  if (!roomId || !oldestMessage?.createdAt) return [];
  const messagesRef = collection(dbChat, ROOMS_COL, roomId, 'messages');
  const ts = toFirestoreTimestamp(oldestMessage.createdAt);
  if (!ts) return [];
  const q = query(
    messagesRef,
    orderBy('createdAt', 'desc'),
    startAfter(ts),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  const messages = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt
  }));
  messages.reverse();
  return messages;
}

export async function updateMemberLastRead(roomId, forumUserId, messageId) {
  if (!roomId || !forumUserId || !messageId) return;
  const ref = doc(dbChat, ROOMS_COL, roomId, 'members', forumUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, {
    lastReadMessageId: messageId,
    lastReadAt: Timestamp.now()
  });
}
