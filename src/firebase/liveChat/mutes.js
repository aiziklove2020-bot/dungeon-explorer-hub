import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  deleteField
} from 'firebase/firestore';
import { dbChat } from '../config';
import { MUTES_COL } from './constants.js';
import { canGlobalModerate, isRoomStaff } from '../../utils/liveChatPermissions';

export async function getChatMute(forumUserId) {
  if (!forumUserId) return null;
  const ref = doc(dbChat, MUTES_COL, forumUserId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Subscribe to mute doc for current user (moderation UI updates others). */
export function subscribeChatMute(forumUserId, callback) {
  if (!forumUserId) return () => {};
  return onSnapshot(doc(dbChat, MUTES_COL, forumUserId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function setChatMute(
  targetForumUserId,
  { globalHours = 0, roomId = null, roomHours = 0 },
  moderatorForumUser,
  siteUser,
  room = null,
  actorMemberDoc = null
) {
  const canGlobal = canGlobalModerate(siteUser, moderatorForumUser);
  const canRoom =
    room && roomId && isRoomStaff(room, moderatorForumUser, siteUser, actorMemberDoc);
  if (!canGlobal && !canRoom) throw new Error('אין הרשאה');
  if (!canGlobal && (globalHours > 0 || !roomId || roomHours <= 0)) {
    throw new Error('אין הרשאה להשתקה גלובלית');
  }
  const ref = doc(dbChat, MUTES_COL, targetForumUserId);
  const snap = await getDoc(ref);
  const now = Date.now();
  const updates = {
    updatedAt: Timestamp.now(),
    updatedBy: moderatorForumUser?.id || null
  };
  if (canGlobal && globalHours > 0) {
    updates.globalUntil = Timestamp.fromMillis(now + globalHours * 3600 * 1000);
  }
  if (roomId && roomHours > 0) {
    const ru = { ...(snap.exists() ? snap.data().roomMutes || {} : {}) };
    ru[roomId] = Timestamp.fromMillis(now + roomHours * 3600 * 1000);
    updates.roomMutes = ru;
  }
  await setDoc(ref, updates, { merge: true });
}

/** Removes entire mute doc — global mods only (dangerous for partial clears). */
export async function clearChatMute(targetForumUserId, siteUser, forumUser) {
  if (!canGlobalModerate(siteUser, forumUser)) throw new Error('אין הרשאה');
  await deleteDoc(doc(dbChat, MUTES_COL, targetForumUserId));
}

export async function clearRoomMuteForUser(
  targetForumUserId,
  roomId,
  moderatorForumUser,
  siteUser,
  room,
  actorMemberDoc
) {
  if (!isRoomStaff(room, moderatorForumUser, siteUser, actorMemberDoc)) {
    throw new Error('אין הרשאה');
  }
  const ref = doc(dbChat, MUTES_COL, targetForumUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, {
    [`roomMutes.${roomId}`]: deleteField(),
    updatedAt: Timestamp.now()
  });
}
