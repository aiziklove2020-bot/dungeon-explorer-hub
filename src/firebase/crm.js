/**
 * Lightweight per-user CRM data: acquisition source + a manual payment log.
 * Stored directly on the user doc under `crm` so it rides along with the
 * rest of the user's data (no separate collection needed for this scale).
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { invalidateCache } from './dataAccess';
import { callAdminSettings } from '../utils/adminApi';

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

// firestore.rules denies plain clients any write to the `crm` field (a forged
// crm.source/crm.payments entry would corrupt the admin panel's sales records
// with no way to tell it apart from a real one) — these three now go through
// api/admin-settings.js's admin-* CRM actions, which perform the equivalent
// write via the Admin SDK (bypassing that rule, same as every other
// admin-only action moved server-side).
export const setUserSource = async (userId, source, sourceNote = '') => {
  await callAdminSettings('admin-set-crm-source', { userId, source, sourceNote });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};

/** Appends one payment record. `record`: { date (YYYY-MM-DD), amount, method, note }.
 *  The server assigns id/createdAt and applies it via arrayUnion (atomic),
 *  so two admins adding a payment for the same user at the same time can't
 *  race and silently drop one of the entries. */
export const addPaymentRecord = async (userId, record) => {
  const { entry } = await callAdminSettings('admin-add-crm-payment', { userId, record });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
  return entry;
};

export const deletePaymentRecord = async (userId, recordId) => {
  await callAdminSettings('admin-delete-crm-payment', { userId, recordId });
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};
