import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  Timestamp,
  deleteField,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { dbChat } from '../config';
import { getForumUserById } from '../forumUsers';
import { createNotification } from '../notifications';
import {
  canGlobalModerate,
  isRoomStaff,
  canInviteToPrivateRoom
} from '../../utils/liveChatPermissions';
import { ROOMS_COL, MAX_INVITE_IDS } from './constants.js';
import { listMyPrivateRooms } from './roomQueries.js';
import { joinRoom } from './roomLifecycle.js';
import { sendSystemLine } from './systemLine.js';
import { tryDeleteRoomIfEmpty } from './roomCleanup.js';

/**
 * Private rooms where the current forum user may invite others (creator or roomAdmin).
 */
export async function listPrivateRoomsWhereCanInvite(forumUser) {
  if (!forumUser?.id) return [];
  const mine = await listMyPrivateRooms(forumUser.id);
  const open = mine.filter((r) => r.type === 'private' && !r.closedAt);
  const out = [];
  for (const r of open) {
    const memSnap = await getDoc(doc(dbChat, ROOMS_COL, r.id, 'members', forumUser.id));
    if (!memSnap.exists()) continue;
    const memberSelf = { id: memSnap.id, ...memSnap.data() };
    if (canInviteToPrivateRoom(r, forumUser, memberSelf)) {
      out.push({ roomId: r.id, room: r, memberSelf });
    }
  }
  return out;
}

/**
 * @param {{ creatorIsForumAdmin?: boolean, inviterNickname?: string }} [options]
 *   - `creatorIsForumAdmin`: forum admins may create multiple private rooms
 *   - `inviterNickname`: surfaced in the chatRoomInvite notification each
 *     invitee receives, so they see "X invited you" rather than just an id.
 */
export async function createPrivateRoom(creatorId, name, invitedForumUserIds, options = {}) {
  const { creatorIsForumAdmin = false, inviterNickname = '', description = '' } = options;
  if (!creatorId) throw new Error('לא מחובר');
  if (!creatorIsForumAdmin) {
    const existingQ = query(
      collection(dbChat, ROOMS_COL),
      where('type', '==', 'private'),
      where('createdByForumUserId', '==', creatorId),
      limit(20)
    );
    const existingSnap = await getDocs(existingQ);
    const openAsCreator = existingSnap.docs.filter((d) => {
      const c = d.data()?.closedAt;
      return c == null;
    });
    if (openAsCreator.length >= 1) {
      throw new Error(
        'ניתן לנהל חדר פרטי אחד פעיל בכל זמן. סגרו חדר קיים כדי ליצור חדש, או פנו למנהל פורום.'
      );
    }
  }
  const participants = [...new Set([creatorId, ...(invitedForumUserIds || [])])];
  const now = Timestamp.now();
  const roomRef = doc(collection(dbChat, ROOMS_COL));
  const payload = {
    type: 'private',
    name: (name || 'חדר פרטי').slice(0, 120),
    description: String(description || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200),
    createdByForumUserId: creatorId,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    participantIds: participants,
    closedAt: null,
    slowModeSeconds: 0
  };
  await setDoc(roomRef, payload);
  // Notify each invited user — same Accept/Decline UX as
  // inviteForumUsersToPrivateRoom. Best-effort; failures don't roll back
  // the room (the room exists and they're already on participantIds).
  const otherIds = participants.filter((uid) => uid !== creatorId);
  if (otherIds.length > 0) {
    const trimmedName = String(payload.name || '').slice(0, 100);
    const trimmedNick = String(inviterNickname || '').slice(0, 40);
    for (const uid of otherIds) {
      createNotification({
        userId: uid,
        type: 'chatRoomInvite',
        fromUserId: creatorId,
        fromUserName: trimmedNick,
        refId: roomRef.id,
        refTitle: trimmedName,
        message: 'הוזמנת לחדר צ׳אט פרטי'
      }).catch(() => {});
    }
  }
  return { id: roomRef.id, ...payload };
}

/**
 * Create a public chat channel (like the main room, but plural and grouped
 * by category). Forum-admin only on the client; the server-side guarantee
 * lives in firestore.chat.rules.
 */
