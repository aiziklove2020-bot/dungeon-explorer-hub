/**
 * Lightweight per-user CRM data: acquisition source + a manual payment log.
 * Stored directly on the user doc under `crm` so it rides along with the
 * rest of the user's data (no separate collection needed for this scale).
 */
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './config';
import { invalidateCache } from './dataAccess';

const USERS_COLLECTION = 'users';

export const CRM_SOURCES = [
  'וואטסאפ',
  'טלגרם',
  'פייסבוק',
  'אינסטגרם',
  'המלצה מחבר',
  'גוגל',
  'אחר',
];

export const PAYMENT_METHODS = [
  'מזומן',
  'ביט',
  'פייבוקס',
  'העברה בנקאית',
  'אשראי',
  'אחר',
];

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Reads the `crm` block off a user doc; always returns a stable shape. */
export const getUserCrm = async (userId) => {
  const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
  const crm = snap.exists() ? snap.data()?.crm : null;
  return {
    source: crm?.source || '',
    sourceNote: crm?.sourceNote || '',
    payments: Array.isArray(crm?.payments) ? crm.payments : [],
  };
};

export const setUserSource = async (userId, source, sourceNote = '') => {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    'crm.source': source,
    'crm.sourceNote': sourceNote,
  });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};

/** Appends one payment record. `record`: { date (YYYY-MM-DD), amount, method, note }.
 *  Uses arrayUnion (atomic on the server) instead of a read-then-write of
 *  the whole array — two admins (or two tabs) adding a payment for the same
 *  user within moments of each other used to race: both read the same
 *  snapshot, and whichever write landed second silently overwrote the
 *  first admin's payment, dropping it from the CRM log with no error. */
export const addPaymentRecord = async (userId, record) => {
  const entry = {
    id: genId(),
    date: record.date || new Date().toISOString().split('T')[0],
    amount: record.amount ? Number(record.amount) : null,
    method: record.method || '',
    note: (record.note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    'crm.payments': arrayUnion(entry),
  });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};

/** arrayRemove matches the exact element server-side at write time, so this
 *  stays correct even if `current` (read here only to find the record's
 *  exact shape) is stale — unlike a full-array read-then-write, it can't
 *  clobber a payment added concurrently by someone else. */
export const deletePaymentRecord = async (userId, recordId) => {
  const current = await getUserCrm(userId);
  const target = current.payments.find((p) => p.id === recordId);
  if (!target) return;
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    'crm.payments': arrayRemove(target),
  });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};
