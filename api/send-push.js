import webpush from 'web-push';
import { requireAdminApiSecret } from '../lib/apiAuth.js';

/**
 * Sends Web Push notifications to a set of subscriptions. POST JSON:
 *   { subscriptions: [{ id, endpoint, keys }], title, body, url }
 *
 * Requires VAPID_PRIVATE_KEY in the environment (paired with the public key
 * hardcoded below, which is safe to expose — it's the public half). Without
 * it configured, this responds 500 rather than silently no-op'ing so a
 * missing env var is obvious instead of "notifications just don't arrive".
 *
 * Admin-only: both callers (saveBalanceMatches, notifyPrivilegedSubscribersOfNewParty)
 * live in src/firebase/parties.js, used only from the admin panel. Without this
 * gate, anyone could POST arbitrary endpoint/keys and use this deploy's VAPID
 * identity as a free open push relay.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const VAPID_PUBLIC_KEY = 'BEKO6poc32JAn1MYTdwdvzRve1BRIwZ85AgtEUQe_JqWLTYal5sdwJK-TossqFQzWmnE9Hoj0nxRQtA4nMjTb7Y';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!requireAdminApiSecret(req, res)) return;

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ ok: false, error: 'Push notifications are not configured (missing VAPID_PRIVATE_KEY)' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const { subscriptions, title, body: message, url } = body;
  if (!Array.isArray(subscriptions) || subscriptions.length === 0 || !title) {
    return res.status(400).json({ ok: false, error: 'Missing subscriptions or title' });
  }

  webpush.setVapidDetails('mailto:admin@libralparty.co.il', VAPID_PUBLIC_KEY, privateKey);

  const payload = JSON.stringify({
    title: String(title).slice(0, 120),
    body: String(message || '').slice(0, 200),
    url: url || '/',
  });

  const results = await Promise.allSettled(
    subscriptions.slice(0, 20).map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .then(() => ({ id: sub.id, ok: true }))
        .catch((err) => ({ id: sub.id, ok: false, statusCode: err.statusCode }))
    )
  );

  const items = results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false }));
  const sent = items.filter((i) => i.ok).length;
  const deadIds = items.filter((i) => !i.ok && (i.statusCode === 404 || i.statusCode === 410)).map((i) => i.id);

  return res.status(200).json({ ok: true, sent, total: subscriptions.length, deadIds });
}
