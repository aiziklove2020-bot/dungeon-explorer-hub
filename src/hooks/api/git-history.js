/**
 * GET: Return recent commits on the publish branch (who pushed, when, what changed).
 * Uses GitHub API. No auth required for public repos; GITHUB_TOKEN required for private.
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` header. Even though
 *       the data is public on GitHub, the endpoint is admin-only to avoid exposing
 *       the burnable GITHUB_TOKEN rate limit / quota to anonymous callers.
 *
 * Env: ADMIN_API_SECRET, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH (default PublishMode), GITHUB_TOKEN (optional for public repo).
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

export default async function handler(req, res) {
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
