import { doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { dbChat } from '../config';
import { ROOMS_COL } from './constants.js';

/** Per (roomId, userId) debounce so multiple typists in one room do not clobber each other. */
const typingPulseTimers = new Map();

function typingPulseKey(roomId, forumUserId) {
  return `${roomId}\0${forumUserId}`;
}

export function sendTypingPulse(roomId, forumUserId) {
  if (!roomId || !forumUserId) return;
  const key = typingPulseKey(roomId, forumUserId);
  const prev = typingPulseTimers.get(key);
  if (prev) clearTimeout(prev);
  const tid = setTimeout(() => {
    typingPulseTimers.delete(key);
    const ref = doc(dbChat, ROOMS_COL, roomId, 'typing', forumUserId);
    setDoc(
      ref,
      {
        updatedAt: serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + 120000)
      },
      { merge: true }
    ).catch(() => {});
  }, 80);
  typingPulseTimers.set(key, tid);
}

export async function clearTyping(roomId, forumUserId) {
  if (!roomId || !forumUserId) return;
  const key = typingPulseKey(roomId, forumUserId);
  const prev = typingPulseTimers.get(key);
  if (prev) {
    clearTimeout(prev);
    typingPulseTimers.delete(key);
  }
  await deleteDoc(doc(dbChat, ROOMS_COL, roomId, 'typing', forumUserId)).catch(() => {});
}
