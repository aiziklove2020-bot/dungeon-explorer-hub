/**
 * Vercel API: Single dispatcher for forum email verification + password reset.
 *
 * Consolidated into one Serverless Function (was 4 separate routes) to stay
 * under the Vercel Hobby plan's 12-function limit. Behavior, status codes,
 * and response bodies are identical to the original routes — clients select
 * the operation via `?action=` (preferred) or `body.action`.
 *
 * Actions:
 *   - verify-request   POST { forumUserId? , identifier? }
 *       Send (or resend) an email-verification magic link. Always 200 to
 *       avoid enumeration. Rate-limited per identifier and per IP.
 *
 *   - verify-confirm   POST { token }
 *       Redeem the verification token; sets emailVerified=true atomically.
 *       200 ok | 410 expired/used | 400 invalid_token
 *
 *   - reset-request    POST { identifier }   identifier = nickname OR email
 *       Send a password-reset magic link. Gated on emailVerified === true to
 *       prevent takeover via attacker-set email. Always 200.
 *
 *   - reset-confirm    POST { token, newPassword }
 *       Bcrypt-hashes newPassword, atomically writes password +
 *       mustResetPassword=false, marks the token used.
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON, RESEND_API_KEY, RESEND_FROM_EMAIL,
 *      PUBLIC_SITE_URL
 */
import bcrypt from 'bcryptjs';
import {
  getFirebaseAdmin,
  generateToken,
  parseBody,
  getRequestIp,
  findForumUserByIdentifier,
  isRateLimited,
  lowerEmail,
  lowerNickname,
  sha256Hex,
  PUBLIC_SITE_URL
} from '../lib/forumAuthApi.js';
import {
  sendForumEmailVerification,
  sendForumPasswordReset
} from '../lib/email.js';

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_PER_IDENTIFIER = 3;
const RATE_PER_IP_WINDOW_MS = 60 * 60 * 1000;
const RATE_PER_IP = 10;
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LEN = 4;
const MAX_PASSWORD_LEN = 200;

function readAction(req, body) {
  // Prefer query string so the routing intent is visible in logs.
  const fromQuery = typeof req.query?.action === 'string' ? req.query.action.trim() : '';
  if (fromQuery) return fromQuery;
  return typeof body.action === 'string' ? body.action.trim() : '';
}

async function getDb(res, label) {
  let admin;
  try {
    admin = await getFirebaseAdmin();
  } catch (err) {
    console.error(`${label}: admin init`, err);
    res.status(503).json({ error: 'server_not_configured' });
    return null;
  }
  return admin.firestore();
}

async function handleVerifyRequest(req, res, body) {
  const db = await getDb(res, 'forum-auth verify-request');
  if (!db) return;

  const forumUserId = typeof body.forumUserId === 'string' ? body.forumUserId.trim() : '';
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const ip = getRequestIp(req);

  if (!forumUserId && !identifier) {
    return res.status(400).json({ error: 'forumUserId or identifier required' });
  }

  const rateKey = forumUserId || (identifier.includes('@') ? lowerEmail(identifier) : lowerNickname(identifier));
  try {
    const overId = await isRateLimited(db, 'verifyById', rateKey, RATE_WINDOW_MS, RATE_PER_IDENTIFIER);
    const overIp = ip ? await isRateLimited(db, 'verifyByIp', ip, RATE_PER_IP_WINDOW_MS, RATE_PER_IP) : false;
    if (overId || overIp) return res.status(200).json({ ok: true });
  } catch (err) {
    console.warn('forum-auth verify-request: rate-limit error (continuing)', err);
  }

  let user = null;
  try {
    if (forumUserId) {
      const snap = await db.collection('forumUsers').doc(forumUserId).get();
      if (snap.exists) user = { id: snap.id, ...snap.data() };
    } else {
      user = await findForumUserByIdentifier(db, identifier);
    }
  } catch (err) {
    console.error('forum-auth verify-request: lookup', err);
  }

  if (!user || !user.email || user.emailVerified === true || user.isBlocked === true) {
    return res.status(200).json({ ok: true });
  }

  const siteUrl = PUBLIC_SITE_URL();
  if (!siteUrl) {
    console.error('forum-auth verify-request: PUBLIC_SITE_URL missing — cannot build verify URL');
    return res.status(200).json({ ok: true });
  }

  try {
    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
    await db.collection('forumEmailTokens').doc(hash).set({
      tokenHash: hash,
      forumUserId: user.id,
      email: user.email,
      expiresAt,
      usedAt: null,
      requestedIp: ip || '',
      createdAt: new Date()
    });

    const verifyUrl = `${siteUrl}/forum/verify-email?token=${raw}`;
    await sendForumEmailVerification({
      to: user.email,
      nickname: user.nickname || '',
      verifyUrl
    });
  } catch (err) {
    if (err?.code === 'EMAIL_NOT_CONFIGURED') {
      console.error('forum-auth verify-request: Resend not configured');
    } else {
      console.error('forum-auth verify-request: send', err);
    }
  }

  return res.status(200).json({ ok: true });
}

