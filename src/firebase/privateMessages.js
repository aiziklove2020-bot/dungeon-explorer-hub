import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';

const MSG_COL = 'privateMessages';
const CONV_COL = 'conversations';

const conversationId = (a, b) => [a, b].sort().join('_');

export const sendPrivateMessage = async (senderId, receiverId, senderName, content) => {
  if (!senderId || !receiverId || senderId === receiverId || !content?.trim()) return;

  const trimmed = content.trim().slice(0, 2000);
  const convId = conversationId(senderId, receiverId);
  const now = Timestamp.now();
  const msgRef = doc(collection(db, MSG_COL));
  const convRef = doc(db, CONV_COL, convId);

  const msgData = {
    conversationId: convId,
    senderId,
    receiverId,
    senderName: (senderName || '').slice(0, 50),
    content: trimmed,
    read: false,
    createdAt: now
  };

  await runTransaction(db, async (transaction) => {
    const convSnap = await transaction.get(convRef);
    transaction.set(msgRef, msgData);
    if (!convSnap.exists()) {
      transaction.set(convRef, {
        participants: [senderId, receiverId].sort(),
        lastMessage: trimmed.slice(0, 100),
        lastAt: now,
        lastSenderId: senderId,
        lastSenderName: (senderName || '').slice(0, 50),
        unreadBy: [receiverId],
        createdAt: now
      });
    } else {
      transaction.update(convRef, {
        lastMessage: trimmed.slice(0, 100),
        lastAt: now,
        lastSenderId: senderId,
        lastSenderName: (senderName || '').slice(0, 50),
        unreadBy: arrayUnion(receiverId)
      });
    }
  });
};

/**
 * Lists conversations: prefers denormalized `conversations` docs; merges legacy threads
 * that only exist in `privateMessages` (pre-migration data).
 */
export const getConversations = async (userId) => {
  if (!userId) return [];
  const q = query(collection(db, CONV_COL), where('participants', 'array-contains', userId));
  const snap = await getDocs(q);
  const byOtherId = new Map();
  snap.docs.forEach(d => {
    const data = d.data();
    const otherId = data.participants.find(p => p !== userId) || '';
    if (!otherId) return;
    byOtherId.set(otherId, {
      otherUserId: otherId,
      otherUserName: data.lastSenderId === userId ? '' : (data.lastSenderName || ''),
      lastMessage: data.lastMessage || '',
      lastAt: data.lastAt,
      unread: (data.unreadBy || []).includes(userId)
    });
  });

  const q1 = query(collection(db, MSG_COL), where('senderId', '==', userId));
  const q2 = query(collection(db, MSG_COL), where('receiverId', '==', userId));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const all = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() }));
  all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const legacyMap = new Map();
  all.forEach(msg => {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!otherId || byOtherId.has(otherId)) return;
    let conv = legacyMap.get(otherId);
    if (!conv) {
      legacyMap.set(otherId, {
        otherUserId: otherId,
        otherUserName: msg.senderId === userId ? '' : (msg.senderName || ''),
        lastMessage: msg.content,
        lastAt: msg.createdAt,
        unread: !msg.read && msg.receiverId === userId
      });
    } else {
      if (!conv.otherUserName && msg.senderId !== userId) conv.otherUserName = msg.senderName || '';
      if (!msg.read && msg.receiverId === userId) conv.unread = true;
    }
  });

  const merged = [...byOtherId.values(), ...legacyMap.values()];
  merged.sort((a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0));
  return merged;
};

export const getMessagesWithUser = async (userId, otherUserId) => {
  if (!userId || !otherUserId) return [];
  const convId = conversationId(userId, otherUserId);
  const q = query(collection(db, MSG_COL), where('conversationId', '==', convId));
  const snap = await getDocs(q);
  const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  return msgs;
};

export const markConversationRead = async (userId, otherUserId) => {
  if (!userId || !otherUserId) return;
  const convId = conversationId(userId, otherUserId);

  const convRef = doc(db, CONV_COL, convId);
  const convSnap = await getDoc(convRef);
  if (convSnap.exists()) {
    const data = convSnap.data();
    const unreadBy = (data.unreadBy || []).filter(id => id !== userId);
    await updateDoc(convRef, { unreadBy });
  }

  const q = query(
    collection(db, MSG_COL),
    where('conversationId', '==', convId),
    where('receiverId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
};

export const getUnreadMessageCount = async (userId) => {
  if (!userId) return 0;
  const q = query(collection(db, MSG_COL), where('receiverId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  return snap.size;
};
