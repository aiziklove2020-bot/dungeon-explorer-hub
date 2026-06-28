import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db as mainDb, dbChat } from '../config';
import { MAIN_ROOM_ID, ROOMS_COL, TYPING_TTL_MS } from './constants.js';
import { nowMs } from './helpers.js';

/** For nav “new activity” dot on main room. */
export function subscribeMainRoomLastActivity(callback) {
  const ref = doc(dbChat, ROOMS_COL, MAIN_ROOM_ID);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return callback(0);
      const la = snap.data()?.lastActivityAt;
      const ms = la?.toMillis?.() || la?.seconds * 1000 || 0;
      callback(ms);
    },
    () => callback(0)
  );
}

export function subscribeLiveChatSettings(callback) {
  const ref = doc(mainDb, 'settings', 'liveChat');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.data() || {};
      const rd = Number(data.retentionDays);
      const retentionDays = Number.isFinite(rd) && rd >= 1 && rd <= 365 ? Math.floor(rd) : 3;
      callback({
        retentionDays,
        globalChatMuted: data.globalChatMuted === true
      });
    },
    () => callback({ retentionDays: 3, globalChatMuted: false })
  );
}

export function subscribeMessages(roomId, onMessages, pageSize = 80) {
  if (!roomId) return () => {};
  const messagesRef = collection(dbChat, ROOMS_COL, roomId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAt = d.get('createdAt', { serverTimestamps: 'estimate' });
        return {
          id: d.id,
          ...data,
          createdAt: createdAt?.toDate?.() || createdAt || data.createdAt
        };
      });
      messages.reverse();
      onMessages(messages);
    },
    () => onMessages([])
  );
}

export function subscribeMembers(roomId, callback) {
  if (!roomId) return () => {};
  const col = collection(dbChat, ROOMS_COL, roomId, 'members');
  return onSnapshot(
    query(col),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(rows);
    },
    () => callback([])
  );
}

export function subscribeTyping(roomId, callback) {
  if (!roomId) return () => {};
  const col = collection(dbChat, ROOMS_COL, roomId, 'typing');
  return onSnapshot(col, (snap) => {
    const now = nowMs();
    const active = snap.docs
      .map((d) => ({ userId: d.id, ...d.data() }))
      .filter((t) => {
        const u = t.updatedAt?.toMillis?.() || t.updatedAt?.seconds * 1000 || 0;
        return now - u < TYPING_TTL_MS;
      });
    callback(active);
  });
}

export function subscribeReactions(roomId, messageId, callback) {
  if (!roomId || !messageId) return () => {};
  const col = collection(dbChat, ROOMS_COL, roomId, 'messages', messageId, 'reactions');
  return onSnapshot(col, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
