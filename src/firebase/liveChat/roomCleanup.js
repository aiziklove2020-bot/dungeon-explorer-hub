import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  limit,
  writeBatch
} from 'firebase/firestore';
import { dbChat } from '../config';
import { ROOMS_COL } from './constants.js';
import { getRoom } from './roomQueries.js';

async function deleteRoomAndMessages(roomId) {
  const batchDeleteCol = async (colRef, maxRounds = 50) => {
    for (let i = 0; i < maxRounds; i += 1) {
      const snap = await getDocs(query(colRef, limit(400)));
      if (snap.empty) return;
      const batch = writeBatch(dbChat);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  };

  const messagesCol = collection(dbChat, ROOMS_COL, roomId, 'messages');
  await batchDeleteCol(messagesCol);

  const typingCol = collection(dbChat, ROOMS_COL, roomId, 'typing');
  const typingSnap = await getDocs(typingCol);
  if (!typingSnap.empty) {
    const b = writeBatch(dbChat);
    typingSnap.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }

  await deleteDoc(doc(dbChat, ROOMS_COL, roomId));
}

export async function tryDeleteRoomIfEmpty(roomId) {
  const membersRef = collection(dbChat, ROOMS_COL, roomId, 'members');
  const snap = await getDocs(query(membersRef, limit(1)));
  if (!snap.empty) return;
  const room = await getRoom(roomId);
  if (!room || room.type === 'main') return;
  await deleteRoomAndMessages(roomId);
}