export async function createChannel(creatorId, name, options = {}) {
  const { creatorIsForumAdmin = false, description = '', category = '' } = options;
  if (!creatorId) throw new Error('לא מחובר');
  if (!creatorIsForumAdmin) throw new Error('רק מנהל פורום יכול ליצור ערוץ');
  const trimmedName = String(name || '').trim().slice(0, 120);
  if (!trimmedName) throw new Error('שם ערוץ חסר');
  const trimmedDescription = String(description || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  const trimmedCategory = String(category || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 60);
  const now = Timestamp.now();
  const roomRef = doc(collection(dbChat, ROOMS_COL));
  const payload = {
    type: 'channel',
    name: trimmedName,
    description: trimmedDescription,
    category: trimmedCategory,
    createdByForumUserId: creatorId,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    participantIds: [],
    closedAt: null,
    slowModeSeconds: 0
  };
  await setDoc(roomRef, payload);
  return { id: roomRef.id, ...payload };
}

export async function inviteForumUsersToPrivateRoom(
  roomId,
  invitedForumUserIds,
  forumUser,
  memberDoc,
  room
) {
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  if (!room || room.type !== 'private') throw new Error('הזמנה זמינה רק בחדר פרטי');
  if (!canInviteToPrivateRoom(room, forumUser, memberDoc)) {
    throw new Error('אין הרשאה להזמין — רק יוצר החדר או מנהל חדר');
  }
  const raw = [...new Set((invitedForumUserIds || []).filter(Boolean))].filter((id) => id !== forumUser.id);
  if (raw.length === 0) throw new Error('לא נבחרו משתמשים');
  const toAdd = raw.slice(0, MAX_INVITE_IDS);
  const existing = new Set(room.participantIds || []);
  const newIds = toAdd.filter((id) => !existing.has(id));
  if (newIds.length === 0) throw new Error('כל הנבחרים כבר משתתפים בחדר');
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    participantIds: arrayUnion(...newIds),
    updatedAt: Timestamp.now(),
    lastActivityAt: Timestamp.now()
  });
  const actorNick = (forumUser.nickname || '').slice(0, 40);
  const labels = await Promise.all(newIds.map((id) => getForumUserById(id)));
  const names = labels.map((u, i) => (u?.nickname || newIds[i]).slice(0, 40)).join(', ');
  const line = `${actorNick} הזמין/ה את ${names} לחדר`;
  await sendSystemLine(roomId, line.slice(0, 500));
  for (const uid of newIds) {
    createNotification({
      userId: uid,
      type: 'chatRoomInvite',
      fromUserId: forumUser.id,
      fromUserName: actorNick,
      refId: roomId,
      refTitle: (room.name || '').slice(0, 100),
      message: 'הוזמנת לחדר צ׳אט פרטי'
    }).catch(() => {});
  }
  return newIds.length;
}

/**
 * Decline a private-room invite. Best-effort: deletes the invitee's
 * `members/{uid}` doc and `arrayRemove`s them from `participantIds`.
 *
 * Note: Firestore rules currently allow non-staff updates only when
 * `affectedOnly(['lastActivityAt', 'updatedAt'])`, so the participantIds
 * mutation will fail under default rules — wrap it in try/catch so the
 * user still leaves the participants subcollection (which they own).
 * The Supabase backend is the production path and uses a definer RPC
 * that handles both atomically.
 */
export async function declineRoomInvite(roomId, forumUser) {
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  const id = String(roomId || '').trim();
  if (!id) throw new Error('חסר מזהה חדר');
  try {
    await deleteDoc(doc(dbChat, ROOMS_COL, id, 'members', forumUser.id));
  } catch {
    // Member doc may not exist yet (e.g. invite never auto-joined them).
  }
  try {
    await updateDoc(doc(dbChat, ROOMS_COL, id), {
      participantIds: arrayRemove(forumUser.id),
      updatedAt: Timestamp.now()
    });
  } catch {
    // Update may be blocked by rules for non-staff; the member-doc deletion
    // above already removed read-access via the participants check, so the
    // user effectively can't see the room anymore. Inviter still gets the
    // back-notification from the caller side.
  }
}

function randomInviteToken() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

