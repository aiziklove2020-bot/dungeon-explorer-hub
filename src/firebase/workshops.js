import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';

// Firestore: ensure index on workshops "createdAt" desc if not default
import { db } from './config';

const WORKSHOPS_COLLECTION = 'workshops';
const WORKSHOP_REGISTRATIONS_COLLECTION = 'workshopRegistrations';

export const getActiveWorkshops = async () => {
  const ref = collection(db, WORKSHOPS_COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return all.filter(w => w.active !== false);
};

export const getWorkshopById = async (id) => {
  if (!id) return null;
  const ref = doc(db, WORKSHOPS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const createWorkshop = async (data) => {
  const ref = collection(db, WORKSHOPS_COLLECTION);
  const newRef = doc(ref);
  const payload = {
    title: data.title || '',
    imageUrl: data.imageUrl || '',
    description: data.description || '',
    instructor: data.instructor || '',
    price: data.price != null && data.price !== '' ? Number(data.price) : null,
    date: data.date || null,
    duration: data.duration || '',
    maxParticipants: data.maxParticipants != null && data.maxParticipants !== '' ? Number(data.maxParticipants) : null,
    active: data.active !== false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  await setDoc(newRef, payload);
  const result = { id: newRef.id, ...payload };
  try {
    const { sendNewWorkshopTelegram } = await import('./telegram');
    await sendNewWorkshopTelegram(result, 'he');
  } catch (err) {
    console.error('workshops.create telegram notify:', err);
  }
  return result;
};

export const updateWorkshop = async (id, data) => {
  const ref = doc(db, WORKSHOPS_COLLECTION, id);
  const payload = {
    ...data,
    updatedAt: Timestamp.now()
  };
  if (payload.price !== undefined && payload.price !== '' && payload.price != null) {
    payload.price = Number(payload.price);
  }
  if (payload.maxParticipants !== undefined) {
    payload.maxParticipants = payload.maxParticipants === '' || payload.maxParticipants == null ? null : Number(payload.maxParticipants);
  }
  await updateDoc(ref, payload);
  return { id, ...payload };
};

export const deleteWorkshop = async (id) => {
  const ref = doc(db, WORKSHOPS_COLLECTION, id);
  await deleteDoc(ref);
  const regRef = collection(db, WORKSHOP_REGISTRATIONS_COLLECTION);
  const q = query(regRef, where('workshopId', '==', id));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, WORKSHOP_REGISTRATIONS_COLLECTION, d.id));
  }
  return true;
};

/**
 * Register to workshop. user can be:
 * - Site user: { id, phoneNumber, name, telegramUsername? }
 * - Guest (no site account): { phoneNumber, name, telegramUsername?, isGuest: true } — name in user.name or user.userName
 */
export const registerToWorkshop = async (workshopId, user) => {
  const isGuest = user?.isGuest === true || (user?.phoneNumber && !user?.id);
  const phoneNumber = (user?.phoneNumber || '').replace(/\D/g, '');
  const userName = user?.name || user?.userName || '';
  if (!workshopId || !phoneNumber || phoneNumber.length !== 10 || !phoneNumber.startsWith('05')) {
    throw new Error('חסרים פרטים לרישום (טלפון תקין 05xxxxxxxx)');
  }
  if (!userName.trim()) throw new Error('נא להזין שם מלא');

  const userId = isGuest ? phoneNumber : (user?.id || phoneNumber);
  const telegramUsername = (user?.telegramUsername || '').trim().replace(/^@+/, '') || null;

  const regRef = collection(db, WORKSHOP_REGISTRATIONS_COLLECTION);
  const q = query(
    regRef,
    where('workshopId', '==', workshopId),
    where('userId', '==', userId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    return { id: existing.docs[0].id, alreadyRegistered: true };
  }

  const newRef = doc(regRef);
  const payload = {
    workshopId,
    userId,
    phoneNumber,
    userName: userName.trim(),
    registeredAt: Timestamp.now(),
    isGuest: isGuest === true
  };
  if (telegramUsername) payload.telegramUsername = telegramUsername;
  await setDoc(newRef, payload);
  try {
    const workshop = await getWorkshopById(workshopId);
    if (workshop) {
      const { sendNewWorkshopRegistrationTelegram } = await import('./telegram');
      await sendNewWorkshopRegistrationTelegram(workshop, { userName: payload.userName, phoneNumber, registeredAt: payload.registeredAt }, 'he');
    }
  } catch (err) {
    console.error('workshops.register telegram notify:', err);
  }
  return { id: newRef.id, ...payload };
};

export const unregisterFromWorkshop = async (workshopId, userId) => {
  const regRef = collection(db, WORKSHOP_REGISTRATIONS_COLLECTION);
  const q = query(
    regRef,
    where('workshopId', '==', workshopId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, WORKSHOP_REGISTRATIONS_COLLECTION, d.id));
  }
  return true;
};

export const getRegistrationsByWorkshop = async (workshopId) => {
  const regRef = collection(db, WORKSHOP_REGISTRATIONS_COLLECTION);
  const q = query(regRef, where('workshopId', '==', workshopId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getRegistrationsByUser = async (userId) => {
  if (!userId) return [];
  const regRef = collection(db, WORKSHOP_REGISTRATIONS_COLLECTION);
  const q = query(regRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** Update a workshop registration doc (e.g. when converting guest to user). */
export const updateWorkshopRegistration = async (regDocId, updates) => {
  const ref = doc(db, WORKSHOP_REGISTRATIONS_COLLECTION, regDocId);
  await updateDoc(ref, { ...updates, updatedAt: Timestamp.now() });
  return true;
};

/** Get all guest workshop registrations by phone. */
export const getGuestRegistrationsByPhone = async (phoneNumber) => {
  const cleaned = (phoneNumber || '').replace(/\D/g, '');
  if (!cleaned || cleaned.length !== 10 || !cleaned.startsWith('05')) return [];
  const regRef = collection(db, WORKSHOP_REGISTRATIONS_COLLECTION);
  const q = query(
    regRef,
    where('userId', '==', cleaned),
    where('isGuest', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** Normalize workshop date to YYYY-MM-DD for comparison. */
function workshopDateString(workshop) {
  if (!workshop?.date) return null;
  const d = workshop.date;
  if (typeof d === 'string') return d.slice(0, 10);
  if (d?.toDate) return d.toDate().toISOString().slice(0, 10);
  return null;
}

/** Guest registrations by phone where the workshop date is today or in the future (allows login without creating a user). */
export const getUpcomingGuestRegistrationsByPhone = async (phoneNumber) => {
  const regs = await getGuestRegistrationsByPhone(phoneNumber);
  if (regs.length === 0) return [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [];
  for (const reg of regs) {
    const workshop = await getWorkshopById(reg.workshopId);
    if (!workshop) continue;
    const dateStr = workshopDateString(workshop);
    if (dateStr && dateStr >= today) upcoming.push(reg);
  }
  return upcoming;
};

export const getAllWorkshopsForAdmin = async () => {
  const ref = collection(db, WORKSHOPS_COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};
