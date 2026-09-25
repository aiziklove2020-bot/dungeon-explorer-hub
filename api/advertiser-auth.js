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
import { getFirebaseAdmin, parseBody, getRequestIp, isRateLimited } from '../lib/forumAuthApi.js';
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

      // Best-effort admin alert — never blocks/fails registration.
      fetch(`${req.headers.origin || ''}/api/support-chat-send`, {
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
      const snap = await advertisersRef.where('phoneNumber', '==', phone).limit(1).get();
      if (snap.empty) {
        return res.status(200).json({ authenticated: false, error: 'פרטי התחברות שגויים' });
      }
      const advertiser = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (advertiser.status === 'pending') {
        return res.status(200).json({ authenticated: false, error: 'הבקשה שלך עדיין ממתינה לאישור מנהל' });
      }
      if (advertiser.status === 'rejected') {
        return res.status(200).json({ authenticated: false, error: 'הבקשה שלך נדחתה' });
      }
      const ok = await bcrypt.compare(password, advertiser.password || '');
      if (!ok) {
        return res.status(200).json({ authenticated: false, error: 'פרטי התחברות שגויים' });
      }
      return res.status(200).json({ authenticated: true, advertiser: stripPassword(advertiser) });
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
      const hashed = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
      await advertisersRef.doc(advertiserId).update({ password: hashed });
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
