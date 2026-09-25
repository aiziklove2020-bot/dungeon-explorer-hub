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
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON, ADMIN_API_SECRET
 */
import bcrypt from 'bcryptjs';
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import { getFirebaseAdmin } from '../lib/forumAuthApi.js';

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

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('admin-settings:', action, err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
