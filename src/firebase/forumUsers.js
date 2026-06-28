import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from './config';

const COL = 'forumUsers';
const SALT_ROUNDS = 10;
/** In-memory cache TTL for batched forum user reads (chat / forum author lists). */
const FORUM_USER_CACHE_TTL_MS = 5 * 60 * 1000;
const forumUserCache = new Map();

/** @returns {object|null|undefined} undefined if uncached or expired */
function getCachedForumUser(id) {
  const e = forumUserCache.get(id);
  if (!e) return undefined;
  if (Date.now() - e.at > FORUM_USER_CACHE_TTL_MS) {
    forumUserCache.delete(id);
    return undefined;
  }
  return e.data;
}

function setCachedForumUser(id, data) {
  forumUserCache.set(id, { data, at: Date.now() });
}

/** Clear cached forum user(s) after profile/role/password mutations. */
export function invalidateForumUserCache(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  list.forEach((id) => {
    if (id) forumUserCache.delete(id);
  });
}

async function fetchForumUsersByIdsUncached(ids) {
  const col = collection(db, COL);
  const out = {};
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const q = query(col, where(documentId(), 'in', chunk));
    const snap = await getDocs(q);
    const seen = new Set();
    snap.docs.forEach((d) => {
      seen.add(d.id);
      const u = stripPassword({ id: d.id, ...d.data() });
      out[d.id] = u;
      setCachedForumUser(d.id, u);
    });
    chunk.forEach((id) => {
      if (!seen.has(id)) {
        out[id] = null;
        setCachedForumUser(id, null);
      }
    });
  }
  return out;
}
// Defensive cap; the admin UI loads every forum user to render the table, so
// keep it generous but bounded against an unexpectedly large collection.
const FORUM_USERS_HARD_LIMIT = 5000;

const stripPassword = (user) => {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
};

const normalizeNickname = (raw) => String(raw || '').trim().slice(0, 30);
const lowerNickname = (raw) => normalizeNickname(raw).toLowerCase();
const normalizeEmail = (raw) => String(raw || '').trim();
const lowerEmail = (raw) => normalizeEmail(raw).toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only Unicode letters (Hebrew/Latin/etc.), digits, underscore and hyphen.
// Excludes spaces, punctuation, emoji, control characters — these break
// mention parsing (`@nick`), URL routing, and admin search.
const NICKNAME_RE = /^[\p{L}\p{N}_-]+$/u;
// Reserved nicknames (lowercased). Block these at registration so attackers
// can't impersonate the platform (e.g. message users from "@admin"). Login is
// untouched so any pre-existing legacy account can still authenticate, but
// `existing-nickname` would block a re-registration anyway.
const RESERVED_NICKNAMES = new Set([
  'admin',
  'administrator',
]);
export const isValidNickname = (raw) => NICKNAME_RE.test(normalizeNickname(raw));
export const isReservedNickname = (raw) => RESERVED_NICKNAMES.has(lowerNickname(raw));

