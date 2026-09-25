/**
 * Admin-only Vercel API: writes to Firestore `settings/*` docs and the
 * `rssFeeds` collection via the Admin SDK, PLUS (see the admin-account
 * actions further down) the site's own admin-login system, which lives in
 * the `users` collection alongside every regular subscriber.
 *
 * firestore.rules locks `settings`/`rssFeeds`/`users` to deny plain client
 * writes to the fields these actions touch — this app has no real Firebase
 * Auth adopted, so a client-side security rule can't tell "the admin panel"
 * apart from "anyone who has the public Firestore config" (which is
 * necessarily public, since every page embeds it). This route is the only
 * way those documents/fields get written now: the admin panel calls it
 * instead of touching Firestore directly, and the ADMIN_API_SECRET bearer
 * token (baked into the admin bundle at build time, same as every other
 * admin-only route) is the actual access control.
 *
 * Before this route existed, `settings/{document}` allowed `write: if true`
 * with no check at all — anyone who found the Firestore config could write
 * arbitrary content (about/contact copy, social links, Telegram config)
 * straight into fields the public site renders, bypassing the admin panel
 * and the app's own escaping entirely. `users` had the same problem, worse:
 * `allow write: if true` meant any visitor could open devtools and run
 * `updateDoc(doc(db,'users','<their own id>'), { isAdmin: true })` to grant
 * themselves full admin-panel access with no password at all, and
 * `allow read: if true` let anyone pull every admin's bcrypt password hash
 * for offline brute-forcing (checkAdminLogin/authenticateAdmin used to
 * bcrypt.compare in the browser, which only works if the hash is
 * client-readable).
 *
 * POST { action: 'set-settings', docId, data }
 *   docId must be one of ALLOWED_SETTINGS_DOC_IDS. Writes settings/{docId}
 *   with merge:true — the same semantics every prior client setDoc(...,
 *   { merge: true }) call had.
 *
 * POST { action: 'add-rss-feed', data }
 * POST { action: 'update-rss-feed', feedId, data }
 * POST { action: 'delete-rss-feed', feedId }
 * POST { action: 'restore-rss-feed', feedId, data } — same as add-rss-feed
 *   but preserves the given doc id, for full-DB backup restore.
 *
 * Admin-account actions (all operate on `users` docs with isAdmin semantics):
 * POST { action: 'admin-login', username, password }
 *   Ports authenticateAdmin() from src/firebase/users.js server-side,
 *   bcrypt-hash and all, including the default-admin bootstrap/bcrypt
 *   auto-upgrade/active-admin-swap logic. Returns the same shape that
 *   function did, minus the password field.
 * POST { action: 'admin-set-password', adminId, newPassword }
 * POST { action: 'admin-list' }
 * POST { action: 'admin-set-active', adminId, isActive }
 * POST { action: 'admin-make-admin', userId, username, password }
 * POST { action: 'admin-remove-admin', adminId }
 *
 * Subscription actions (all operate on `users/{userId}.subscriptions`/`level`):
 * POST { action: 'admin-add-subscription', userId, kind, tier }
 * POST { action: 'admin-set-subscription-expiry', userId, kind, expiryDate, explicitTier }
 * POST { action: 'admin-remove-subscription', userId, kind }
 * POST { action: 'admin-set-level', userId, level, expiryDate }
 *
 * CRM actions (all operate on `users/{userId}.crm`, same rationale as above —
 * firestore.rules denies plain clients any write to the `crm` field, since a
 * forged crm.source/crm.payments entry would corrupt the admin panel's sales
 * records with no way to tell it apart from a real payment):
 * POST { action: 'admin-set-crm-source', userId, source, sourceNote }
 * POST { action: 'admin-add-crm-payment', userId, record }
 *   record: { date?, amount?, method?, note? } — server assigns id/createdAt.
 * POST { action: 'admin-delete-crm-payment', userId, recordId }
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON, ADMIN_API_SECRET
 */
import bcrypt from 'bcryptjs';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import { getFirebaseAdmin } from '../lib/forumAuthApi.js';

