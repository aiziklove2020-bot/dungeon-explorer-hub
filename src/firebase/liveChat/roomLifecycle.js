import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { dbChat } from '../config';
import { MAIN_ROOM_ID, ROOMS_COL } from './constants.js';
import { canAccessRoom } from './helpers.js';
import { ensureMainRoom, getRoom } from './roomQueries.js';
import { tryDeleteRoomIfEmpty } from './roomCleanup.js';

export async function joinRoom(roomId, forumUser, siteUser, opts = {}) {
  const { observeMode = false } = opts;
  if (roomId === MAIN_ROOM_ID) {
    await ensureMainRoom();
  }
  const room = await getRoom(roomId);
  if (!room) throw new Error('החדר לא נמצא');
  const isForumAdmin = forumUser?.role === 'forumAdmin';
  if (!canAccessRoom(room, forumUser?.id, isForumAdmin)) throw new Error('אין גישה לחדר');
  if (room.closedAt) throw new Error('החדר סגור');

  const memberRef = doc(dbChat, ROOMS_COL, roomId, 'members', forumUser.id);
  const existing = await getDoc(memberRef);
  const now = Timestamp.now();
  const isCreator = room.createdByForumUserId === forumUser.id;
  const allowObserve = isForumAdmin && room.type === 'private';
  const obs = allowObserve ? !!observeMode : false;

  if (!existing.exists()) {
    const role = isCreator ? 'roomAdmin' : 'member';
    await setDoc(memberRef, {
      joinedAt: now,
      lastSeenAt: now,
      role,
      observeMode: obs,
      roomTitle: '',
      lastMessageAt: null,
      hasVoice: false
    });
  } else {
    await updateDoc(memberRef, {
      lastSeenAt: now,
      observeMode: allowObserve ? obs : false
    });
  }

  const freshMember = await getDoc(memberRef);
  return { room, member: { id: freshMember.id, ...freshMember.data() } };
}

export async function updateObserveMode(roomId, forumUserId, observeMode, isForumAdmin) {
  if (!isForumAdmin) throw new Error('אין הרשאה');
  const ref = doc(dbChat, ROOMS_COL, roomId, 'members', forumUserId);
  await updateDoc(ref, { observeMode: !!observeMode });
}

export async function heartbeatMember(roomId, forumUserId) {
  if (!forumUserId) return;
  const ref = doc(dbChat, ROOMS_COL, roomId, 'members', forumUserId);
  try {
    await updateDoc(ref, { lastSeenAt: Timestamp.now() });
  } catch {
    // Missing member doc or rules/network failure — avoid getDoc read per tick.
  }
}

export async function leaveRoom(roomId, forumUserId) {
  if (!forumUserId) return;
  const memberRef = doc(dbChat, ROOMS_COL, roomId, 'members', forumUserId);
  await deleteDoc(memberRef);
  await tryDeleteRoomIfEmpty(roomId);
}