async function handleVerifyConfirm(req, res, body) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length < 32 || token.length > 256) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const db = await getDb(res, 'forum-auth verify-confirm');
  if (!db) return;

  const tokenHash = sha256Hex(token);
  const tokenRef = db.collection('forumEmailTokens').doc(tokenHash);

  try {
    const result = await db.runTransaction(async (tx) => {
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists) return { status: 'invalid' };
      const data = tokenSnap.data() || {};
      if (data.usedAt) return { status: 'used' };
      const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt || 0);
      if (!expiresAt || expiresAt.getTime() < Date.now()) return { status: 'expired' };
      const userId = data.forumUserId;
      if (!userId) return { status: 'invalid' };
      const userRef = db.collection('forumUsers').doc(userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) return { status: 'invalid' };
      tx.update(userRef, { emailVerified: true });
      tx.update(tokenRef, { usedAt: new Date() });
      return { status: 'ok' };
    });

    if (result.status === 'ok') return res.status(200).json({ ok: true });
    if (result.status === 'expired' || result.status === 'used') {
      return res.status(410).json({ error: 'expired' });
    }
    return res.status(400).json({ error: 'invalid_token' });
  } catch (err) {
    console.error('forum-auth verify-confirm:', err);
    return res.status(500).json({ error: 'internal' });
  }
}

async function handleResetRequest(req, res, body) {
  const db = await getDb(res, 'forum-auth reset-request');
  if (!db) return;

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const ip = getRequestIp(req);
  if (!identifier) return res.status(400).json({ error: 'identifier required' });

  const rateKey = identifier.includes('@') ? lowerEmail(identifier) : lowerNickname(identifier);
  try {
    const overId = await isRateLimited(db, 'resetById', rateKey, RATE_WINDOW_MS, RATE_PER_IDENTIFIER);
    const overIp = ip ? await isRateLimited(db, 'resetByIp', ip, RATE_PER_IP_WINDOW_MS, RATE_PER_IP) : false;
    if (overId || overIp) return res.status(200).json({ ok: true });
  } catch (err) {
    console.warn('forum-auth reset-request: rate-limit error (continuing)', err);
  }

  let user = null;
  try {
    user = await findForumUserByIdentifier(db, identifier);
  } catch (err) {
    console.error('forum-auth reset-request: lookup', err);
  }

  if (!user || !user.email || user.emailVerified !== true || user.isBlocked === true) {
    return res.status(200).json({ ok: true });
  }

  const siteUrl = PUBLIC_SITE_URL();
  if (!siteUrl) {
    console.error('forum-auth reset-request: PUBLIC_SITE_URL missing — cannot build reset URL');
    return res.status(200).json({ ok: true });
  }

  try {
    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await db.collection('forumPasswordResets').doc(hash).set({
      tokenHash: hash,
      forumUserId: user.id,
      expiresAt,
      usedAt: null,
      requestedIp: ip || '',
      createdAt: new Date()
    });

    const resetUrl = `${siteUrl}/forum/reset?token=${raw}`;
    await sendForumPasswordReset({
      to: user.email,
      nickname: user.nickname || '',
      resetUrl
    });
  } catch (err) {
    if (err?.code === 'EMAIL_NOT_CONFIGURED') {
      console.error('forum-auth reset-request: Resend not configured');
    } else {
      console.error('forum-auth reset-request: send', err);
    }
  }

  return res.status(200).json({ ok: true });
}

async function handleResetConfirm(req, res, body) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!token || token.length < 32 || token.length > 256) {
    return res.status(400).json({ error: 'invalid_token' });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LEN) {
    return res.status(400).json({ error: 'password_too_short' });
  }
  if (newPassword.length > MAX_PASSWORD_LEN) {
    return res.status(400).json({ error: 'password_too_long' });
  }

  const db = await getDb(res, 'forum-auth reset-confirm');
  if (!db) return;

  const tokenHash = sha256Hex(token);
  const tokenRef = db.collection('forumPasswordResets').doc(tokenHash);

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  } catch (err) {
    console.error('forum-auth reset-confirm: bcrypt hash', err);
    return res.status(500).json({ error: 'internal' });
  }

  try {
    const result = await db.runTransaction(async (tx) => {
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists) return { status: 'invalid' };
      const data = tokenSnap.data() || {};
      if (data.usedAt) return { status: 'used' };
      const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt || 0);
      if (!expiresAt || expiresAt.getTime() < Date.now()) return { status: 'expired' };
      const userId = data.forumUserId;
      if (!userId) return { status: 'invalid' };
      const userRef = db.collection('forumUsers').doc(userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) return { status: 'invalid' };
      const userData = userSnap.data() || {};
      if (userData.isBlocked === true) return { status: 'blocked' };
      tx.update(userRef, {
        password: hashedPassword,
        mustResetPassword: false
      });
      tx.update(tokenRef, { usedAt: new Date() });
      return { status: 'ok' };
    });

    if (result.status === 'ok') return res.status(200).json({ ok: true });
    if (result.status === 'expired' || result.status === 'used') {
      return res.status(410).json({ error: 'expired' });
    }
    if (result.status === 'blocked') {
      return res.status(403).json({ error: 'blocked' });
    }
    return res.status(400).json({ error: 'invalid_token' });
  } catch (err) {
    console.error('forum-auth reset-confirm:', err);
    return res.status(500).json({ error: 'internal' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  const action = readAction(req, body);

  switch (action) {
    case 'verify-request':
      return handleVerifyRequest(req, res, body);
    case 'verify-confirm':
      return handleVerifyConfirm(req, res, body);
    case 'reset-request':
      return handleResetRequest(req, res, body);
    case 'reset-confirm':
      return handleResetConfirm(req, res, body);
    default:
      return res.status(400).json({ error: 'unknown_action' });
  }
}
