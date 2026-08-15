/**
 * Vercel Serverless: Publish content + parties from Firestore to GitHub.
 * Writes content/content.json (and public/content/content.json) on the configured branch (default: PublishMode).
 *
 * IMPORTANT: This endpoint must only be called when the admin explicitly clicks "פרסם ל-Git" in the UI.
 * No cron, no auto-publish, no other automation — push to Git is intentional only.
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` header. The admin client
 *       sends `import.meta.env.VITE_ADMIN_API_SECRET` (must equal `ADMIN_API_SECRET`).
 *
 * Env: ADMIN_API_SECRET, GOOGLE_APPLICATION_CREDENTIALS_JSON, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH (optional, default PublishMode), GITHUB_FILE_PATH (optional, default content/content.json)
 *
 * POST { job: "instagram-publish", partyId, includeStory? }: Admin panel's
 * "פרסם לאינסטגרם" button — posts one party's image + description straight to
 * Instagram (feed post + story) via the Windsor.ai connectors REST API, using
 * the Instagram account already connected there. Merged in here (rather than
 * its own file) to stay under the Vercel Hobby plan's 12-serverless-function
 * limit — same reasoning as git-history.js absorbing record-deploy-status and
 * telegram-webhook.js absorbing its manual-post/promo jobs.
 * Env: WINDSOR_API_KEY, WINDSOR_INSTAGRAM_ACCOUNT_ID (+ same GOOGLE_APPLICATION_CREDENTIALS_JSON as above).
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import {
  DEFAULT_PARTY_RETENTION_HOURS,
  computePartyExpirationIso,
  isPartyExpiredByDate,
  normalizeRetentionHours,
} from '../shared/partyExpiry.js';

const WINDSOR_ACTIONS_URL = 'https://connectors.windsor.ai/instagram/actions';

function buildInstagramCaption(party) {
  const lines = [];
  if (party.description) lines.push(party.description);
  lines.push('');
  lines.push('https://www.libralparty.net/');
  return lines.join('\n');
}

// Instagram enforces fixed aspect-ratio limits Meta zooms/crops (stories: exactly
// 9:16) or rejects outright (feed posts: must be between 4:5 and 1.91:1 — a
// too-tall/too-narrow party flyer 400s with "aspect ratio is not supported").
// Party images are hosted on Cloudinary, so instead of hitting either problem
// we ask Cloudinary to pad the image onto a canvas of the right shape (b_auto
// picks a fill color from the image itself) — the full original image stays
// visible, just letterboxed. (b_blurred requires a paid Cloudinary add-on and
// 400s on this account, so b_auto — solid-color padding, no add-on needed —
// is used instead.) Falls back to the original URL untouched for any
// non-Cloudinary image.
function toCloudinaryPaddedUrl(imageUrl, width, height) {
  if (typeof imageUrl !== 'string') return imageUrl;
  const marker = '/image/upload/';
  const idx = imageUrl.indexOf(marker);
  if (!imageUrl.includes('res.cloudinary.com') || idx === -1) return imageUrl;
  const insertAt = idx + marker.length;
  return `${imageUrl.slice(0, insertAt)}w_${width},h_${height},c_pad,b_auto/${imageUrl.slice(insertAt)}`;
}

// 9:16, matches the story frame exactly.
const toStoryImageUrl = (imageUrl) => toCloudinaryPaddedUrl(imageUrl, 1080, 1920);
// 4:5 (Instagram's own recommended portrait ratio for feed posts) — safely
// inside the 4:5–1.91:1 range Instagram requires, whichever way the source
// image leans.
const toFeedImageUrl = (imageUrl) => toCloudinaryPaddedUrl(imageUrl, 1080, 1350);

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

async function handleInstagramPublish(req, res) {
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

    const caption = buildInstagramCaption(party);

    const postResult = await runWindsorAction({
      apiKey: WINDSOR_API_KEY,
      account: IG_ACCOUNT_ID,
      action: 'create_image_post',
      params: { image_url: toFeedImageUrl(imageUrl), caption },
    });

    let storyResult = null;
    if (includeStory) {
      storyResult = await runWindsorAction({
        apiKey: WINDSOR_API_KEY,
        account: IG_ACCOUNT_ID,
        action: 'create_story',
        params: { image_url: toStoryImageUrl(imageUrl) },
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminApiSecret(req, res)) return;

  const bodyForDispatch = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
  if (bodyForDispatch.job === 'instagram-publish') {
    return handleInstagramPublish(req, res);
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'PublishMode';
  const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/content.json';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'GITHUB_TOKEN is not set in environment variables'
    });
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.firestore) {
      // firebase-admin v14 dropped admin.firestore()/admin.apps (kept
      // initializeApp/cert at top level) in favor of the modular API. Patch the
      // missing pieces back on so the rest of this file (written against the old
      // namespaced shape) keeps working unchanged.
      const [{ getApps }, { getFirestore, Timestamp }] = await Promise.all([
        import('firebase-admin/app'),
        import('firebase-admin/firestore')
      ]);
      Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
      admin.firestore = Object.assign(() => getFirestore(), { Timestamp });
    }
    if (!admin.apps?.length) {
      const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({
        credential: cred,
        projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
      });
    }
  } catch (e) {
    console.error('Firebase init:', e.message);
    return res.status(503).json({
      error: 'Firebase configuration error',
      message: e.message,
      hint: 'Set GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel (Firebase service account JSON).'
    });
  }

  const db = admin.firestore();

  try {
    const [contentDoc, registrationDoc, socialLinksDoc, whatsappDoc, partiesSnap, storeSettingsDoc, workshopsSnap, rssFeedsSnap, partySettingsDoc] = await Promise.all([
      db.collection('settings').doc('content').get(),
      db.collection('settings').doc('registrationSettings').get(),
      db.collection('settings').doc('socialLinks').get(),
      db.collection('settings').doc('whatsappGroups').get(),
      db.collection('parties').where('status', '==', 'active').get(),
      db.collection('settings').doc('store').get(),
      db.collection('workshops').get(),
      db.collection('rssFeeds').get(),
      db.collection('settings').doc('partySettings').get()
    ]);

    const contentData = contentDoc.exists ? contentDoc.data() : {};
    const registration = registrationDoc.exists ? registrationDoc.data() : {};
    const socialLinksData = socialLinksDoc.exists ? socialLinksDoc.data() : {};
    const whatsappGroups = whatsappDoc.exists ? whatsappDoc.data() : { men: '', women: '' };
    const storeEnabled = storeSettingsDoc.exists ? (storeSettingsDoc.data()?.enabled === true) : false;
    // Admin-configured retention window (Parties tab → "כמה זמן להשאיר מסיבה").
    // Falls back to the shared 48h default and is sanitised to the safe range.
    const partyRetentionHours = normalizeRetentionHours(
      partySettingsDoc.exists ? partySettingsDoc.data()?.retentionHours : DEFAULT_PARTY_RETENTION_HOURS
    );
    const activeWorkshopsCount = workshopsSnap.docs.filter(d => d.data().active !== false).length;
    const rssFeeds = rssFeedsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(f => f.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const socialLinksArray = [
      { type: 'instagram', label: 'אינסטגרם', url: socialLinksData.instagram || '#' },
      { type: 'channel', label: 'ערוץ טלגרם', url: socialLinksData.telegramChannel || '#' },
      { type: 'discussion', label: 'קבוצת טלגרם', url: socialLinksData.telegramGroup || '#' },
      { type: 'whatsapp', label: 'מדברים בדסמ', url: socialLinksData.whatsapp || '#' },
      { type: 'facebook', label: 'פייסבוק', url: socialLinksData.facebook || '#' }
    ];

    // Expiry rule lives in shared/partyExpiry.js: a party is expired once the
    // Israel-local clock reaches 00:00 of (labeledDate + 2 days). Time is
    // display-only and ignored. Using the shared helper (instead of the host
    // TZ's getUTCDate()+2) avoids off-by-one when the Vercel runtime is UTC.
    const nowMs = Date.now();
    const allParties = partiesSnap.docs.map(doc => {
      const d = doc.data();
      const date = d.date?.toDate ? d.date.toDate() : (d.date ? new Date(d.date) : null);
      return { id: doc.id, _ref: doc.ref, ...d, date };
    }).sort((a, b) => (a.date && b.date) ? a.date - b.date : 0);

    const expiredParties = allParties.filter(p => p.date && isPartyExpiredByDate(p.date, partyRetentionHours, nowMs));
    if (expiredParties.length > 0) {
      console.log(`[Publish] Deleting ${expiredParties.length} expired parties:`, expiredParties.map(p => p.title || p.name));
      await Promise.all(expiredParties.map(p => p._ref.delete()));
    }
    const expiredIds = new Set(expiredParties.map(p => p.id));
    const validParties = allParties.filter(p => !expiredIds.has(p.id));

    const internalParties = validParties.filter(p => (p.partyType || 'internal') === 'internal');
    const externalParties = validParties.filter(p => p.partyType === 'external');

    const formatPartyDate = (date) => date ? date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Jerusalem' }).replace(/\./g, '.') : '';
    // Resolve the party's `expiration` for the public payload. Prefer the value
    // already stored on the doc (admin writes it on create/update + bulk
    // recompute when the rule changes); fall back to computing it here so
    // legacy parties without the field still get a valid timestamp in
    // content.json without a separate migration step.
    const resolveExpirationIso = (party) => {
      if (party.expiration?.toDate) {
        const t = party.expiration.toDate().getTime();
        if (Number.isFinite(t)) return new Date(t).toISOString();
      }
      return party.date ? computePartyExpirationIso(party.date, partyRetentionHours) : null;
    };
    const events = internalParties.map(party => ({
      id: party.id,
      day: party.day || '',
      date: formatPartyDate(party.date),
      title: party.title || party.name || '',
      time: party.time || '',
      dj: party.dj || '',
      img: party.imageURL || '',
      description: party.description || '',
      registrationLink: party.registrationLink || '',
      partyType: party.partyType || 'internal',
      publishToInstagram: party.publishToInstagram === true,
      expiration: resolveExpirationIso(party)
    }));

    const externalEvents = externalParties.map(party => ({
      day: party.day || '',
      date: formatPartyDate(party.date),
      title: party.title || party.name || '',
      time: party.time || '',
      dj: party.dj || '',
      img: party.imageURL || '',
      description: party.description || '',
      registrationLink: party.registrationLink || '',
      partyType: 'external',
      publishToInstagram: party.publishToInstagram === true,
      expiration: resolveExpirationIso(party)
    }));

    const payload = {
      hero: contentData.hero || {},
      about: contentData.about || {},
      contact: contentData.contact || {},
      registration,
      socialLinks: socialLinksArray,
      whatsappGroups,
      events,
      externalEvents,
      labels: contentData.labels || {},
      store: contentData.store || {},
      storeEnabled,
      activeWorkshopsCount,
      rssFeeds,
      // Public site uses this to filter `events` on the homepage; embedding it
      // in content.json means visitors get the admin's chosen window without
      // a Firestore round-trip on first paint.
      partyRetentionHours
    };

    const payloadBase = { ...payload, events: [], externalEvents: [] };
    const partiesOnly = { events, externalEvents };

    const jsonContent = JSON.stringify(payload, null, 2);
    const jsonContentBase = JSON.stringify(payloadBase, null, 2);
    const jsonParties = JSON.stringify(partiesOnly, null, 2);
    const authHeader = GITHUB_TOKEN.startsWith('ghp_') ? `token ${GITHUB_TOKEN}` : `Bearer ${GITHUB_TOKEN}`;

    // GITHUB_BRANCH (main) rejects direct Contents-API writes with
    // "Resource not accessible by personal access token" — main has a
    // ruleset requiring changes to land via Pull Request, which blocks
    // direct-to-branch API writes regardless of token permissions. So this
    // writes to a short-lived branch off GITHUB_BRANCH instead, opens a PR,
    // and tries to auto-merge it with the same token. If the ruleset also
    // requires human review, the merge attempt fails gracefully and the
    // response includes the PR url so the admin can merge it with one click.
    const ghFetch = async (url, options = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: authHeader,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TBDSM-Publish',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      return res;
    };

    const putFile = async (branch, filePath, content, message) => {
      const getRes = await ghFetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${encodeURIComponent(branch)}`
      );
      if (!getRes.ok && getRes.status !== 404) {
        throw new Error(`Reading ${filePath} on "${branch}": ${getRes.status} - ${await getRes.text()}`);
      }
      const existingSha = getRes.status === 404 ? undefined : (await getRes.json()).sha;

      const putRes = await ghFetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message,
            content: Buffer.from(content, 'utf-8').toString('base64'),
            branch,
            ...(existingSha ? { sha: existingSha } : {})
          })
        }
      );
      if (!putRes.ok) throw new Error(`Write ${filePath} on "${branch}": ${putRes.status} - ${await putRes.text()}`);
      return putRes.json();
    };

    const commitMessage = (req.body && req.body.commitMessage) || `Update site content - ${new Date().toISOString()}`;
    const publicPath = `public/${GITHUB_FILE_PATH}`;
    const filesToWrite = [{ path: GITHUB_FILE_PATH, content: jsonContent }];
    if (GITHUB_FILE_PATH === 'content/content.json') {
      filesToWrite.push(
        { path: publicPath, content: jsonContent },
        { path: 'content/content-base.json', content: jsonContentBase },
        { path: 'public/content/content-base.json', content: jsonContentBase },
        { path: 'content/parties.json', content: jsonParties },
        { path: 'public/content/parties.json', content: jsonParties }
      );
    }

    // 1. Resolve the base branch's current commit SHA (Contents API GET on
    //    a file works fine with fine-grained tokens; used here purely to
    //    read the branch's latest commit via its response header-free JSON —
    //    actually simplest is git/refs, which read-only calls tolerate fine;
    //    it's writes that the ruleset blocks).
    const baseRefRes = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`
    );
    if (!baseRefRes.ok) {
      return res.status(500).json({
        error: 'Failed to read base branch',
        message: `Branch "${GITHUB_BRANCH}" not found or no read access: ${baseRefRes.status} - ${await baseRefRes.text()}`
      });
    }
    const baseSha = (await baseRefRes.json()).object.sha;

    // 2. Create a short-lived branch off it.
    const workBranch = `content-publish-${Date.now()}`;
    const createRefRes = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`,
      { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${workBranch}`, sha: baseSha }) }
    );
    if (!createRefRes.ok) {
      return res.status(500).json({
        error: 'Failed to create publish branch',
        message: `${createRefRes.status} - ${await createRefRes.text()}`
      });
    }

    // 3. Write every file to that branch.
    const results = [];
    for (const f of filesToWrite) {
      results.push(await putFile(workBranch, f.path, f.content, commitMessage));
    }

    // 4. Open a PR from it into the base branch.
    const prRes = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: commitMessage,
          head: workBranch,
          base: GITHUB_BRANCH,
          body: 'Automated content publish from the admin panel.'
        })
      }
    );
    if (!prRes.ok) {
      return res.status(500).json({
        error: 'Failed to open publish PR',
        message: `${prRes.status} - ${await prRes.text()}`,
        branch: workBranch
      });
    }
    const pr = await prRes.json();

    // 5. Try to auto-merge it. If the ruleset requires human review this
    //    fails — that's fine, the PR still exists for a one-click merge.
    let merged = false;
    let mergeMessage = null;
    const mergeRes = await ghFetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${pr.number}/merge`,
      { method: 'PUT', body: JSON.stringify({ commit_title: commitMessage, merge_method: 'squash' }) }
    );
    if (mergeRes.ok) {
      merged = true;
    } else {
      mergeMessage = `${mergeRes.status} - ${await mergeRes.text()}`;
    }

    // Mark valid parties as published (needsPublish: false) after Git push
    if (merged) {
      await Promise.all(validParties.map(p => p._ref.update({ needsPublish: false })));
    }

    return res.status(200).json({
      success: true,
      message: merged
        ? `Content published and merged into ${GITHUB_BRANCH}`
        : `PR opened but needs a manual merge (branch protection on ${GITHUB_BRANCH}) — click pr_url to merge it.`,
      merged,
      pr_url: pr.html_url,
      merge_error: merged ? null : mergeMessage,
      files: filesToWrite.map((f) => f.path),
      branch: GITHUB_BRANCH
    });
  } catch (error) {
    console.error('Publish content error:', error);
    return res.status(500).json({
      error: 'Publish failed',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}
