/**
 * Vercel API: advertiser account registration, login, and admin management.
 *
 * Moved server-side because `advertisers` docs hold a bcrypt password hash,
 * and firestore.rules for that collection used to be `allow read, write: if
 * true` — the public Firestore config is necessarily embedded in every page,
 * so anyone could read every advertiser's hash directly (offline brute-force)
 * or write a doc with `status: 'approved'` themselves, completely bypassing
 * admin approval. Firestore rules now deny all client access to `advertisers`
 * (see firestore.rules) — this route, using the Admin SDK, is the only way
 * these documents are read or written.
 *
 * Actions (POST body or `?action=`):
 *   - register   { businessName, contactName, phoneNumber, password }
 *       Public. Creates a pending account. Existence-check + create run
 *       inside one transaction so two concurrent signups with the same
 *       phone can't both succeed (the previous client-side check-then-set
 *       had exactly this race).
 *   - login      { phoneNumber, password }
 *       Public. Rate-limited per phone + per IP (same pattern as forum
 *       auth). Never reveals whether the phone exists.
 *   - list                                    requires ADMIN_API_SECRET
 *   - set-status { advertiserId, status }      requires ADMIN_API_SECRET
 *   - reset-password { advertiserId, newPassword }  requires ADMIN_API_SECRET
 *   - delete     { advertiserId }              requires ADMIN_API_SECRET
 *
 * Every response strips the `password` field — nothing here ever returns
 * the hash to any caller, admin included.
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON, ADMIN_API_SECRET
 */
import bcrypt from 'bcryptjs';
import { getFirebaseAdmin, parseBody, getRequestIp, isRateLimited, sha256Hex, PUBLIC_SITE_URL } from '../lib/forumAuthApi.js';
import { requireAdminApiSecret } from '../lib/apiAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const SALT_ROUNDS = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_PER_PHONE = 8;
const RATE_PER_IP = 20;

const cleanPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('972') && digits.length === 12) return '0' + digits.slice(3);
  return digits;
};

// The cost factor of a bcrypt hash ("$2b$10$..."), or null when the stored value is not a bcrypt hash.
// A broken or absurdly expensive hash must never be fed to bcrypt.compare: it either throws or runs
// for minutes, and the login request then dies without an answer ("Load failed" in the browser).
const bcryptCost = (hash) => {
  const m = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/.exec(String(hash || ''));
  return m ? Number(m[1]) : null;
};
const passwordMatches = async (password, hash) => {
  const cost = bcryptCost(hash);
  if (cost === null || cost > 14) return false;
  try { return await bcrypt.compare(password, hash); } catch { return false; }
};
// The owner closed the advertiser login for now: every login answers with this message.
// Set it back to false to open it again (the tests open it with ADVERTISER_LOGIN_OPEN=1).
const ADVERTISER_LOGIN_CLOSED = true;
export const ADVERTISER_LOGIN_CLOSED_MESSAGE = 'כניסת המפרסמים סגורה כרגע';
const advertiserLoginClosed = () => ADVERTISER_LOGIN_CLOSED && process.env.ADVERTISER_LOGIN_OPEN !== '1';
const throttleDocId = (scope, key) => `${scope}_${sha256Hex(key).slice(0, 32)}`;

const stripPassword = (doc) => {
  if (!doc) return doc;
  const { password, ...rest } = doc;
  return rest;
};

