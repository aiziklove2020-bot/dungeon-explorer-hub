/**
 * Vercel Serverless: Manually publish a party/event to Instagram (feed post + story)
 * via the Windsor.ai connectors REST API (the same "instagram" connector/account
 * already wired up for this site), using the party's own data as content.
 *
 * POST JSON: { partyId: string, includeStory?: boolean }
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` (see lib/apiAuth.js).
 * The admin client sends this via adminAuthHeader() (src/utils/adminApi.js).
 *
 * Env: ADMIN_API_SECRET, GOOGLE_APPLICATION_CREDENTIALS_JSON,
 *      WINDSOR_API_KEY, WINDSOR_INSTAGRAM_ACCOUNT_ID
 *
 * Windsor.ai write-action flow:
 *   POST https://connectors.windsor.ai/{connector}/actions?api_key=WINDSOR_API_KEY
 *   body: { account, action, params }
 * Used for both the feed post (action: create_image_post) and the story
 * (action: create_story). Write actions must be enabled for the Windsor.ai
 * team (Team Management → Write Actions) or every call fails.
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';

const WINDSOR_ACTIONS_URL = 'https://connectors.windsor.ai/instagram/actions';

function buildCaption(party) {
  const lines = [];
  if (party.description) lines.push(party.description);
  lines.push('');
  lines.push('https://libralparty.net/');
  return lines.join('\n');
}

async function runWindsorAction({ apiKey, account, action, params }) {
  const res = await fetch(`${WINDSOR_ACTIONS_URL}?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, action, params }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error || json.message || `Windsor.ai action "${action}" failed (HTTP ${res.status})`);
  }
  return json;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminApiSecret(req, res)) return;

  const WINDSOR_API_KEY = process.env.WINDSOR_API_KEY;
  const IG_ACCOUNT_ID = process.env.WINDSOR_INSTAGRAM_ACCOUNT_ID;
  if (!WINDSOR_API_KEY || !IG_ACCOUNT_ID) {
    return res.status(503).json({
      error: 'Server configuration error',
      message: 'WINDSOR_API_KEY / WINDSOR_INSTAGRAM_ACCOUNT_ID are not set in environment variables',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { partyId, includeStory = true } = body;
  if (!partyId || typeof partyId !== 'string') {
    return res.status(400).json({ error: 'Missing partyId' });
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.firestore) {
      // firebase-admin v14 dropped admin.firestore()/admin.apps (kept
      // initializeApp/cert at top level) in favor of the modular API. Patch the
      // missing pieces back on so the rest of this file (written against the old
      // namespaced shape) keeps working unchanged.
      const [{ getApps }, { getFirestore }] = await Promise.all([
        import('firebase-admin/app'),
        import('firebase-admin/firestore'),
      ]);
      Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
      admin.firestore = () => getFirestore();
    }
    if (!admin.apps?.length) {
      const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({
        credential: cred,
        projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca',
      });
    }
  } catch (e) {
    console.error('Firebase init:', e.message);
    return res.status(503).json({
      error: 'Firebase configuration error',
      message: e.message,
      hint: 'Set GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel (Firebase service account JSON).',
    });
  }

  const db = admin.firestore();

  try {
    const partyDoc = await db.collection('parties').doc(partyId).get();
    if (!partyDoc.exists) {
      return res.status(404).json({ error: 'Party not found' });
    }
    const party = partyDoc.data();
    const imageUrl = party.imageURL || party.img;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Party has no imageURL to publish' });
    }

    const caption = buildCaption(party);

    const postResult = await runWindsorAction({
      apiKey: WINDSOR_API_KEY,
      account: IG_ACCOUNT_ID,
      action: 'create_image_post',
      params: { image_url: imageUrl, caption },
    });

    let storyResult = null;
    if (includeStory) {
      storyResult = await runWindsorAction({
        apiKey: WINDSOR_API_KEY,
        account: IG_ACCOUNT_ID,
        action: 'create_story',
        params: { image_url: imageUrl },
      });
    }

    return res.status(200).json({
      ok: true,
      postId: postResult?.result || postResult,
      storyId: storyResult?.result || storyResult,
    });
  } catch (e) {
    console.error('instagram-publish error:', e.message);
    return res.status(502).json({ error: 'Instagram publish failed', message: e.message });
  }
}