// ── Subscription logic, ported from src/firebase/subscriptions.js ──────────
// Pure computation only (no Firestore calls) — kept in lockstep with that
// file's SUBSCRIPTION_TIERS/computeNextSubscription/deriveUserLevel/
// buildLegacyFieldsFromSubscriptions. Duplicated here (rather than imported)
// because that file pulls in the browser Firestore client SDK and
// browser-only caching, neither of which belong in a serverless function.
const SUBSCRIPTION_TIERS = {
  day: { months: null, days: 1 },
  month: { months: 1, days: null },
  halfYear: { months: 6, days: null },
  year: { months: 12, days: null },
  gold: { months: null, days: null }
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value?.seconds != null) {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};
const toIso = (value) => {
  const d = parseDate(value);
  return d ? d.toISOString() : null;
};
const addMonths = (date, months) => {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
};

const normalizeSubs = (user) => {
  const subs = user?.subscriptions;
  if (subs && typeof subs === 'object' && !Array.isArray(subs)) {
    return { parties: subs.parties || null, exchangeParties: subs.exchangeParties || null };
  }
  return { parties: null, exchangeParties: null };
};

const getSubInfo = (sub) => {
  if (!sub) return { exists: false, isGold: false, isActive: false };
  if (sub.tier === 'gold') return { exists: true, isGold: true, isActive: true };
  const expiryDate = parseDate(sub.expiry);
  if (!expiryDate) return { exists: true, isGold: false, isActive: false };
  return { exists: true, isGold: false, isActive: expiryDate.getTime() > Date.now(), expiry: expiryDate.toISOString() };
};

const deriveLevel = (userData, subs) => {
  if (userData.level === 'admin' || userData.isAdmin) return 'admin';
  if (userData.level === 'blocked') return 'blocked';
  const p = getSubInfo(subs.parties);
  const e = getSubInfo(subs.exchangeParties);
  if (p.isGold || e.isGold) return 'gold';
  if (p.isActive || e.isActive) return 'registered';
  return 'regular';
};

const buildLegacyFields = (userData, subs) => {
  const level = deriveLevel(userData, subs);
  const p = getSubInfo(subs.parties);
  const e = getSubInfo(subs.exchangeParties);
  let registrationExpiry = null;
  let registrationStartDate = null;
  if (p.isGold) {
    registrationStartDate = subs.parties?.startDate || new Date().toISOString();
  } else if (p.exists && p.expiry) {
    registrationExpiry = p.expiry;
    registrationStartDate = subs.parties?.startDate || new Date().toISOString();
  } else if (e.isGold) {
    registrationStartDate = subs.exchangeParties?.startDate || new Date().toISOString();
  } else if (e.exists && e.expiry) {
    registrationStartDate = subs.exchangeParties?.startDate || new Date().toISOString();
  }
  return { level, registrationExpiry, registrationStartDate };
};

const computeNextSubscription = (prevSub, tier) => {
  if (!SUBSCRIPTION_TIERS[tier]) throw new Error(`Unknown subscription tier: ${tier}`);
  const nowIso = new Date().toISOString();
  const startDate = prevSub?.startDate ? toIso(prevSub.startDate) || nowIso : nowIso;
  if (tier === 'gold') {
    return { tier: 'gold', expiry: null, startDate, lastRenewedAt: nowIso, lastRenewalTier: 'gold' };
  }
  const { months, days } = SUBSCRIPTION_TIERS[tier];
  const prevExpiry = parseDate(prevSub?.expiry);
  const base = prevExpiry && prevExpiry.getTime() > Date.now() ? prevExpiry : new Date();
  const nextExpiry = months ? addMonths(base, months) : addDays(base, days);
  return { tier, expiry: nextExpiry.toISOString(), startDate, lastRenewedAt: nowIso, lastRenewalTier: tier };
};

