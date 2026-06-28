import { doc, getDoc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { dbChat } from '../config';
import { getForumUserById } from '../forumUsers';
import {
  canGlobalModerate,
  isRoomStaff,
  canDemoteRoomAdmin,
  canToggleAdminsOnlyMode
} from '../../utils/liveChatPermissions';
import { ROOMS_COL } from './constants.js';
import { sendSystemLine } from './systemLine.js';

/**
 * Close a chat room.
 *
 * Allowed for:
 *   - global moderators / site admins (any room, incl. main),
 *   - room staff (creator + roomAdmin) on private rooms.
 *
 * The lobby's "create private room" limit for non-admins
 * (`atPrivateRoomCreateLimit` in ChatLobby) keys off open rooms the user
 * created. Without this expansion of permissions a regular user could
 * never reset that gate themselves.
 */
export async function closeRoom(roomId, forumUser, siteUser, memberDoc, room) {
  const allowed =
    canGlobalModerate(siteUser, forumUser) ||
    (room?.type === 'private' && isRoomStaff(room, forumUser, siteUser, memberDoc));
  if (!allowed) throw new Error('אין הרשאה');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    closedAt: Timestamp.now(),
    closedByForumUserId: forumUser?.id || null,
    closedBySiteAdmin: siteUser?.level === 'admin',
    updatedAt: Timestamp.now()
  });
}

export async function renameRoom(roomId, newName, forumUser, siteUser, memberDoc, room) {
  const can =
    canGlobalModerate(siteUser, forumUser) ||
    isRoomStaff(room, forumUser, siteUser, memberDoc);
  if (!can) throw new Error('אין הרשאה לשינוי שם');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    name: (newName || '').slice(0, 120),
    updatedAt: Timestamp.now()
  });
}

export async function setRoomDescription(roomId, newDescription, forumUser, siteUser, memberDoc, room) {
  const can =
    canGlobalModerate(siteUser, forumUser) ||
    isRoomStaff(room, forumUser, siteUser, memberDoc);
  if (!can) throw new Error('אין הרשאה לעריכת התיאור');
  const description = String(newDescription || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 200);
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    description,
    updatedAt: Timestamp.now()
  });
}

export async function setRoomCategory(roomId, newCategory, forumUser, siteUser, memberDoc, room) {
  const can =
    canGlobalModerate(siteUser, forumUser) ||
    isRoomStaff(room, forumUser, siteUser, memberDoc);
  if (!can) throw new Error('אין הרשאה לעריכת הקטגוריה');
  const category = String(newCategory || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 60);
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    category,
    updatedAt: Timestamp.now()
  });
}

export async function setMemberRoomTitle(
  roomId,
  targetForumUserId,
  title,
  forumUser,
  siteUser,
  actorMemberDoc,
  room
) {
  if (!isRoomStaff(room, forumUser, siteUser, actorMemberDoc)) throw new Error('אין הרשאה');
  const ref = doc(dbChat, ROOMS_COL, roomId, 'members', targetForumUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('משתמש לא בחדר');
  await updateDoc(ref, { roomTitle: (title || '').slice(0, 40) });
}

export async function setRoomSlowMode(roomId, seconds, forumUser, siteUser, memberDoc, room) {
  const sec = Math.min(3600, Math.max(0, Number(seconds) || 0));
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    slowModeSeconds: sec,
    updatedAt: Timestamp.now()
  });
}

export async function setRoomAdminsOnlyMode(roomId, enabled, forumUser, siteUser, memberDoc, room) {
  if (!room?.id) throw new Error('החדר לא נמצא');
  if (!canToggleAdminsOnlyMode(room, siteUser, forumUser, memberDoc)) {
    throw new Error('אין הרשאה לשינוי מצב חדר');
  }
  const next = !!enabled;
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    adminsOnlyMode: next,
    updatedAt: Timestamp.now()
  });
  await sendSystemLine(
    roomId,
    next
      ? 'מצב דיבור: רק מנהלים ומי שקיבל קול יכולים לכתוב'
      : 'מצב דיבור: כולם יכולים לכתוב'
  );
}

export async function setMemberVoice(
  roomId,
  targetForumUserId,
  hasVoice,
  forumUser,
  siteUser,
  actorMemberDoc,
  room
) {
  if (!isRoomStaff(room, forumUser, siteUser, actorMemberDoc)) throw new Error('אין הרשאה');
  if (!targetForumUserId) throw new Error('חסר משתמש');
  const ref = doc(dbChat, ROOMS_COL, roomId, 'members', targetForumUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('משתמש לא בחדר');
  await updateDoc(ref, { hasVoice: !!hasVoice });
}

export async function promoteRoomAdmin(
  roomId,
  targetForumUserId,
  promote,
  forumUser,
  siteUser,
  actorMemberDoc,
  room
) {
  if (!isRoomStaff(room, forumUser, siteUser, actorMemberDoc)) throw new Error('אין הרשאה');
  const targetUser = await getForumUserById(targetForumUserId);
  if (targetUser?.role === 'forumAdmin') throw new Error('לא ניתן לשנות תפקיד לאדמין פורום');

  const ref = doc(dbChat, ROOMS_COL, roomId, 'members', targetForumUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('משתמש לא בחדר');
  const currentRole = snap.data()?.role;
  if (!promote && currentRole === 'roomAdmin') {
    if (!canDemoteRoomAdmin(room, siteUser, forumUser, targetForumUserId)) {
      throw new Error('לא ניתן להסיר את מנהל/ת החדר הראשיים');
    }
  }
  await updateDoc(ref, { role: promote ? 'roomAdmin' : 'member' });
}

export async function pinMessage(roomId, messageId, forumUser, siteUser, memberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    pinnedMessageId: messageId || null,
    pinnedByForumUserId: messageId ? forumUser?.id || null : null,
    pinnedAt: messageId ? Timestamp.now() : null,
    updatedAt: Timestamp.now()
  });
}

export async function softDeleteMessage(roomId, messageId, forumUser, siteUser, memberDoc, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberDoc)) throw new Error('אין הרשאה');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId, 'messages', messageId), {
    deleted: true,
    deletedBy: forumUser?.id || siteUser?.id || 'admin',
    deletedAt: Timestamp.now()
  });
}

export async function setRoomLinkedTopic(roomId, topicId, forumUser, siteUser, memberSelf, room) {
  if (!isRoomStaff(room, forumUser, siteUser, memberSelf)) throw new Error('אין הרשאה');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    linkedTopicId: topicId ? String(topicId).slice(0, 120) : deleteField(),
    updatedAt: Timestamp.now()
  });
}
