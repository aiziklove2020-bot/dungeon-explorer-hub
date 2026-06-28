import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, Timestamp
} from 'firebase/firestore';
import { db } from './config';

const COL = 'bookmarks';

const bookmarkId = (userId, itemType, itemId) => `${userId}_${itemType}_${itemId}`;

export const addBookmark = async (userId, itemType, itemId) => {
  if (!userId || !itemType || !itemId) return;
  const ref = doc(db, COL, bookmarkId(userId, itemType, itemId));
  await setDoc(ref, { userId, itemType, itemId, createdAt: Timestamp.now() });
};

export const removeBookmark = async (userId, itemType, itemId) => {
  if (!userId || !itemType || !itemId) return;
  await deleteDoc(doc(db, COL, bookmarkId(userId, itemType, itemId)));
};

export const isBookmarked = async (userId, itemType, itemId) => {
  if (!userId || !itemType || !itemId) return false;
  const snap = await getDoc(doc(db, COL, bookmarkId(userId, itemType, itemId)));
  return snap.exists();
};

export const getUserBookmarks = async (userId) => {
  if (!userId) return [];
  const q = query(collection(db, COL), where('userId', '==', userId));
  const snap = await getDocs(q);
  const bookmarks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  bookmarks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return bookmarks;
};
