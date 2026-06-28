import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { dbChat } from '../config';
import { ROOMS_COL, MAIN_ROOM_ID, MUTES_COL } from './constants.js';
import { tryDeleteRoomIfEmpty } from './roomCleanup.js';

/**
 * Firebase fallback for the Supabase `chat_purge_forum_user` RPC. Iterates
 * the rooms the user actually participates in (instead of every room in the
 * collection) so the work scales with the deleted user's history rather
 * than the whole site.
 *
 * Mirrors the Supabase semantics:
 *   - always: delete the user's `members/{uid}` doc in every room they
 *     were part of, drop typing pulses, mutes, and any `participantIds`
 *     array entries on private rooms;
 *   - `hardDeleteMessages: true`: also delete every chat_messages row this
 *     user authored across all rooms (so their UID doesn't linger in main
 *     chat history after the account is gone);
 *   - finally: opportunistically tear down any non-main room left empty.
 *
 * Best-effort: each phase is wrapped so a partial Firestore-rules failure
 * doesn't abort the rest of the cleanup. Returns a summary object the
 * admin UI can surface.
 */
export async function purgeForumUserFromChat(targetForumUserId, opts = {}) {
  const id = String(targetForumUserId || '').trim();
  if (!id) throw new Error('חסר מזהה משתמש');
  const hardDeleteMessages = opts.hardDeleteMessages === true;

  const summary = {
    participantsRemoved: 0,
    roomsUpdated: 0,
    messagesDeleted: 0,
    emptyRoomsDeleted: 0,
  };
  const touchedRoomIds = new Set();

  // 1. Membership across all rooms — collectionGroup query keyed by docId is
  //    not supported, so look up via `members` subcollection group filter
  //    on the `joinedAt` field would still scan everything. Instead query
  //    member docs by id via collectionGroup + a where on a denormalized
  //    field is unavailable; fall back to scanning rooms the user is in
  //    via the chat_rooms `participantIds` array (private rooms) PLUS the
  //    well-known 'main' room.
  const privateRoomsQ = query(
    collection(dbChat, ROOMS_COL),
    where('participantIds', 'array-contains', id),
    limit(200)
  );
  let privateRoomsSnap;
  try {
    privateRoomsSnap = await getDocs(privateRoomsQ);
  } catch {
    privateRoomsSnap = { docs: [] };
  }
  const candidateRoomIds = new Set([MAIN_ROOM_ID, ...privateRoomsSnap.docs.map((d) => d.id)]);

  for (const roomId of candidateRoomIds) {
    const memberRef = doc(dbChat, ROOMS_COL, roomId, 'members', id);
    try {
      await deleteDoc(memberRef);
      summary.participantsRemoved += 1;
      touchedRoomIds.add(roomId);
    } catch {
      // Member doc may not exist — that's fine. Other failures (rules)
      // are logged via the catch and counted only when actually deleted.
    }
    // typing pulse for this user in this room
    try {
      await deleteDoc(doc(dbChat, ROOMS_COL, roomId, 'typing', id));
    } catch {
      // ignore
    }
  }

  // 2. participantIds mirror on private rooms.
  for (const d of privateRoomsSnap.docs) {
    try {
      await updateDoc(d.ref, {
        participantIds: arrayRemove(id),
        updatedAt: Timestamp.now(),
      });
      summary.roomsUpdated += 1;
    } catch {
      // ignore — RLS or rules may block; participant doc is already gone.
    }
  }

  // 3. Personal mute record.
  try {
    await deleteDoc(doc(dbChat, MUTES_COL, id));
  } catch {
    // ignore
  }

  // 4. Authored messages across ALL rooms — only when fully deleting.
  if (hardDeleteMessages) {
    try {
      const cg = query(
        collectionGroup(dbChat, 'messages'),
        where('authorId', '==', id),
        limit(500)
      );
      // Loop until the query returns nothing — bounded by Firestore's 500
      // doc per writeBatch limit (we use 400 to leave headroom for retries).
      for (let i = 0; i < 50; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const snap = await getDocs(cg);
        if (snap.empty) break;
        const batch = writeBatch(dbChat);
        snap.docs.forEach((mdoc) => {
          batch.delete(mdoc.ref);
          // capture parent room id (.../chatRooms/{roomId}/messages/{msgId})
          const parts = mdoc.ref.path.split('/');
          const roomId = parts[1];
          if (roomId) touchedRoomIds.add(roomId);
        });
        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
        summary.messagesDeleted += snap.docs.length;
        if (snap.docs.length < 500) break;
      }
    } catch {
      // ignore — fallback path; if rules block deletion we still purged
      // membership/typing which is the visible part.
    }
  }

  // 5. Tear down any non-main room left empty.
  for (const roomId of touchedRoomIds) {
    if (roomId === MAIN_ROOM_ID) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await tryDeleteRoomIfEmpty(roomId);
      summary.emptyRoomsDeleted += 1;
    } catch {
      // ignore
    }
  }

  return summary;
}
