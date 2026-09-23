/**
 * Public "I want to be a subscriber" requests — name + phone only, no
 * account or subscription created automatically. Admin reviews the queue
 * in "ניהול מנויים" and decides the tier (day/year) when approving.
 */
import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'subscriptionRequests';

export const createSubscriptionRequest = async (fullName, phoneNumber, note = '') => {
  const trimmedName = String(fullName || '').trim();
  const trimmedPhone = String(phoneNumber || '').trim();
  if (!trimmedName || !trimmedPhone) throw new Error('נא למלא שם וטלפון');
  const ref = await addDoc(collection(db, COLLECTION), {
    fullName: trimmedName,
    phoneNumber: trimmedPhone,
    note: String(note || '').trim(),
    status: 'pending',
    createdAt: Timestamp.now(),
  });
  return { id: ref.id };
};

export const getPendingSubscriptionRequests = async () => {
  const q = query(collection(db, COLLECTION), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const resolveSubscriptionRequest = async (requestId, status) => {
  await updateDoc(doc(db, COLLECTION, requestId), { status, resolvedAt: Timestamp.now() });
};

export const deleteSubscriptionRequest = async (requestId) => {
  await deleteDoc(doc(db, COLLECTION, requestId));
};
