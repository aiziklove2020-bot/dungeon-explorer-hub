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
 *
 * Returns a status the caller can use to surface real problems instead of
 * assuming silence means success: `{ hasDevice, ok, sent, total, error }`.
 * `hasDevice: false` means the person never enabled push at all (nothing to
 * send to — not a bug); `ok: false` with `hasDevice: true` means the server
 * relay itself failed (e.g. VAPID_PRIVATE_KEY missing in the deploy env, or
 * a network error) — that's the case worth surfacing to an admin, because
 * every push for every recipient will silently fail the same way.
 */
export const sendPushToPhone = async (phoneNumber, { title, body, url } = {}) => {
  try {
    const subs = await getPushSubscriptionsByPhone(phoneNumber);
    if (!subs.length) return { hasDevice: false, ok: false, sent: 0, total: 0 };
    const { adminAuthHeader } = await import('../utils/adminApi');
    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
      body: JSON.stringify({
        subscriptions: subs.map((s) => ({ id: s.id, endpoint: s.endpoint, keys: s.keys })),
        title,
        body,
        url,
      }),
    });
    const res = await response.json().catch(() => null);

    if (res?.deadIds?.length) {
      await Promise.all(res.deadIds.map((id) => deletePushSubscription(id).catch(() => {})));
    }

    if (!response.ok || !res?.ok) {
      return { hasDevice: true, ok: false, sent: 0, total: subs.length, error: res?.error || `HTTP ${response.status}` };
    }
    return { hasDevice: true, ok: true, sent: res.sent ?? 0, total: subs.length };
  } catch (err) {
    return { hasDevice: true, ok: false, sent: 0, total: 0, error: err.message || 'network error' };
  }
};

/**
 * Notify every registered device about a new party — not just paying
 * subscribers. Site visitors can now opt into push notifications the moment
 * they land on the site (before ever registering or subscribing), keyed by
 * a local anonymous id instead of a phone number until they identify
 * themselves; gating this on hasAnyPrivilegedSubscription would silently
 * drop every one of those. Best-effort and fire-and-forget by design — a
 * push failure must never block or delay party creation itself.
 */
export const notifyAllSubscribersOfNewParty = async (party) => {
  try {
    const subs = await getAllPushSubscriptions();
    const phones = [...new Set(subs.map((s) => s.phone).filter(Boolean))];
    if (!phones.length) return;

    const title = '🎉 מסיבה חדשה!';
    const body = `${party?.name || party?.title || 'מסיבה חדשה'} נוספה לאתר`;
    const url = party?.id ? `/event?id=${party.id}` : '/events';

    await Promise.all(phones.map((phone) => sendPushToPhone(phone, { title, body, url })));
  } catch {
    // best-effort — swallow
  }
};
