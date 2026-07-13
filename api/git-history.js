/**
 * GET: Return recent commits on the publish branch (who pushed, when, what changed).
 * Uses GitHub API. No auth required for public repos; GITHUB_TOKEN required for private.
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` header. Even though
 *       the data is public on GitHub, the endpoint is admin-only to avoid exposing
 *       the burnable GITHUB_TOKEN rate limit / quota to anonymous callers.
 *
 * Env: ADMIN_API_SECRET, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH (default PublishMode), GITHUB_TOKEN (optional for public repo).
 *
 * POST: Record that a production deploy succeeded (merged in from the former
 * standalone /api/record-deploy-status.js to stay under the Vercel Hobby plan's
 * 12-serverless-function limit). Called by the GitHub Action (vercel-deploy-tag)
 * after creating the deploy/prod-* tag. Writes to Firestore settings/deployStatus
 * so the website can show "Build: passed" in the footer.
 *
 * Env: DEPLOY_STATUS_SECRET (must match the secret sent by the Action), GOOGLE_APPLICATION_CREDENTIALS_JSON
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';

function cleanCommitMessage(msg) {
  if (typeof msg !== 'string') return msg;
  return msg
    .split(/\r?\n/)
    .filter((line) => line.trim() !== 'Made-with: Cursor')
    .join('\n')
    .trim();
}

async function handleRecordDeployStatus(req, res) {
  const expectedSecret = process.env.DEPLOY_STATUS_SECRET;
  if (!expectedSecret) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'DEPLOY_STATUS_SECRET is not set in environment variables'
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { secret, commitSha, tag, timestamp } = body;
  if (secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Must use same Firebase project as the website (tbdsm-5acca) so the footer can read settings/deployStatus
  const projectId = process.env.GCLOUD_PROJECT || 'tbdsm-5acca';
  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.apps?.length) {
      const cred = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({
        credential: cred,
        projectId
      });
    }
  } catch (e) {
    console.error('Firebase init:', e.message, 'projectId:', projectId);
    return res.status(503).json({
      error: 'Firebase configuration error',
      message: e.message
    });
  }

  const db = admin.firestore();
  const { Timestamp } = await import('firebase-admin/firestore');

  const lastSuccessAt = timestamp
    ? (timestamp instanceof Date ? timestamp : new Date(timestamp))
    : new Date();

  try {
    await db.collection('settings').doc('deployStatus').set({
      lastSuccessAt: lastSuccessAt instanceof Date ? Timestamp.fromDate(lastSuccessAt) : lastSuccessAt,
      commitSha: commitSha || null,
      tag: tag || null
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Firestore write:', e.message);
    return res.status(500).json({
      error: 'Failed to record deploy status',
      message: e.message
    });
  }
}

export default async function handler(req, res) {
  // POST is the former /api/record-deploy-status behavior (see header comment).
  if (req.method === 'POST') {
    return handleRecordDeployStatus(req, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminApiSecret(req, res)) return;

  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'PublishMode';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(400).json({
      error: 'Missing GitHub config',
      message: 'Set GITHUB_OWNER and GITHUB_REPO to fetch git history.'
    });
  }

  const authHeader = GITHUB_TOKEN
    ? (GITHUB_TOKEN.startsWith('ghp_') ? `token ${GITHUB_TOKEN}` : `Bearer ${GITHUB_TOKEN}`)
    : null;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TBDSM-GitHistory',
    ...(authHeader && { Authorization: authHeader })
  };

  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?sha=${encodeURIComponent(GITHUB_BRANCH)}&per_page=20`,
      { headers }
    );
    if (!listRes.ok) {
      const text = await listRes.text();
      return res.status(listRes.status === 404 ? 404 : 502).json({
        error: 'Failed to fetch commits',
        message: text || `HTTP ${listRes.status}`,
        branch: GITHUB_BRANCH
      });
    }
    const list = await listRes.json();
    if (!Array.isArray(list)) {
      return res.status(502).json({ error: 'Invalid response from GitHub', message: 'Expected commits array' });
    }

    const commitsWithDetails = [];
    const detailLimit = 5;
    for (let i = 0; i < Math.min(list.length, detailLimit); i++) {
      const c = list[i];
      const author = c.author
        ? {
            name: c.commit?.author?.name ?? c.author.login ?? 'Unknown',
            email: c.commit?.author?.email ?? null,
            login: c.author.login ?? null,
            avatar_url: c.author.avatar_url ?? null
          }
        : {
            name: c.commit?.author?.name ?? 'Unknown',
            email: c.commit?.author?.email ?? null,
            login: null,
            avatar_url: null
          };
      const base = {
        sha: c.sha,
        message: cleanCommitMessage(c.commit?.message ?? ''),
        author,
        date: c.commit?.author?.date ?? c.commit?.committer?.date ?? null,
        html_url: c.html_url ?? null
      };
      const detailRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${c.sha}`,
        { headers }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const files = Array.isArray(detail.files)
          ? detail.files.map((f) => ({
              filename: f.filename,
              status: f.status ?? 'modified',
              additions: f.additions ?? 0,
              deletions: f.deletions ?? 0
            }))
          : [];
        commitsWithDetails.push({ ...base, files });
      } else {
        commitsWithDetails.push({ ...base, files: [] });
      }
    }
    for (let i = detailLimit; i < list.length; i++) {
      const c = list[i];
      const author = c.author
        ? {
            name: c.commit?.author?.name ?? c.author.login ?? 'Unknown',
            email: c.commit?.author?.email ?? null,
            login: c.author.login ?? null,
            avatar_url: c.author.avatar_url ?? null
          }
        : {
            name: c.commit?.author?.name ?? 'Unknown',
            email: c.commit?.author?.email ?? null,
            login: null,
            avatar_url: null
          };
      commitsWithDetails.push({
        sha: c.sha,
        message: cleanCommitMessage(c.commit?.message ?? ''),
        author,
        date: c.commit?.author?.date ?? c.commit?.committer?.date ?? null,
        html_url: c.html_url ?? null,
        files: []
      });
    }

    return res.status(200).json({
      branch: GITHUB_BRANCH,
      commits: commitsWithDetails
    });
  } catch (e) {
    console.error('Git history error:', e);
    return res.status(500).json({
      error: 'Failed to load git history',
      message: e?.message ?? String(e)
    });
  }
}