export async function setPrivateRoomInviteLink(roomId, enabled, forumUser, memberSelf, room) {
  if (!room || room.type !== 'private') throw new Error('קישור הצטרפות זמין רק בערוץ פרטי');
  if (!canInviteToPrivateRoom(room, forumUser, memberSelf)) throw new Error('אין הרשאה לניהול קישור');
  const ref = doc(dbChat, ROOMS_COL, roomId);
  if (enabled) {
    const inviteToken = randomInviteToken();
    await updateDoc(ref, {
      inviteLinkEnabled: true,
      inviteToken,
      updatedAt: Timestamp.now()
    });
    return { inviteToken };
  }
  await updateDoc(ref, {
    inviteLinkEnabled: false,
    inviteToken: deleteField(),
    updatedAt: Timestamp.now()
  });
  return { inviteToken: null };
}

export async function regeneratePrivateRoomInviteToken(roomId, forumUser, memberSelf, room) {
  if (!room || room.type !== 'private') throw new Error('רק בערוץ פרטי');
  if (!canInviteToPrivateRoom(room, forumUser, memberSelf)) throw new Error('אין הרשאה');
  const inviteToken = randomInviteToken();
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    inviteLinkEnabled: true,
    inviteToken,
    updatedAt: Timestamp.now()
  });
  return { inviteToken };
}

export async function findPrivateRoomByInviteToken(token) {
  const t = (token || '').trim();
  if (t.length < 16) return null;
  const q = query(collection(dbChat, ROOMS_COL), where('inviteToken', '==', t), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = { id: d.id, ...d.data() };
  if (data.type !== 'private') return null;
  return data;
}

/** Add current user to participantIds and join the room. Requires valid active invite token. */
export async function joinPrivateRoomViaInvite(token, forumUser, siteUser, opts = {}) {
  if (!forumUser?.id) throw new Error('יש להתחבר לפורום');
  const t = (token || '').trim();
  const room = await findPrivateRoomByInviteToken(t);
  if (!room?.id) throw new Error('קישור לא תקף או שפג תוקף');
  if (room.closedAt) throw new Error('הערוץ סגור');
  if (!room.inviteLinkEnabled || room.inviteToken !== t) throw new Error('קישור ההצטרפות אינו פעיל');
  await updateDoc(doc(dbChat, ROOMS_COL, room.id), {
    participantIds: arrayUnion(forumUser.id),
    updatedAt: Timestamp.now(),
    lastActivityAt: Timestamp.now()
  });
  return joinRoom(room.id, forumUser, siteUser, opts);
}

export async function removeParticipantFromPrivateRoom(
  roomId,
  targetForumUserId,
  forumUser,
  siteUser,
  memberSelf,
  room
) {
  if (!forumUser?.id) throw new Error('נדרש חיבור לפורום');
  if (!targetForumUserId) throw new Error('חסר משתמש');
  if (targetForumUserId === forumUser.id) {
    throw new Error('להסרת עצמך השתמש ב״יציאה״ מהחדר');
  }
  if (!room || room.type !== 'private') throw new Error('רק בחדר פרטי');
  if (!isRoomStaff(room, forumUser, siteUser, memberSelf)) throw new Error('אין הרשאה להסיר משתתפים');
  const ownerId = room.createdByForumUserId;
  if (ownerId && targetForumUserId === ownerId && !canGlobalModerate(siteUser, forumUser)) {
    throw new Error('לא ניתן להסיר את יוצר החדר');
  }

  const participants = room.participantIds || [];
  const inParticipants = participants.includes(targetForumUserId);
  const memberRef = doc(dbChat, ROOMS_COL, roomId, 'members', targetForumUserId);
  const memSnap = await getDoc(memberRef);
  if (!inParticipants && !memSnap.exists()) throw new Error('משתמש זה לא משויך לחדר');

  const roomRef = doc(dbChat, ROOMS_COL, roomId);
  if (inParticipants) {
    await updateDoc(roomRef, {
      participantIds: arrayRemove(targetForumUserId),
      updatedAt: Timestamp.now()
    });
  }
  if (memSnap.exists()) {
    await deleteDoc(memberRef);
  }

  const actorNick = (forumUser.nickname || '').slice(0, 40);
  const targetUser = await getForumUserById(targetForumUserId);
  const targetNick = (targetUser?.nickname || targetForumUserId).slice(0, 40);
  await sendSystemLine(roomId, `${actorNick} הסיר/ה את ${targetNick} מהחדר`.slice(0, 500));

  await tryDeleteRoomIfEmpty(roomId);
}
