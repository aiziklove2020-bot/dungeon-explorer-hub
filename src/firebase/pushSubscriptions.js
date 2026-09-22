import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import { normalizeIsraeliPhone } from '../utils/phone';
import { getUserByPhone } from './dataAccess';
import { hasAnyPrivilegedSubscription } from './subscriptions';

const COLLECTION = 'pushSubscriptions';

// One doc per (phone, device) pair, keyed by the subscription endpoint so
// re-subscribing the same device overwrites its old row instead of piling
// up duplicates.
const subscriptionDocId = (endpoint) =>
  btoa(unescape(encodeURIComponent(endpoint))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 300);

export const savePushSubscription = async (phoneNumber, subscription) => {
  const phone = normalizeIsraeliPhone(phoneNumber) || phoneNumber;
  if (!phone || !subscription?.endpoint) throw new Error('נתונים חסרים לרישום התראות');
  const id = subscriptionDocId(subscription.endpoint);
  await setDoc(doc(db, COLLECTION, id), {
    phone,
    endpoint: subscription.endpoint,
    keys: subscription.keys || null,
    updatedAt: new Date().toISOString(),
  });
  return { id };
};

export const getPushSubscriptionsByPhone = async (phoneNumber) => {
  const phone = normalizeIsraeliPhone(phoneNumber) || phoneNumber;
  if (!phone) return [];
  const q = query(collection(db, COLLECTION), where('phone', '==', phone));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deletePushSubscription = async (id) => {
  if (!id) return;
  await deleteDoc(doc(db, COLLECTION, id));
};

/** Every registered device across every phone — used to fan a notification out to all subscribers. */
const getAllPushSubscriptions = async () => {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Best-effort: notify every device registered for a phone number via a
 * Vercel serverless relay (browsers can't send Web Push directly — that
 * needs the VAPID private key, which only lives server-side). Never throws;
 * a push failure must not block whatever admin action triggered it.
 */
export const sendPushToPhone = async (phoneNumber, { title, body, url } = {}) => {
  try {
    const subs = await getPushSubscriptionsByPhone(phoneNumber);
    if (!subs.length) return;
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptions: subs.map((s) => ({ id: s.id, endpoint: s.endpoint, keys: s.keys })),
        title,
        body,
        url,
      }),
    }).then((r) => r.json()).catch(() => null);

    if (res?.deadIds?.length) {
      await Promise.all(res.deadIds.map((id) => deletePushSubscription(id).catch(() => {})));
    }
  } catch {
    // best-effort — swallow
  }
};

/**
 * Notify every subscriber with an active *privileged* (yearly/gold)
 * subscription and a registered device about a new party. Best-effort and
 * fire-and-forget by design — a push failure must never block or delay
 * party creation itself.
 */
export const notifyPrivilegedSubscribersOfNewParty = async (party) => {
  try {
    const subs = await getAllPushSubscriptions();
    const phones = [...new Set(subs.map((s) => s.phone).filter(Boolean))];
    if (!phones.length) return;

    const title = '🎉 מסיבה חדשה!';
    const body = `${party?.name || party?.title || 'מסיבה חדשה'} נוספה לאתר`;
    const url = party?.id ? `/event?id=${party.id}` : '/events';

    await Promise.all(phones.map(async (phone) => {
      const user = await getUserByPhone(phone).catch(() => null);
      if (!user || !hasAnyPrivilegedSubscription(user)) return;
      await sendPushToPhone(phone, { title, body, url });
    }));
  } catch {
    // best-effort — swallow
  }
};
