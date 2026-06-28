import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { dbChat } from '../config';
import { canPostInRoom } from '../../utils/liveChatPermissions';
import { ROOMS_COL } from './constants.js';
import { getRoom } from './roomQueries.js';

export async function toggleReaction(roomId, messageId, forumUser, siteUser, emoji) {
  if (!forumUser?.id || !emoji) return;
  const room = await getRoom(roomId);
  if (!room?.id || room.closedAt) return;
  const memberSnap = await getDoc(doc(dbChat, ROOMS_COL, roomId, 'members', forumUser.id));
  const member = memberSnap.exists() ? { id: memberSnap.id, ...memberSnap.data() } : null;
  if (!member || member.observeMode) return;
  if (!canPostInRoom(room, forumUser, siteUser, member)) {
    throw new Error('במצב זה רק מנהלים ומי שקיבל קול יכולים להגיב');
  }
  const forumUserId = forumUser.id;
  const safeEmoji = [...emoji].slice(0, 4).join('') || '👍';
  const rid = `${forumUserId}_${safeEmoji}`.replace(/\//g, '');
  const ref = doc(dbChat, ROOMS_COL, roomId, 'messages', messageId, 'reactions', rid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      emoji: safeEmoji,
      userId: forumUserId,
      createdAt: serverTimestamp()
    });
  }
}
