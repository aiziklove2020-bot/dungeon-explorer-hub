/**
 * Lightweight per-user CRM data: acquisition source + a manual payment log.
 * Stored directly on the user doc under `crm` so it rides along with the
 * rest of the user's data (no separate collection needed for this scale).
 */
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

/** Appends one payment record. `record`: { date (YYYY-MM-DD), amount, method, note }. */
export const addPaymentRecord = async (userId, record) => {
  const current = await getUserCrm(userId);
  const entry = {
    id: genId(),
    date: record.date || new Date().toISOString().split('T')[0],
    amount: record.amount ? Number(record.amount) : null,
    method: record.method || '',
    note: (record.note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    'crm.payments': [...current.payments, entry],
  });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};

export const deletePaymentRecord = async (userId, recordId) => {
  const current = await getUserCrm(userId);
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    'crm.payments': current.payments.filter((p) => p.id !== recordId),
  });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};