const _getForumUserByNicknameRaw = async (nickname) => {
  const lower = lowerNickname(nickname);
  if (!lower) return null;
  // Primary path: query by denormalized lowercased nickname (case-insensitive).
  const qLower = query(collection(db, COL), where('nicknameLower', '==', lower));
  const snapLower = await getDocs(qLower);
  if (!snapLower.empty) {
    const d = snapLower.docs[0];
    return { id: d.id, ...d.data() };
  }
  // Legacy fallback: pre-migration docs without `nicknameLower`. Match the
  // user's typed casing first, then a one-shot exact-lower match for users
  // who originally registered with a lowercased nickname.
  const original = normalizeNickname(nickname);
  if (original && original !== lower) {
    const qExact = query(collection(db, COL), where('nickname', '==', original));
    const snapExact = await getDocs(qExact);
    if (!snapExact.empty) {
      const d = snapExact.docs[0];
      return { id: d.id, ...d.data() };
    }
  }
  const qLowerExact = query(collection(db, COL), where('nickname', '==', lower));
  const snapLowerExact = await getDocs(qLowerExact);
  if (!snapLowerExact.empty) {
    const d = snapLowerExact.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
};

export const getForumUserByNickname = async (nickname) => {
  return stripPassword(await _getForumUserByNicknameRaw(nickname));
};

const _getForumUserByEmailRaw = async (email) => {
  const lower = lowerEmail(email);
  if (!lower) return null;
  const q = query(collection(db, COL), where('emailLower', '==', lower));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const getForumUserByEmail = async (email) => {
  return stripPassword(await _getForumUserByEmailRaw(email));
};

export const registerForumUser = async (nickname, password, email) => {
  if (!nickname?.trim() || !password) throw new Error('כינוי וסיסמה נדרשים');
  const clean = normalizeNickname(nickname);
  const cleanLower = clean.toLowerCase();
  if (clean.length < 2) throw new Error('כינוי חייב להכיל לפחות 2 תווים');
  if (!NICKNAME_RE.test(clean)) {
    throw new Error('כינוי יכול להכיל אותיות, ספרות, מקף וקו תחתון בלבד');
  }
  if (RESERVED_NICKNAMES.has(cleanLower)) {
    throw new Error('הכינוי הזה שמור — בחר כינוי אחר');
  }
  if (password.length < 4) throw new Error('סיסמה חייבת להכיל לפחות 4 תווים');

  const existing = await _getForumUserByNicknameRaw(clean);
  if (existing) throw new Error('הכינוי כבר תפוס, בחר כינוי אחר');

  let cleanEmail = '';
  let cleanEmailLower = '';
  if (email && String(email).trim()) {
    cleanEmail = normalizeEmail(email);
    cleanEmailLower = cleanEmail.toLowerCase();
    if (!EMAIL_RE.test(cleanEmailLower)) throw new Error('כתובת אימייל לא תקינה');
    const emailExisting = await _getForumUserByEmailRaw(cleanEmailLower);
    if (emailExisting) throw new Error('כתובת האימייל כבר רשומה');
  }

  const ref = doc(collection(db, COL));
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const payload = {
    nickname: clean,
    nicknameLower: cleanLower,
    password: hashed,
    role: 'user',
    isBlocked: false,
    linkedUserId: null,
    createdAt: Timestamp.now()
  };
  if (cleanEmail) {
    payload.email = cleanEmail;
    payload.emailLower = cleanEmailLower;
    payload.emailVerified = false;
  }
  await setDoc(ref, payload);
  return stripPassword({ id: ref.id, ...payload });
};

export const loginForumUser = async (nickname, password) => {
  if (!nickname?.trim() || !password) throw new Error('כינוי וסיסמה נדרשים');
  const user = await _getForumUserByNicknameRaw(nickname.trim());
  if (!user) throw new Error('כינוי לא נמצא');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('סיסמה שגויה');
  if (user.isBlocked) throw new Error('המשתמש חסום');
  // Lazy backfill of `nicknameLower` for legacy accounts so subsequent
  // case-insensitive lookups land on the indexed query path.
  const expectedLower = (user.nickname || '').toLowerCase();
  if (expectedLower && user.nicknameLower !== expectedLower) {
    try {
      await updateDoc(doc(db, COL, user.id), { nicknameLower: expectedLower });
      user.nicknameLower = expectedLower;
      invalidateForumUserCache(user.id);
    } catch {
      /* best-effort */
    }
  }
  return stripPassword(user);
};

export const getForumUserById = async (id) => {
  if (!id) return null;
  const cached = getCachedForumUser(id);
  if (cached !== undefined) return cached;
  const batch = await fetchForumUsersByIdsUncached([id]);
  return batch[id] ?? null;
};

export const getAllForumUsers = async () => {
  const snap = await getDocs(query(collection(db, COL), limit(FORUM_USERS_HARD_LIMIT)));
  return snap.docs.map(d => stripPassword({ id: d.id, ...d.data() }));
};

export const updateForumUser = async (id, updates) => {
  await updateDoc(doc(db, COL, id), updates);
  invalidateForumUserCache(id);
};

export const hashForumPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/** Admin-set password that the user must change on next login. Used by:
 *  - "transfer site user → forum user" (initial temp password)
 *  - "admin reset password" (admin sets a temp value)
 */
export const setForumUserPasswordWithReset = async (id, plainPassword) => {
  if (!id || !plainPassword) throw new Error('חסר משתמש או סיסמה');
  if (plainPassword.length < 4) throw new Error('סיסמה חייבת להכיל לפחות 4 תווים');
  const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  await updateDoc(doc(db, COL, id), { password: hashed, mustResetPassword: true });
  invalidateForumUserCache(id);
};

/** Self-service: clear the must-reset flag once the user picks their new password. */
export const completeForumPasswordReset = async (id, newPlainPassword) => {
  if (!id || !newPlainPassword) throw new Error('חסר משתמש או סיסמה');
  if (newPlainPassword.length < 4) throw new Error('סיסמה חייבת להכיל לפחות 4 תווים');
  const hashed = await bcrypt.hash(newPlainPassword, SALT_ROUNDS);
  await updateDoc(doc(db, COL, id), { password: hashed, mustResetPassword: false });
  invalidateForumUserCache(id);
};

export const deleteForumUser = async (id) => {
  await deleteDoc(doc(db, COL, id));
  invalidateForumUserCache(id);
};

export const setForumUserRole = async (id, role) => {
  await updateDoc(doc(db, COL, id), { role });
  invalidateForumUserCache(id);
};

export const blockForumUser = async (id) => {
  await updateDoc(doc(db, COL, id), { isBlocked: true });
  invalidateForumUserCache(id);
};

export const unblockForumUser = async (id) => {
  await updateDoc(doc(db, COL, id), { isBlocked: false });
  invalidateForumUserCache(id);
};

export const linkForumUserToSiteUser = async (forumUserId, siteUserId) => {
  // Enforce "one forumUser per site user". Unlinking (siteUserId == null) is
  // always allowed; linking is rejected if some OTHER forumUser already
  // points at the same site user.
  if (siteUserId) {
    const existing = await getForumUserBySiteUserId(siteUserId);
    if (existing && existing.id !== forumUserId) {
      throw new Error('למשתמש האתר כבר קיים חשבון פורום מקושר');
    }
  }
  await updateDoc(doc(db, COL, forumUserId), { linkedUserId: siteUserId || null });
  invalidateForumUserCache(forumUserId);
};

/** Set or change a forum user's email. Always resets `emailVerified` to false;
 *  the caller (UI/context) is responsible for triggering a verification email. */
export const setForumUserEmail = async (id, email) => {
  if (!id) throw new Error('חסר משתמש');
  const cleanEmail = normalizeEmail(email);
  const cleanEmailLower = cleanEmail.toLowerCase();
  if (!cleanEmail) {
    await updateDoc(doc(db, COL, id), {
      email: '',
      emailLower: '',
      emailVerified: false
    });
    invalidateForumUserCache(id);
    return;
  }
  if (!EMAIL_RE.test(cleanEmailLower)) throw new Error('כתובת אימייל לא תקינה');
  const taken = await _getForumUserByEmailRaw(cleanEmailLower);
  if (taken && taken.id !== id) throw new Error('כתובת האימייל כבר רשומה');
  await updateDoc(doc(db, COL, id), {
    email: cleanEmail,
    emailLower: cleanEmailLower,
    emailVerified: false
  });
  invalidateForumUserCache(id);
};

/** Admin override: mark a forum user's email as verified without the email round-trip.
 *  Useful when staff control the mailbox or for manual onboarding. */
export const adminMarkForumEmailVerified = async (id) => {
  if (!id) throw new Error('חסר משתמש');
  await updateDoc(doc(db, COL, id), { emailVerified: true });
  invalidateForumUserCache(id);
};

/** One-shot admin migration: ensure every forumUsers doc has `nicknameLower`.
 *  Idempotent; only writes docs that are missing the field. Returns counts.
 *
 *  Uses Firestore writeBatch (max 500 ops/commit) so the whole migration is
 *  one or two round-trips instead of one per user. The previous serial loop
 *  (await updateDoc per doc) was the dominant source of wall-time on the
 *  admin Backfill button. */
export const backfillForumNicknameLower = async () => {
  const snap = await getDocs(query(collection(db, COL), limit(FORUM_USERS_HARD_LIMIT)));
  const total = snap.docs.length;
  const toUpdate = [];
  let skipped = 0;
  for (const d of snap.docs) {
    const data = d.data() || {};
    const expected = String(data.nickname || '').toLowerCase();
    if (expected && data.nicknameLower !== expected) {
      toUpdate.push({ id: d.id, nicknameLower: expected });
    } else {
      skipped += 1;
    }
  }
  let updated = 0;
  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const slice = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    slice.forEach(({ id, nicknameLower }) => {
      batch.update(doc(db, COL, id), { nicknameLower });
    });
    try {
      await batch.commit();
      updated += slice.length;
    } catch {
      skipped += slice.length;
    }
  }
  invalidateForumUserCache(snap.docs.map((d) => d.id));
  return { updated, skipped, total };
};

export const updateForumUserProfile = async (id, { shortBio, bio, profilePhotos }) => {
  const updates = {};
  if (shortBio !== undefined) updates.shortBio = (shortBio || '').slice(0, 60);
  if (bio !== undefined) updates.bio = (bio || '').slice(0, 1000);
  if (profilePhotos !== undefined) {
    updates.profilePhotos = (profilePhotos || []).slice(0, 3)
      .map(p => ({ url: p.url || '' }))
      .filter(p => /^https?:\/\//i.test(p.url));
  }
  if (Object.keys(updates).length === 0) return;
  await updateDoc(doc(db, COL, id), updates);
  invalidateForumUserCache(id);
};

export const getForumUsersByIds = async (ids) => {
  if (!ids || ids.length === 0) return {};
  const unique = [...new Set(ids.filter(Boolean))];
  const map = {};
  const needFetch = [];
  for (const id of unique) {
    const cached = getCachedForumUser(id);
    if (cached !== undefined) {
      if (cached) map[id] = cached;
      continue;
    }
    needFetch.push(id);
  }
  if (needFetch.length === 0) return map;
  const fetched = await fetchForumUsersByIdsUncached(needFetch);
  Object.keys(fetched).forEach((id) => {
    const u = fetched[id];
    if (u) map[id] = u;
  });
  return map;
};

export const getForumUserBySiteUserId = async (siteUserId) => {
  if (!siteUserId) return null;
  const q = query(collection(db, COL), where('linkedUserId', '==', siteUserId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return stripPassword({ id: d.id, ...d.data() });
};
