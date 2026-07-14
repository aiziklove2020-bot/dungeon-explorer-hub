/**
 * Shared helpers for the forum email-verification + password-reset API routes.
 *
 * Lives outside /api/ so Vercel never exposes it as an HTTP route. The API
 * files import from here at module scope; Vercel bundles static imports.
 */

import { Buffer } from 'node:buffer';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

let _adminApp = null;

/** Cached Firebase Admin SDK init, mirrors the pattern in api/support-send.js. */
export async function getFirebaseAdmin() {
  const admin = (await import('firebase-admin')).default;
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
  if (_adminApp) return admin;
  if (!admin.apps?.length) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) {
      const err = new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON missing');
      err.code = 'ADMIN_NOT_CONFIGURED';
      throw err;
    }
    const cred = admin.cert(JSON.parse(raw));
    admin.initializeApp({
      credential: cred,
      projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
    });
  }
  _adminApp = true;
  return admin;
}

/** Generate a fresh raw token + its sha256 hex digest. */
export function generateToken() {
  const raw = randomBytes(32).toString('hex');
  const hash = sha256Hex(raw);
  return { raw, hash };
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

/** Constant-time string compare. */
export function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim().toLowerCase());
}

export function normalizeEmail(value) {
  return String(value || '').trim();
}

export function lowerEmail(value) {
  return normalizeEmail(value).toLowerCase();
}

export function lowerNickname(value) {
  return String(value || '').trim().slice(0, 30).toLowerCase();
}

/** Read body whether Vercel parsed it or not. */
export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return req.body;
}

/** Best-effort client-IP extraction from common Vercel/Cloudflare/proxy headers. */
export function getRequestIp(req) {
  const fwd = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  const real = req.headers?.['x-real-ip'] || req.headers?.['X-Real-IP'];
  if (typeof real === 'string' && real) return real.trim();
  return req.socket?.remoteAddress || '';
}

/** Look up a forum user by nickname OR email, with legacy-nickname fallback. */
export async function findForumUserByIdentifier(db, identifier) {
  const value = String(identifier || '').trim();
  if (!value) return null;

  if (value.includes('@')) {
    const lower = lowerEmail(value);
    const snap = await db.collection('forumUsers').where('emailLower', '==', lower).limit(1).get();
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }
    return null;
  }

  const lower = lowerNickname(value);
  let snap = await db.collection('forumUsers').where('nicknameLower', '==', lower).limit(1).get();
  if (snap.empty) {
    const original = value.slice(0, 30);
    snap = await db.collection('forumUsers').where('nickname', '==', original).limit(1).get();
    if (snap.empty && original !== lower) {
      snap = await db.collection('forumUsers').where('nickname', '==', lower).limit(1).get();
    }
  }
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * Rate limit a key by maintaining a small per-key throttle doc holding the
 * timestamps of recent attempts. Avoids Firestore composite indexes by
 * storing all bookkeeping in a single doc keyed by a hash of the rate key.
 *
 * Returns `true` if the new attempt is OVER the limit (caller should silently
 * no-op but still return the generic success response so attackers can't
 * probe). Otherwise returns `false` and records the attempt.
 */
export async function isRateLimited(db, scope, key, windowMs, maxAttempts) {
  if (!key) return false;
  const docId = `${scope}_${sha256Hex(key).slice(0, 32)}`;
  const ref = db.collection('forumAuthThrottle').doc(docId);
  const now = Date.now();
  const since = now - windowMs;
  let limited = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = (snap.exists ? snap.data().attempts : []) || [];
    const recent = prev.filter((t) => typeof t === 'number' && t >= since);
    if (recent.length >= maxAttempts) {
      limited = true;
      return;
    }
    recent.push(now);
    tx.set(ref, {
      scope,
      attempts: recent.slice(-Math.max(maxAttempts, 10)),
      lastAt: new Date(now)
    });
  });
  return limited;
}

export const PUBLIC_SITE_URL = () => String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