function readAction(req, body) {
  const fromQuery = typeof req.query?.action === 'string' ? req.query.action.trim() : '';
  if (fromQuery) return fromQuery;
  return typeof body.action === 'string' ? body.action.trim() : '';
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  const action = readAction(req, body);

  let admin;
  try {
    admin = await getFirebaseAdmin();
  } catch (err) {
    if (err.code === 'ADMIN_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Server configuration error: GOOGLE_APPLICATION_CREDENTIALS_JSON missing' });
    }
    console.error('advertiser-auth init:', err);
    return res.status(503).json({ error: 'Server configuration error' });
  }
  const db = admin.firestore();
  const advertisersRef = db.collection('advertisers');

  try {
    if (action === 'register') {
      const businessName = String(body.businessName || '').trim();
      const contactName = String(body.contactName || '').trim();
      const phone = cleanPhone(body.phoneNumber);
      const password = String(body.password || '');
      if (!phone) return res.status(400).json({ error: 'מספר טלפון לא תקין' });
      if (!password || password.length < 4) {
        return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 4 תווים' });
      }

      const hashed = await bcrypt.hash(password, SALT_ROUNDS);

      let created;
      try {
        created = await db.runTransaction(async (tx) => {
          // Existence-check + create inside one transaction — closes the
          // TOCTOU race the old client-side check-then-setDoc had (two
          // concurrent signups with the same phone could both pass the
          // "not found" check and create duplicate docs).
          const existing = await tx.get(advertisersRef.where('phoneNumber', '==', phone).limit(1));
          if (!existing.empty) {
            const err = new Error('כבר קיימת בקשת הרשמה עם מספר הטלפון הזה');
            err.code = 'ALREADY_EXISTS';
            throw err;
          }
          const newRef = advertisersRef.doc();
          const data = {
            businessName,
            contactName,
            phoneNumber: phone,
            password: hashed,
            status: 'pending',
            role: 'advertiser',
            createdAt: admin.firestore.Timestamp.now()
          };
          tx.set(newRef, data);
          return { id: newRef.id, ...data };
        });
      } catch (err) {
        if (err.code === 'ALREADY_EXISTS') {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }

      // Best-effort admin alert — never blocks/fails registration. The target
      // used to be built from `req.headers.origin`, an attacker-controlled
      // header — anyone could set Origin to an arbitrary URL and make this
      // server POST the new advertiser's data to it (SSRF / data exfil), or
      // point it at an internal address. Use the site's own known origin
      // instead, never a value from the request.
      const siteUrl = PUBLIC_SITE_URL() || 'https://www.libralparty.net';
      fetch(`${siteUrl}/api/support-chat-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: 'advertiser-signup',
          businessName: created.businessName,
          contactName: created.contactName,
          phoneNumber: created.phoneNumber
        })
      }).catch(() => {});

      return res.status(200).json({ advertiser: stripPassword(created) });
    }

    if (action === 'login') {
      if (advertiserLoginClosed()) return res.status(200).json({ authenticated: false, closed: true, error: ADVERTISER_LOGIN_CLOSED_MESSAGE });
      const phone = cleanPhone(body.phoneNumber);
      const password = String(body.password || '');
      const ip = getRequestIp(req);

      if (await isRateLimited(db, 'advertiser-login-phone', phone, RATE_WINDOW_MS, RATE_PER_PHONE)
        || await isRateLimited(db, 'advertiser-login-ip', ip, RATE_WINDOW_MS, RATE_PER_IP)) {
        // Generic failure, not a 429 — never reveal that rate limiting exists.
        return res.status(200).json({ authenticated: false, error: 'פרטי התחברות שגויים' });
      }

      if (!phone) {
        return res.status(200).json({ authenticated: false, error: 'פרטי התחברות שגויים' });
      }
      // Older accounts may hold the phone with dashes or +972, and the same phone may have been registered
      // twice (a password reset only reaches one of the two). So look the phone up tolerantly and accept
      // the password of any account that has it.
      let docs = (await advertisersRef.where('phoneNumber', '==', phone).get()).docs;
      if (!docs.length) {
        docs = (await advertisersRef.get()).docs.filter((d) => cleanPhone(d.data().phoneNumber) === phone);
      }
      if (!docs.length) {
        return res.status(200).json({ authenticated: false, error: 'פרטי התחברות שגויים' });
      }
      let advertiser = null;
      for (const d of docs) {
        const candidate = { id: d.id, ...d.data() };
        if (await passwordMatches(password, candidate.password)) { advertiser = candidate; break; }
      }
      if (!advertiser) {
        return res.status(200).json({ authenticated: false, error: 'פרטי התחברות שגויים' });
      }
      if (advertiser.status === 'pending') {
        return res.status(200).json({ authenticated: false, error: 'הבקשה שלך עדיין ממתינה לאישור מנהל' });
      }
      if (advertiser.status === 'rejected') {
        return res.status(200).json({ authenticated: false, error: 'הבקשה שלך נדחתה' });
      }
      // Only what the login page needs: a large account document must not bloat (or break) the response.
      const { id, businessName, contactName, phoneNumber, status, role } = advertiser;
      return res.status(200).json({ authenticated: true, advertiser: { id, businessName, contactName, phoneNumber, status, role } });
    }

    // Everything below is admin-only.
    if (!requireAdminApiSecret(req, res)) return;

    if (action === 'list') {
      const snap = await advertisersRef.get();
      const all = snap.docs
        .map((d) => stripPassword({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?._seconds || b.createdAt?.seconds || 0) - (a.createdAt?._seconds || a.createdAt?.seconds || 0));
      return res.status(200).json({ advertisers: all });
    }

    if (action === 'set-status') {
      const { advertiserId, status } = body;
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      if (!advertiserId) return res.status(400).json({ error: 'Missing advertiserId' });
      await advertisersRef.doc(advertiserId).update({ status });
      return res.status(200).json({ ok: true });
    }

    if (action === 'reset-password') {
      const { advertiserId, newPassword } = body;
      if (!advertiserId) return res.status(400).json({ error: 'Missing advertiserId' });
      if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 4 תווים' });
      }
      const ref = advertisersRef.doc(advertiserId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'המפרסם לא נמצא' });
      const hashed = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
      const phone = cleanPhone(snap.data().phoneNumber);
      // Also store the phone in the clean 05XXXXXXXX form the login looks up, and lift any login block.
      await ref.update({ password: hashed, ...(phone ? { phoneNumber: phone } : {}) });
      if (phone) await db.collection('forumAuthThrottle').doc(throttleDocId('advertiser-login-phone', phone)).delete().catch(() => {});
      return res.status(200).json({ ok: true, phoneNumber: phone || null, status: snap.data().status || null });
    }

    // Admin "check account": why a given advertiser cannot log in. Never returns the hash itself.
    if (action === 'check') {
      const { advertiserId } = body;
      if (!advertiserId) return res.status(400).json({ error: 'Missing advertiserId' });
      const snap = await advertisersRef.doc(advertiserId).get();
      if (!snap.exists) return res.status(404).json({ error: 'המפרסם לא נמצא' });
      const d = snap.data();
      const phone = cleanPhone(d.phoneNumber);
      const all = (await advertisersRef.get()).docs.filter((x) => x.id !== advertiserId && cleanPhone(x.data().phoneNumber) === phone);
      const throttle = phone ? await db.collection('forumAuthThrottle').doc(throttleDocId('advertiser-login-phone', phone)).get() : null;
      const since = Date.now() - RATE_WINDOW_MS;
      const recent = throttle?.exists ? (throttle.data().attempts || []).filter((t) => typeof t === 'number' && t >= since).length : 0;
      return res.status(200).json({
        ok: true,
        status: d.status || null,
        phoneStored: d.phoneNumber || null,
        phoneClean: phone || null,
        phoneValid: /^0\d{9}$/.test(phone),
        hashValid: bcryptCost(d.password) !== null && bcryptCost(d.password) <= 14,
        duplicates: all.map((x) => ({ id: x.id, businessName: x.data().businessName || '', status: x.data().status || null })),
        loginBlocked: recent >= RATE_PER_PHONE,
        recentAttempts: recent,
        sizeKb: Math.round(Buffer.byteLength(JSON.stringify(stripPassword(d))) / 1024)
      });
    }

    if (action === 'unblock') {
      const { advertiserId } = body;
      const snap = advertiserId ? await advertisersRef.doc(advertiserId).get() : null;
      if (!snap?.exists) return res.status(404).json({ error: 'המפרסם לא נמצא' });
      const phone = cleanPhone(snap.data().phoneNumber);
      if (phone) await db.collection('forumAuthThrottle').doc(throttleDocId('advertiser-login-phone', phone)).delete();
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const { advertiserId } = body;
      if (!advertiserId) return res.status(400).json({ error: 'Missing advertiserId' });
      await advertisersRef.doc(advertiserId).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('advertiser-auth:', action, err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
