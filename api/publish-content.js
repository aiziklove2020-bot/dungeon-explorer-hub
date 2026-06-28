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
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import {
  DEFAULT_PARTY_RETENTION_HOURS,
  computePartyExpirationIso,
  isPartyExpiredByDate,
  normalizeRetentionHours,
} from '../shared/partyExpiry.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminApiSecret(req, res)) return;

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
    if (!admin.apps?.length) {
      const cred = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
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

    // Parties with needsPublish=true will get Telegram notification (sent by browser after response)
    const partiesToNotify = validParties.filter(p => p.needsPublish === true);
    console.log(`[Publish] partiesToNotify: ${partiesToNotify.length}`, partiesToNotify.map(p => p.title || p.name));

    const getFileSha = async (filePath) => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
        {
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TBDSM-Publish'
          }
        }
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`GitHub API: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      return data.sha;
    };

    const createBlob = async (content) => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'TBDSM-Publish'
          },
          body: JSON.stringify({ content: Buffer.from(content, 'utf-8').toString('base64'), encoding: 'base64' })
        }
      );
      if (!response.ok) throw new Error(`Create blob: ${response.status} - ${await response.text()}`);
      return response.json();
    };

    const createTree = async (baseTreeSha, files) => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'TBDSM-Publish'
          },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: files })
        }
      );
      if (!response.ok) throw new Error(`Create tree: ${response.status} - ${await response.text()}`);
      return response.json();
    };

    const createCommit = async (treeSha, parentSha, message) => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'TBDSM-Publish'
          },
          body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] })
        }
      );
      if (!response.ok) throw new Error(`Create commit: ${response.status} - ${await response.text()}`);
      return response.json();
    };

    const updateRef = async (commitSha) => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'TBDSM-Publish'
          },
          body: JSON.stringify({ sha: commitSha })
        }
      );
      if (!response.ok) throw new Error(`Update ref: ${response.status} - ${await response.text()}`);
      return response.json();
    };

    const refRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`,
      {
        headers: {
          Authorization: authHeader,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TBDSM-Publish'
        }
      }
    );

    if (!refRes.ok) {
      return res.status(500).json({
        error: 'Failed to get branch',
        message: `Branch "${GITHUB_BRANCH}" not found or no access. Ensure GITHUB_OWNER, GITHUB_REPO and GITHUB_TOKEN are correct.`,
        status: refRes.status
      });
    }

    const refData = await refRes.json();
    const currentCommitSha = refData.object.sha;

    const commitRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${currentCommitSha}`,
      {
        headers: {
          Authorization: authHeader,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TBDSM-Publish'
        }
      }
    );
    if (!commitRes.ok) throw new Error(`Get commit: ${commitRes.status}`);
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    const blob = await createBlob(jsonContent);
    const blobBase = await createBlob(jsonContentBase);
    const blobParties = await createBlob(jsonParties);
    const filePaths = [GITHUB_FILE_PATH];
    const publicPath = `public/${GITHUB_FILE_PATH}`;
    if (GITHUB_FILE_PATH === 'content/content.json') {
      filePaths.push(publicPath);
      filePaths.push('content/content-base.json', 'public/content/content-base.json', 'content/parties.json', 'public/content/parties.json');
    }
    const treeFiles = [
      { path: GITHUB_FILE_PATH, mode: '100644', type: 'blob', sha: blob.sha },
      ...(GITHUB_FILE_PATH === 'content/content.json' ? [
        { path: publicPath, mode: '100644', type: 'blob', sha: blob.sha },
        { path: 'content/content-base.json', mode: '100644', type: 'blob', sha: blobBase.sha },
        { path: 'public/content/content-base.json', mode: '100644', type: 'blob', sha: blobBase.sha },
        { path: 'content/parties.json', mode: '100644', type: 'blob', sha: blobParties.sha },
        { path: 'public/content/parties.json', mode: '100644', type: 'blob', sha: blobParties.sha }
      ] : [])
    ];
    const tree = await createTree(baseTreeSha, treeFiles);

    const commitMessage = (req.body && req.body.commitMessage) || `Update site content - ${new Date().toISOString()}`;
    const commit = await createCommit(tree.sha, currentCommitSha, commitMessage);
    await updateRef(commit.sha);

    // Mark valid parties as published (needsPublish: false) after Git push
    await Promise.all(validParties.map(p => p._ref.update({ needsPublish: false })));

    // Return notifiedParties to the client so it can send Telegram notifications via the browser (same path as main branch)
    const notifiedParties = partiesToNotify.map(p => ({
      id: p.id,
      name: p.name || p.title || '',
      title: p.title || p.name || '',
      day: p.day || '',
      date: p.date ? p.date.toISOString() : null,
      time: p.time || '',
      dj: p.dj || '',
      description: p.description || '',
      imageURL: p.imageURL || '',
      maleLimit: p.maleLimit ?? null,
      femaleLimit: p.femaleLimit ?? null,
      partyType: p.partyType || 'internal'
    }));

    return res.status(200).json({
      success: true,
      message: `Content published to branch ${GITHUB_BRANCH}`,
      commit: { sha: commit.sha, message: commitMessage, url: commit.url },
      files: filePaths,
      branch: GITHUB_BRANCH,
      notifiedParties
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