/** Read-modify-write a subscription kind inside an Admin-SDK transaction. */
const applySubscriptionChange = async (db, userId, kind, computeNext) => {
  const userRef = db.collection('users').doc(userId);
  let next;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error('User not found');
    const userData = snap.data();
    const subs = normalizeSubs(userData);
    const prev = subs[kind] || null;
    next = computeNext(prev, userData);
    const nextSubsMap = { ...subs, [kind]: next };
    const legacy = buildLegacyFields(userData, nextSubsMap);
    const updateData = {
      subscriptions: nextSubsMap,
      registrationExpiry: legacy.registrationExpiry,
      registrationStartDate: legacy.registrationStartDate
    };
    if (userData.level !== 'admin' && userData.level !== 'blocked' && !userData.isAdmin) {
      updateData.level = legacy.level;
    }
    tx.update(userRef, updateData);
  });
  return next;
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Every settings/{docId} document any part of the app actually writes today
// (src/firebase/settings.js, partySettings.js, siteConfig.js). Anything not
// on this list is refused — this list IS the access-control boundary now
// that the Firestore rule itself denies all writes.
const ALLOWED_SETTINGS_DOC_IDS = new Set([
  'socialLinks',
  'telegram',
  'supportChat',
  'aboutStory',
  'whatsappGroups',
  'content',
  'registrationSettings',
  'rssTickerSettings',
  'liveChat',
  'partySettings',
  'siteConfig',
  'storeSettings'
]);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdminApiSecret(req, res)) return;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const action = typeof body.action === 'string' ? body.action : '';

  let admin;
  try {
    admin = await getFirebaseAdmin();
  } catch (err) {
    if (err.code === 'ADMIN_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Server configuration error: GOOGLE_APPLICATION_CREDENTIALS_JSON missing' });
    }
    console.error('admin-settings init:', err);
    return res.status(503).json({ error: 'Server configuration error' });
  }
  const db = admin.firestore();

  try {
    if (action === 'set-settings') {
      const { docId, data } = body;
      if (typeof docId !== 'string' || !ALLOWED_SETTINGS_DOC_IDS.has(docId)) {
        return res.status(400).json({ error: 'Unknown or missing docId' });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ error: 'data must be an object' });
      }
      await db.collection('settings').doc(docId).set(data, { merge: true });
      return res.status(200).json({ ok: true });
    }

    if (action === 'add-rss-feed') {
      const { data } = body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'data must be an object' });
      }
      const newFeed = {
        text: typeof data.text === 'string' ? data.text : '',
        enabled: data.enabled !== false,
        order: Number.isFinite(data.order) ? data.order : 0,
        createdAt: new Date().toISOString()
      };
      const ref = await db.collection('rssFeeds').add(newFeed);
      return res.status(200).json({ ok: true, id: ref.id, ...newFeed });
    }

    if (action === 'update-rss-feed') {
      const { feedId, data } = body;
      if (typeof feedId !== 'string' || !feedId) {
        return res.status(400).json({ error: 'Missing feedId' });
      }
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'data must be an object' });
      }
      await db.collection('rssFeeds').doc(feedId).update({
        text: typeof data.text === 'string' ? data.text : '',
        enabled: data.enabled !== false,
        order: Number.isFinite(data.order) ? data.order : 0,
        updatedAt: new Date().toISOString()
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete-rss-feed') {
      const { feedId } = body;
      if (typeof feedId !== 'string' || !feedId) {
        return res.status(400).json({ error: 'Missing feedId' });
      }
      await db.collection('rssFeeds').doc(feedId).delete();
      return res.status(200).json({ ok: true });
    }

    // Full-DB backup restore (src/firebase/dbBackup.js) needs to recreate an
    // rssFeeds doc at its ORIGINAL id, unlike add-rss-feed's auto-generated
    // one — that's the only difference from set-settings, just against a
    // different collection.
    if (action === 'restore-rss-feed') {
      const { feedId, data } = body;
      if (typeof feedId !== 'string' || !feedId) {
        return res.status(400).json({ error: 'Missing feedId' });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ error: 'data must be an object' });
      }
      await db.collection('rssFeeds').doc(feedId).set(data, { merge: true });
      return res.status(200).json({ ok: true });
    }

    // ── Admin-account actions ──────────────────────────────────────────
    const usersRef = db.collection('users');
    const stripPassword = (u) => {
      if (!u) return u;
      const { password, ...rest } = u;
      return rest;
    };

    const getAdminByUsername = async (username) => {
      const snap = await usersRef.where('adminUsername', '==', username).limit(1).get();
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    };

    const getDefaultAdminDoc = async () => {
      const snap = await usersRef.where('isDefaultAdmin', '==', true).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      const bootstrapped = {
        adminUsername: 'admin',
        password: null,
        isAdmin: true,
        isDefaultAdmin: true,
        isActive: true,
        name: 'Default Admin',
        createdAt: new Date().toISOString()
      };
      const ref = usersRef.doc();
      await ref.set(bootstrapped);
      return { id: ref.id, ...bootstrapped };
    };

    const checkActiveAdmins = async () => {
      const snap = await usersRef.where('isAdmin', '==', true).get();
      return snap.docs.some((d) => {
        const u = d.data();
        return u.isActive && !u.isDefaultAdmin;
      });
    };

    const activateDefaultAdminIfNeeded = async () => {
      const hasActiveAdmins = await checkActiveAdmins();
      if (!hasActiveAdmins) {
        const defaultAdmin = await getDefaultAdminDoc();
        if (defaultAdmin && !defaultAdmin.isActive) {
          await usersRef.doc(defaultAdmin.id).update({ isActive: true });
        }
      }
    };

    if (action === 'admin-login') {
      const { username, password } = body;
      await activateDefaultAdminIfNeeded();

      let admin = await getAdminByUsername(username);
      if (!admin) admin = await getDefaultAdminDoc();
      if (!admin) return res.status(200).json({ authenticated: false, error: 'Admin not found' });

      if (admin.isDefaultAdmin && username === 'admin' && !admin.password) {
        return res.status(200).json({ admin: stripPassword(admin), isFirstLogin: true });
      }
      if (!admin.isActive && !admin.isDefaultAdmin) {
        return res.status(200).json({ authenticated: false, error: 'Admin account is disabled' });
      }
      if (admin.isDefaultAdmin) {
        const hasActiveAdmins = await checkActiveAdmins();
        if (!hasActiveAdmins) {
          await usersRef.doc(admin.id).update({ isActive: true });
          admin.isActive = true;
        } else if (!admin.isActive) {
          return res.status(200).json({ authenticated: false, error: 'Default admin is disabled' });
        }
      }
      if (!admin.password) {
        return res.status(200).json({ admin: stripPassword(admin), isFirstLogin: true });
      }

      const looksHashed = typeof admin.password === 'string' && admin.password.startsWith('$2');
      let ok = false;
      if (looksHashed) {
        ok = await bcrypt.compare(password || '', admin.password);
      } else {
        ok = admin.password === password;
        if (ok) {
          try {
            const upgraded = await bcrypt.hash(password, 10);
            await usersRef.doc(admin.id).update({ password: upgraded });
            admin.password = upgraded;
          } catch (err) {
            console.error('admin password auto-upgrade failed:', err);
          }
        }
      }
      if (!ok) return res.status(200).json({ authenticated: false, error: 'Invalid password' });
      return res.status(200).json({ authenticated: true, admin: stripPassword(admin) });
    }

    if (action === 'admin-set-password') {
      const { adminId, newPassword } = body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (!adminId) return res.status(400).json({ error: 'Missing adminId' });
      const hashed = await bcrypt.hash(newPassword, 10);
      await usersRef.doc(adminId).update({ password: hashed });
      return res.status(200).json({ ok: true });
    }

    if (action === 'admin-list') {
      const snap = await usersRef.where('isAdmin', '==', true).get();
      return res.status(200).json({ admins: snap.docs.map((d) => stripPassword({ id: d.id, ...d.data() })) });
    }

    if (action === 'admin-set-active') {
      const { adminId, isActive } = body;
      if (!adminId) return res.status(400).json({ error: 'Missing adminId' });
      const snap = await usersRef.doc(adminId).get();
      if (!snap.exists) return res.status(404).json({ error: 'User not found' });
      const userData = snap.data();
      if (!isActive && userData.isDefaultAdmin) {
        const hasActiveAdmins = await checkActiveAdmins();
        if (!hasActiveAdmins) {
          return res.status(400).json({ error: 'Cannot disable default admin when no other active admins exist' });
        }
      }
      await usersRef.doc(adminId).update({ isActive: !!isActive });
      if (!isActive) await activateDefaultAdminIfNeeded();
      return res.status(200).json({ ok: true });
    }

    if (action === 'admin-make-admin') {
      const { userId, username, password } = body;
      if (!userId || !username || !password) {
        return res.status(400).json({ error: 'Missing userId, username or password' });
      }
      const existingAdmin = await getAdminByUsername(username);
      if (existingAdmin && existingAdmin.id !== userId) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      const hashed = await bcrypt.hash(password, 10);
      await usersRef.doc(userId).update({
        isAdmin: true,
        adminUsername: username,
        password: hashed,
        isActive: true
      });
      const hasActiveAdmins = await checkActiveAdmins();
      if (hasActiveAdmins) {
        const defaultAdmin = await getDefaultAdminDoc();
        if (defaultAdmin && defaultAdmin.isActive) {
          await usersRef.doc(defaultAdmin.id).update({ isActive: false });
        }
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'admin-remove-admin') {
      const { adminId } = body;
      if (!adminId) return res.status(400).json({ error: 'Missing adminId' });
      const snap = await usersRef.doc(adminId).get();
      if (!snap.exists) return res.status(404).json({ error: 'User not found' });
      if (snap.data().isDefaultAdmin) {
        return res.status(400).json({ error: 'Cannot remove default admin' });
      }
      await usersRef.doc(adminId).update({
        isAdmin: false,
        adminUsername: null,
        password: null,
        isActive: false
      });
      await activateDefaultAdminIfNeeded();
      return res.status(200).json({ ok: true });
    }

    // ── Subscription / level actions ────────────────────────────────────
    // firestore.rules blocks a plain client update from setting
    // level:'admin' or any subscription tier to 'gold' (see the comment on
    // safeLevelUpdate()/safeSubscriptionsUpdate() there) — before that fix,
    // anyone could grant themselves a permanent gold subscription or
    // admin-level status with a single updateDoc. These actions are the
    // only way to legitimately grant either now.
    const SUBSCRIPTION_KIND_IDS = ['parties', 'exchangeParties'];
    const SUBSCRIPTION_TIER_IDS = Object.keys(SUBSCRIPTION_TIERS);

    if (action === 'admin-add-subscription') {
      const { userId, kind, tier } = body;
      if (!SUBSCRIPTION_KIND_IDS.includes(kind)) return res.status(400).json({ error: 'Unknown subscription kind' });
      if (!SUBSCRIPTION_TIER_IDS.includes(tier)) return res.status(400).json({ error: 'Unknown subscription tier' });
      const next = await applySubscriptionChange(db, userId, kind, (prev) => computeNextSubscription(prev, tier));
      return res.status(200).json({ ok: true, next });
    }

    if (action === 'admin-set-subscription-expiry') {
      const { userId, kind, expiryDate, explicitTier } = body;
      if (!SUBSCRIPTION_KIND_IDS.includes(kind)) return res.status(400).json({ error: 'Unknown subscription kind' });
      const next = await applySubscriptionChange(db, userId, kind, (prev) => {
        const nowIso = new Date().toISOString();
        if (!expiryDate) {
          return { tier: 'gold', expiry: null, startDate: prev?.startDate ? toIso(prev.startDate) || nowIso : nowIso, lastRenewedAt: nowIso, lastRenewalTier: 'gold' };
        }
        const iso = toIso(expiryDate);
        if (!iso) throw new Error('Invalid expiry date');
        const tier = SUBSCRIPTION_TIER_IDS.includes(explicitTier) ? explicitTier : (prev?.tier && prev.tier !== 'gold' ? prev.tier : 'year');
        return { tier, expiry: iso, startDate: prev?.startDate ? toIso(prev.startDate) || nowIso : nowIso, lastRenewedAt: nowIso, lastRenewalTier: tier };
      });
      return res.status(200).json({ ok: true, next });
    }

    if (action === 'admin-remove-subscription') {
      const { userId, kind } = body;
      if (!SUBSCRIPTION_KIND_IDS.includes(kind)) return res.status(400).json({ error: 'Unknown subscription kind' });
      await applySubscriptionChange(db, userId, kind, () => null);
      return res.status(200).json({ ok: true });
    }

    if (action === 'admin-set-level') {
      const { userId, level, expiryDate } = body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      const userRef = usersRef.doc(userId);

      if (level === 'registered') {
        if (expiryDate) {
          await applySubscriptionChange(db, userId, 'parties', (prev) => {
            const nowIso = new Date().toISOString();
            const iso = toIso(expiryDate);
            if (!iso) throw new Error('Invalid expiry date');
            const tier = prev?.tier && prev.tier !== 'gold' ? prev.tier : 'year';
            return { tier, expiry: iso, startDate: prev?.startDate ? toIso(prev.startDate) || nowIso : nowIso, lastRenewedAt: nowIso, lastRenewalTier: tier };
          });
        } else {
          await applySubscriptionChange(db, userId, 'parties', (prev) => computeNextSubscription(prev, 'year'));
        }
        return res.status(200).json({ ok: true });
      }
      if (level === 'gold') {
        await applySubscriptionChange(db, userId, 'parties', (prev) => computeNextSubscription(prev, 'gold'));
        return res.status(200).json({ ok: true });
      }
      if (level === 'regular') {
        await applySubscriptionChange(db, userId, 'parties', () => null);
        return res.status(200).json({ ok: true });
      }
      if (level === 'blocked') {
        await userRef.update({
          level: 'blocked',
          registrationExpiry: null,
          registrationStartDate: null,
          subscriptions: { parties: null, exchangeParties: null }
        });
        return res.status(200).json({ ok: true });
      }
      if (level === 'admin') {
        await userRef.update({ level: 'admin' });
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: `Unknown level: ${level}` });
    }

    // ── CRM actions ──────────────────────────────────────────────────────
    // firestore.rules denies any client write that touches `crm` at all
    // (see the comment on /users/{userId}) — previously anyone could
    // updateDoc `crm.payments`/`crm.source` on ANY user doc (ids are
    // enumerable, since non-admin user reads are open) with no admin
    // involved, forging fabricated payment history or corrupting
    // lead-attribution data. These three mirror src/firebase/crm.js
    // exactly, via the Admin SDK.
    const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (action === 'admin-set-crm-source') {
      const { userId, source, sourceNote } = body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      await usersRef.doc(userId).update({
        'crm.source': typeof source === 'string' ? source : '',
        'crm.sourceNote': typeof sourceNote === 'string' ? sourceNote : ''
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'admin-add-crm-payment') {
      const { userId, record } = body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      const r = record && typeof record === 'object' ? record : {};
      const entry = {
        id: genId(),
        date: typeof r.date === 'string' && r.date ? r.date : new Date().toISOString().split('T')[0],
        amount: r.amount ? Number(r.amount) : null,
        method: typeof r.method === 'string' ? r.method : '',
        note: typeof r.note === 'string' ? r.note.trim() : '',
        createdAt: new Date().toISOString()
      };
      await usersRef.doc(userId).update({
        'crm.payments': FieldValue.arrayUnion(entry)
      });
      return res.status(200).json({ ok: true, entry });
    }

    if (action === 'admin-delete-crm-payment') {
      const { userId, recordId } = body;
      if (!userId || !recordId) return res.status(400).json({ error: 'Missing userId or recordId' });
      const snap = await usersRef.doc(userId).get();
      if (!snap.exists) return res.status(404).json({ error: 'User not found' });
      const payments = Array.isArray(snap.data()?.crm?.payments) ? snap.data().crm.payments : [];
      const target = payments.find((p) => p.id === recordId);
      if (!target) return res.status(200).json({ ok: true });
      await usersRef.doc(userId).update({
        'crm.payments': FieldValue.arrayRemove(target)
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('admin-settings:', action, err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
