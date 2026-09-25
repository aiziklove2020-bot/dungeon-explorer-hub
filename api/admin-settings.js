/**
 * Admin-only Vercel API: writes to Firestore `settings/*` docs and the
 * `rssFeeds` collection via the Admin SDK.
 *
 * firestore.rules locks both of these collections to `write: if false` —
 * this app has no real Firebase Auth adopted, so a client-side security
 * rule can't tell "the admin panel" apart from "anyone who has the public
 * Firestore config" (which is necessarily public, since every page embeds
 * it). This route is now the only way any of these documents get written:
 * the admin panel calls it instead of the Firestore client SDK directly,
 * and the ADMIN_API_SECRET bearer token is the actual access control.
 *
 * Before this route existed, `settings/{document}` allowed `write: if true`
 * with no check at all — anyone who found the Firestore config could write
 * arbitrary content (about/contact copy, social links, Telegram config)
 * straight into fields the public site renders, bypassing the admin panel
 * and the app's own escaping entirely.
 *
 * POST { action: 'set-settings', docId, data }
 *   docId must be one of ALLOWED_SETTINGS_DOC_IDS. Writes settings/{docId}
 *   with merge:true — the same semantics every prior client setDoc(...,
 *   { merge: true }) call had.
 *
 * POST { action: 'add-rss-feed', data }
 * POST { action: 'update-rss-feed', feedId, data }
 * POST { action: 'delete-rss-feed', feedId }
 * POST { action: 'restore-rss-feed', feedId, data } — same as add-rss-feed
 *   but preserves the given doc id, for full-DB backup restore.
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON, ADMIN_API_SECRET
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import { getFirebaseAdmin } from '../lib/forumAuthApi.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Every settings/{docId} document any part of the app actually writes today
// (src/firebase/settings.js, partySettings.js, siteConfig.js). Anything not
// on this list is refused — this list IS the access-control boundary now
// that the Firestore rule itself denies all writes.
const ALLOWED_SETTINGS_DOC_IDS = new Set([
  'socialLinks',
  'telegram',
  'supportChat',
  'aboutStory',
  'whatsappGroups',
  'content',
  'registrationSettings',
  'rssTickerSettings',
  'liveChat',
  'partySettings',
  'siteConfig',
  'storeSettings'
]);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdminApiSecret(req, res)) return;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const action = typeof body.action === 'string' ? body.action : '';

  let admin;
  try {
    admin = await getFirebaseAdmin();
  } catch (err) {
    if (err.code === 'ADMIN_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Server configuration error: GOOGLE_APPLICATION_CREDENTIALS_JSON missing' });
    }
    console.error('admin-settings init:', err);
    return res.status(503).json({ error: 'Server configuration error' });
  }
  const db = admin.firestore();

  try {
    if (action === 'set-settings') {
      const { docId, data } = body;
      if (typeof docId !== 'string' || !ALLOWED_SETTINGS_DOC_IDS.has(docId)) {
        return res.status(400).json({ error: 'Unknown or missing docId' });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ error: 'data must be an object' });
      }
      await db.collection('settings').doc(docId).set(data, { merge: true });
      return res.status(200).json({ ok: true });
    }

    if (action === 'add-rss-feed') {
      const { data } = body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'data must be an object' });
      }
      const newFeed = {
        text: typeof data.text === 'string' ? data.text : '',
        enabled: data.enabled !== false,
        order: Number.isFinite(data.order) ? data.order : 0,
        createdAt: new Date().toISOString()
      };
      const ref = await db.collection('rssFeeds').add(newFeed);
      return res.status(200).json({ ok: true, id: ref.id, ...newFeed });
    }

    if (action === 'update-rss-feed') {
      const { feedId, data } = body;
      if (typeof feedId !== 'string' || !feedId) {
        return res.status(400).json({ error: 'Missing feedId' });
      }
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'data must be an object' });
      }
      await db.collection('rssFeeds').doc(feedId).update({
        text: typeof data.text === 'string' ? data.text : '',
        enabled: data.enabled !== false,
        order: Number.isFinite(data.order) ? data.order : 0,
        updatedAt: new Date().toISOString()
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete-rss-feed') {
      const { feedId } = body;
      if (typeof feedId !== 'string' || !feedId) {
        return res.status(400).json({ error: 'Missing feedId' });
      }
      await db.collection('rssFeeds').doc(feedId).delete();
      return res.status(200).json({ ok: true });
    }

    // Full-DB backup restore (src/firebase/dbBackup.js) needs to recreate an
    // rssFeeds doc at its ORIGINAL id, unlike add-rss-feed's auto-generated
    // one — that's the only difference from set-settings, just against a
    // different collection.
    if (action === 'restore-rss-feed') {
      const { feedId, data } = body;
      if (typeof feedId !== 'string' || !feedId) {
        return res.status(400).json({ error: 'Missing feedId' });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ error: 'data must be an object' });
      }
      await db.collection('rssFeeds').doc(feedId).set(data, { merge: true });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('admin-settings:', action, err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
