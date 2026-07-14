import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from './config';
import { cleanPhone } from '../utils/phone';

const ADVERTISERS_COLLECTION = 'advertisers';

const getAdvertiserByPhone = async (phoneNumber) => {
  const phone = cleanPhone(phoneNumber);
  if (!phone) return null;
  const advertisersRef = collection(db, ADVERTISERS_COLLECTION);
  const q = query(advertisersRef, where('phoneNumber', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/** Public signup: creates a pending advertiser account awaiting admin approval. */
export const registerAdvertiser = async ({ businessName, contactName, phoneNumber, password }) => {
  const phone = cleanPhone(phoneNumber);
  if (!phone) {
    throw new Error('מספר טלפון לא תקין');
  }
  if (!password || password.length < 4) {
    throw new Error('הסיסמה חייבת להכיל לפחות 4 תווים');
  }
  const existing = await getAdvertiserByPhone(phone);
  if (existing) {
    throw new Error('כבר קיימת בקשת הרשמה עם מספר הטלפון הזה');
  }

  const hashed = await bcrypt.hash(password, 10);
  const advertisersRef = collection(db, ADVERTISERS_COLLECTION);
  const newRef = doc(advertisersRef);
  const data = {
    businessName: (businessName || '').trim(),
    contactName: (contactName || '').trim(),
    phoneNumber: phone,
    password: hashed,
    status: 'pending',
    // Explicit marker so admins/other tooling can tell this account apart
    // from a regular subscribed customer at a glance (see AdvertisersSection
    // and the "מפרסם" badge, both of which key off this field).
    role: 'advertiser',
    createdAt: Timestamp.now()
  };
  await setDoc(newRef, data);
  return { id: newRef.id, ...data };
};

/** Login: only succeeds for accounts an admin has approved. */
export const authenticateAdvertiser = async (phoneNumber, password) => {
  const advertiser = await getAdvertiserByPhone(phoneNumber);
  if (!advertiser) {
    return { authenticated: false, error: 'פרטי התחברות שגויים' };
  }
  if (advertiser.status === 'pending') {
    return { authenticated: false, error: 'הבקשה שלך עדיין ממתינה לאישור מנהל' };
  }
  if (advertiser.status === 'rejected') {
    return { authenticated: false, error: 'הבקשה שלך נדחתה' };
  }

  const ok = await bcrypt.compare(password, advertiser.password || '');
  if (!ok) {
    return { authenticated: false, error: 'פרטי התחברות שגויים' };
  }
  return { authenticated: true, advertiser };
};

/** Admin-side: list every advertiser signup regardless of status. */
export const getAllAdvertisers = async () => {
  const advertisersRef = collection(db, ADVERTISERS_COLLECTION);
  const snap = await getDocs(advertisersRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

/** Admin-side: approve / reject / reset an advertiser's status. */
export const setAdvertiserStatus = async (advertiserId, status) => {
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw new Error('Invalid status');
  }
  await updateDoc(doc(db, ADVERTISERS_COLLECTION, advertiserId), { status });
};

export const getAdvertiserById = async (advertiserId) => {
  const snap = await getDoc(doc(db, ADVERTISERS_COLLECTION, advertiserId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};
