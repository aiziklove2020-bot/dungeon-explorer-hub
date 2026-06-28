import {
  collection, doc, getDocs, setDoc, updateDoc, query, where, Timestamp, writeBatch, onSnapshot
} from 'firebase/firestore';
import { db } from './config';

const COL = 'notifications';

export const createNotification = async ({
  userId,
  type,
  fromUserId,
  fromUserName,
  refId,
  refTitle,
  refMessageId,
  message
}) => {
  if (!userId || userId === fromUserId) return;
  const dupeQ = query(
    collection(db, COL),
    where('userId', '==', userId),
    where('type', '==', type),
    where('fromUserId', '==', fromUserId || null),
    where('refId', '==', refId || null),
    where('read', '==', false)
  );
  const existing = await getDocs(dupeQ);
  if (!existing.empty) return;
  const ref = doc(collection(db, COL));
  // refMessageId carries a *secondary* anchor inside refId — used by chat
  // mention notifications so the bell can deep-link to the exact message
  // (`/chat/<room>?m=<msg>`) and ChatRoomView's `?m=` flow can flash that
  // bubble. Optional and only ever passed for `chatMention`. We persist
  // it on the doc explicitly because previously it was destructured away
  // and silently dropped, defeating the deep-link.
  await setDoc(ref, {
    userId,
    type,
    fromUserId: fromUserId || null,
    fromUserName: fromUserName || '',
    refId: refId || null,
    refTitle: (refTitle || '').slice(0, 100),
    refMessageId: refMessageId ? String(refMessageId).slice(0, 64) : null,
    message: (message || '').slice(0, 200),
    read: false,
    createdAt: Timestamp.now()
  });
};

export const subscribeToNotifications = (userId, callback) => {
  if (!userId) return () => {};
  const q = query(collection(db, COL), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(items);
  }, (err) => {
    console.error('Notification listener error:', err);
  });
};

export const markNotificationRead = async (notifId) => {
  await updateDoc(doc(db, COL, notifId), { read: true });
};

export const markAllNotificationsRead = async (userId) => {
  if (!userId) return;
  const q = query(collection(db, COL), where('userId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  const BATCH_LIMIT = 500;
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const chunk = snap.docs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
};
