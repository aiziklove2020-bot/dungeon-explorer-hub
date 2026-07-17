import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { dbChat } from '../config';
import { MAIN_ROOM_ID, ROOMS_COL } from './constants.js';

export async function ensureMainRoom() {
  const ref = doc(dbChat, ROOMS_COL, MAIN_ROOM_ID);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: MAIN_ROOM_ID, ...snap.data() };
  const now = Timestamp.now();
  const data = {
    type: 'main',
    name: 'צ׳אט כללי',
    createdByForumUserId: 'system',
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    participantIds: [],
    closedAt: null,
    slowModeSeconds: 0
  };
  await setDoc(ref, data);
  return { id: MAIN_ROOM_ID, ...data };
}

/** Ensure a fixed-id public channel room exists (same shape as `ensureMainRoom`,
 *  generalized for named topic rooms with a caller-chosen id, e.g. 'bdsm'/'swap'). */
export async function ensureChannelRoom(roomId, name) {
  const ref = doc(dbChat, ROOMS_COL, roomId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: roomId, ...snap.data() };
  const now = Timestamp.now();
  const data = {
    type: 'channel',
    name,
    description: '',
    category: '',
    createdByForumUserId: 'system',
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    participantIds: [],
    closedAt: null,
    slowModeSeconds: 0
  };
  await setDoc(ref, data);
  return { id: roomId, ...data };
}

export async function getRoom(roomId) {
  if (!roomId) return null;
  const snap = await getDoc(doc(dbChat, ROOMS_COL, roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeRoom(roomId, callback) {
  if (!roomId) return () => {};
  return onSnapshot(
    doc(dbChat, ROOMS_COL, roomId),
    (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    () => callback(null)
  );
}

/** List recently active rooms (forum admin / lobby). */
export async function listActiveRooms(max = 60) {
  const q = query(collection(dbChat, ROOMS_COL), orderBy('lastActivityAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Private rooms the user participates in (denormalized participantIds). */
export async function listMyPrivateRooms(forumUserId) {
  if (!forumUserId) return [];
  const q = query(
    collection(dbChat, ROOMS_COL),
    where('type', '==', 'private'),
    where('participantIds', 'array-contains', forumUserId),
    limit(40)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Public channels — visible to every chat user, similar to the main room.
 * Sorted by `category` (so the lobby can render groups together) then by
 * recent activity.
 */
export async function listChannels(max = 80) {
  const q = query(
    collection(dbChat, ROOMS_COL),
    where('type', '==', 'channel'),
    orderBy('category'),
    orderBy('lastActivityAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.closedAt == null);
}
