import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  query,
  where,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

const COL = 'favorites';

// One doc per (userId, partyId) pair, keyed deterministically so a repeat
// "add" is just an overwrite instead of creating duplicate docs.
const favId = (userId, partyId) => `${userId}_${partyId}`;

export const addFavorite = async (userId, partyId) => {
  await setDoc(doc(db, COL, favId(userId, partyId)), {
    userId,
    partyId,
    createdAt: Timestamp.now()
  });
};

export const removeFavorite = async (userId, partyId) => {
  await deleteDoc(doc(db, COL, favId(userId, partyId)));
};

export const getFavoritePartyIds = async (userId) => {
  const snap = await getDocs(query(collection(db, COL), where('userId', '==', userId)));
  return snap.docs.map((d) => d.data().partyId);
};
