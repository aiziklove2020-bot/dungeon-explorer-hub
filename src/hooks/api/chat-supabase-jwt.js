import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  isRateLimited,
  getRequestIp,
  lowerNickname,
  PUBLIC_SITE_URL
} from '../lib/forumAuthApi.js';

// Per-nickname: 5 attempts / 15 min — blocks targeted password guessing.
// Per-IP: 20 attempts / 60 min — blocks credential-stuffing across many
// accounts from the same source. Limits are intentionally a little looser
// than the email/reset endpoints because legitimate users can hit this on
// every fresh tab / Capacitor cold-start.
const RATE_PER_NICK_WINDOW_MS = 15 * 60 * 1000;
const RATE_PER_NICK = 5;
const RATE_PER_IP_WINDOW_MS = 60 * 60 * 1000;
const RATE_PER_IP = 20;

function allowedOrigin(reqOrigin) {
  const site = PUBLIC_SITE_URL();
  if (site) {
    if (typeof reqOrigin === 'string' && reqOrigin && reqOrigin === site) return site;
    // No PUBLIC_SITE_URL match — refuse to set the header rather than wildcard.
    return site;
  }
  // Dev / preview without PUBLIC_SITE_URL configured: echo back the origin so
  // localhost and Vercel preview URLs continue to work, but never wildcard.
  if (typeof reqOrigin === 'string' && reqOrigin) return reqOrigin;
  return '';
}

function setCors(req, res) {
  const origin = req.headers?.origin || req.headers?.Origin || '';
  const allow = allowedOrigin(origin);
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

let adminApp = null;

async function getAdmin() {
  const admin = (await import('firebase-admin')).default;
  if (adminApp) return admin;
  if (!admin.apps?.length) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON missing');
    const cred = admin.credential.cert(JSON.parse(raw));
    admin.initializeApp({
      credential: cred,
      projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
    });
  }
  adminApp = true;
  return admin;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

/** PostgREST validates HS256 JWTs; issuer should match the project (see Supabase JWT docs). */
function jwtIssuerForProject() {
  const base = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (base) {
    try {
      const hostname = new URL(base).hostname;
      if (hostname.endsWith('.supabase.co')) return `${base}/auth/v1`;
    } catch {
      /* ignore */
    }
  }
  return String(process.env.SUPABASE_JWT_ISSUER || 'tbdsm-chat-bridge').trim();
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!nickname || !password) {
      return res.status(400).json({ error: 'nickname and password required' });
    }

    const admin = await getAdmin();
    const db = admin.firestore();

    // Rate-limit BEFORE the bcrypt verify so we don't burn CPU for floods.
    // Errors here are logged but never block legitimate login (matches the
    // behaviour of /api/forum-auth: rate-limit is best-effort security, not
    // an availability dependency).
    const ip = getRequestIp(req);
    const nickKey = lowerNickname(nickname);
    try {
      const overNick = nickKey
        ? await isRateLimited(db, 'chatJwtByNick', nickKey, RATE_PER_NICK_WINDOW_MS, RATE_PER_NICK)
        : false;
      const overIp = ip
        ? await isRateLimited(db, 'chatJwtByIp', ip, RATE_PER_IP_WINDOW_MS, RATE_PER_IP)
        : false;
      if (overNick || overIp) {
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
    } catch (err) {
      console.warn('chat-supabase-jwt: rate-limit error (continuing)', err);
    }

    const trimmed = nickname.slice(0, 30);
    const lower = trimmed.toLowerCase();
    let snap = await db.collection('forumUsers').where('nicknameLower', '==', lower).limit(1).get();
    if (snap.empty) {
      // Legacy fallback for accounts predating the case-insensitive migration.
      snap = await db.collection('forumUsers').where('nickname', '==', trimmed).limit(1).get();
      if (snap.empty && trimmed !== lower) {
        snap = await db.collection('forumUsers').where('nickname', '==', lower).limit(1).get();
      }
    }
    if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });
    const userDoc = snap.docs[0];
    const forumUser = userDoc.data() || {};
    if (forumUser.isBlocked === true) return res.status(403).json({ error: 'Blocked user' });
    const hash = forumUser.password;
    if (!hash || typeof hash !== 'string') {
      return res.status(500).json({ error: 'Forum user password hash missing' });
    }
    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const forumUid = userDoc.id;
    const forumAdmin = forumUser.role === 'forumAdmin';
    let chatGlobalMod = forumAdmin;
    if (!chatGlobalMod && forumUser.linkedUserId) {
      const site = await db.collection('users').doc(String(forumUser.linkedUserId)).get();
      const lvl = site.data()?.level;
      if (lvl === 'admin' || site.data()?.isAdmin === true) chatGlobalMod = true;
    }

    const secret = requireEnv('SUPABASE_JWT_SECRET');
    const ttlSec = Number(process.env.SUPABASE_CHAT_JWT_TTL_SECONDS || 3600);
    const expSec = Math.max(300, Math.min(24 * 3600, Number.isFinite(ttlSec) ? ttlSec : 3600));

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: 'authenticated',
      sub: forumUid,
      role: 'authenticated',
      forum_uid: forumUid,
      forum_admin: forumAdmin,
      chat_global_mod: chatGlobalMod,
      iss: jwtIssuerForProject(),
      iat: now,
      exp: now + expSec
    };
    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
    return res.status(200).json({
      token,
      exp: payload.exp,
      forumUid,
      forumAdmin,
      chatGlobalMod
    });
  } catch (err) {
    console.error('chat-supabase-jwt', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
