import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import { normalizeIsraeliPhone } from '../utils/phone';

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
