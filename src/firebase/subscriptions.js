/**
 * Subscriptions module.
 *
 * The product supports two independent subscription kinds:
 *   - `parties`         — regular parties
 *   - `exchangeParties` — swinger / exchange parties
 *
 * Each subscription has its own tier (month / halfYear / year / gold) and its
 * own expiry date. A user can hold one, both, or neither. The legacy single
 * `level` + `registrationExpiry` model is preserved for backward compatibility
 * and is kept in sync with `subscriptions.parties` on every write.
 *
 * This file is the single source of truth for everything subscription-related;
 * older helpers in `users.js` are thin wrappers around the functions exported
 * here.
 */

import { invalidateCache } from './dataAccess';
import { callAdminSettings } from '../utils/adminApi';

export const SUBSCRIPTION_KINDS = {
  parties: { id: 'parties', label: 'מסיבות' },
  exchangeParties: { id: 'exchangeParties', label: 'מסיבות חילופים' },
};

export const SUBSCRIPTION_KIND_IDS = Object.keys(SUBSCRIPTION_KINDS);

export const SUBSCRIPTION_TIERS = {
  day: { id: 'day', label: 'יום אחד', days: 1 },
  month: { id: 'month', label: 'חודש', months: 1 },
  halfYear: { id: 'halfYear', label: 'חצי שנה', months: 6 },
  year: { id: 'year', label: 'שנה', months: 12 },
  gold: { id: 'gold', label: 'זהב', months: null },
};

export const SUBSCRIPTION_TIER_IDS = Object.keys(SUBSCRIPTION_TIERS);

const EXPIRING_SOON_DAYS = 30;

const isPlainObject = (val) => val && typeof val === 'object' && !Array.isArray(val);

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

/**
 * Convert legacy `registrationExpiry` + `level` to a `subscriptions.parties`
 * shape. Used both by the lazy-migration read path and by the one-shot
 * migration script. Pure function — no DB writes.
 *
 * Returns `null` when there is no signal of an existing parties subscription
 * (e.g. plain `regular` users, blocked/admin without expiry).
 */
export const migrateLegacyPartiesSubscription = (user) => {
  if (!user || typeof user !== 'object') return null;

  if (user.level === 'gold' && !user.registrationExpiry) {
    return {
      tier: 'gold',
      expiry: null,
      startDate: toIso(user.registrationStartDate) || new Date().toISOString(),
      lastRenewedAt: toIso(user.registrationStartDate) || new Date().toISOString(),
      lastRenewalTier: 'gold',
    };
  }

  const expiry = toIso(user.registrationExpiry);
  if (expiry && user.level === 'registered') {
    return {
      tier: 'year',
      expiry,
      startDate: toIso(user.registrationStartDate) || new Date().toISOString(),
      lastRenewedAt: toIso(user.registrationStartDate) || new Date().toISOString(),
      lastRenewalTier: 'year',
    };
  }

  return null;
};

/**
 * Normalize a raw user document. If `subscriptions` is missing but legacy
 * `registrationExpiry`/`level` indicate an existing subscription, derive a
 * `subscriptions.parties` block on the fly so the rest of the app sees a
 * uniform shape. This is read-only — the original document on disk is left
 * unchanged until something writes through `addOrExtendSubscription` etc.
 */
export const normalizeUserSubscriptions = (user) => {
  if (!user || typeof user !== 'object') return user;
  if (isPlainObject(user.subscriptions)) {
    const subs = {
      parties: user.subscriptions.parties || null,
      exchangeParties: user.subscriptions.exchangeParties || null,
    };
    return { ...user, subscriptions: subs };
  }

  const partiesSub = migrateLegacyPartiesSubscription(user);
  return {
    ...user,
    subscriptions: {
      parties: partiesSub,
      exchangeParties: null,
    },
  };
};

/**
 * Inspect a single subscription kind on a (possibly already-normalized) user.
 * Always safe to call; returns a stable shape with `isActive: false` when the
 * user has no record for that kind.
 */
export const getSubscription = (user, kind) => {
  if (!SUBSCRIPTION_KINDS[kind]) {
    throw new Error(`Unknown subscription kind: ${kind}`);
  }
  const normalized = normalizeUserSubscriptions(user);
  const raw = normalized?.subscriptions?.[kind] || null;

  if (!raw) {
    return {
      kind,
      exists: false,
      tier: null,
      isGold: false,
      isActive: false,
      isExpired: false,
      isExpiringSoon: false,
      expiry: null,
      expiryDate: null,
      daysRemaining: null,
      startDate: null,
      lastRenewedAt: null,
      lastRenewalTier: null,
      message: 'אין מנוי',
    };
  }

  if (raw.tier === 'gold') {
    return {
      kind,
      exists: true,
      tier: 'gold',
      isGold: true,
      isActive: true,
      isPrivileged: true,
      isExpired: false,
      isExpiringSoon: false,
      expiry: null,
      expiryDate: null,
      daysRemaining: null,
      startDate: toIso(raw.startDate),
      lastRenewedAt: toIso(raw.lastRenewedAt),
      lastRenewalTier: raw.lastRenewalTier || 'gold',
      message: 'מנוי זהב - לעולם לא פג תוקף',
    };
  }

  const expiryDate = parseDate(raw.expiry);
  if (!expiryDate) {
    return {
      kind,
      exists: true,
      tier: raw.tier || null,
      isGold: false,
      isActive: false,
      isPrivileged: false,
      isExpired: true,
      isExpiringSoon: false,
      expiry: null,
      expiryDate: null,
      daysRemaining: null,
      startDate: toIso(raw.startDate),
      lastRenewedAt: toIso(raw.lastRenewedAt),
      lastRenewalTier: raw.lastRenewalTier || raw.tier || null,
      message: 'מנוי ללא תאריך תפוגה תקין',
    };
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = diffDays < 0;
  const isExpiringSoon = !isExpired && diffDays <= EXPIRING_SOON_DAYS;

  return {
    kind,
    exists: true,
    tier: raw.tier || null,
    isGold: false,
    isActive: !isExpired,
    isPrivileged: !isExpired && raw.tier === 'year',
    isExpired,
    isExpiringSoon,
    expiry: expiryDate.toISOString(),
    expiryDate,
    daysRemaining: diffDays,
    startDate: toIso(raw.startDate),
    lastRenewedAt: toIso(raw.lastRenewedAt),
    lastRenewalTier: raw.lastRenewalTier || raw.tier || null,
    message: isExpired
      ? `המנוי פג תוקף לפני ${Math.abs(diffDays)} ימים`
      : `נשארו ${diffDays} ימים עד פקיעת המנוי`,
  };
};

/**
 * Compute the derived `level` field from the subscriptions map. `admin` and
 * `blocked` always win — they are independent of subscriptions. Otherwise:
 *   - any active gold subscription  -> 'gold'
 *   - any active timed subscription -> 'registered'
 *   - else                          -> 'regular'
 */
export const deriveUserLevel = (userData) => {
  if (!userData) return 'regular';
  if (userData.level === 'admin' || userData.isAdmin) return 'admin';
  if (userData.level === 'blocked') return 'blocked';

  const partiesInfo = getSubscription(userData, 'parties');
  const exchangeInfo = getSubscription(userData, 'exchangeParties');

  if (partiesInfo.isGold || exchangeInfo.isGold) return 'gold';
  if (partiesInfo.isActive || exchangeInfo.isActive) return 'registered';
  return 'regular';
};

// firestore.rules blocks a plain client write from ever setting a
// subscription tier to 'gold' or level to 'admin' (see safeSubscriptionsUpdate/
// safeLevelUpdate there) — before that fix, any visitor could grant
// themselves a permanent gold subscription with a single updateDoc. These
// three (admin-only in every real caller — SubscriptionsSection.jsx) now go
// through api/admin-settings.js's admin-* subscription actions, which run
// the equivalent transactional read-modify-write via the Admin SDK
// (bypassing that rule, same as every other admin-only action moved
// server-side this round).
const afterSubscriptionChange = async (userId) => {
  await invalidateCache(`userById_${userId}`);
  await invalidateCache('allUsers');
};

/**
 * Apply a tier (month/halfYear/year/gold) to a kind. If the user already has
 * an active subscription of that kind, the new period stacks onto the
 * existing expiry (so paying for "another month" on Jan 15 with expiry Feb 1
 * extends to Mar 1, not to Feb 15).
 */
export const addOrExtendSubscription = async (userId, kind, tier) => {
  if (!SUBSCRIPTION_KINDS[kind]) throw new Error(`Unknown subscription kind: ${kind}`);
  if (!SUBSCRIPTION_TIERS[tier]) throw new Error(`Unknown subscription tier: ${tier}`);
  const { next } = await callAdminSettings('admin-add-subscription', { userId, kind, tier });
  await afterSubscriptionChange(userId);
  return next;
};

/**
 * Set an explicit expiry date for a kind. Pass `explicitTier` when the caller
 * knows the real tier being granted (e.g. an admin picking "יומי"/"שנתי") —
 * it always wins. Without it, tier is auto-classified: gold when
 * `expiryDate` is null/undefined, otherwise we keep the previous tier (or fall
 * back to `year` for a brand-new subscription).
 */
export const setSubscriptionExpiry = async (userId, kind, expiryDate, explicitTier) => {
  if (!SUBSCRIPTION_KINDS[kind]) throw new Error(`Unknown subscription kind: ${kind}`);
  const { next } = await callAdminSettings('admin-set-subscription-expiry', { userId, kind, expiryDate, explicitTier });
  await afterSubscriptionChange(userId);
  return next;
};

/**
 * Cancel a single subscription kind. Other kinds (and admin/blocked status)
 * are left untouched. The legacy `level` is recomputed automatically.
 */
export const removeSubscription = async (userId, kind) => {
  if (!SUBSCRIPTION_KINDS[kind]) throw new Error(`Unknown subscription kind: ${kind}`);
  await callAdminSettings('admin-remove-subscription', { userId, kind });
  await afterSubscriptionChange(userId);
};

/**
 * Convenience: does this user have at least one active (non-expired)
 * subscription of any kind? Useful for derived UI flags.
 */
export const hasAnyActiveSubscription = (user) => {
  const normalized = normalizeUserSubscriptions(user);
  return SUBSCRIPTION_KIND_IDS.some((kind) => getSubscription(normalized, kind).isActive);
};

/**
 * Convenience: does this user hold a *privileged* subscription (yearly, or
 * the perpetual gold tier)? Day-tier subscriptions are active but not
 * privileged — features like favorites/match-reveal/photo-upload require
 * this, not just `hasAnyActiveSubscription`.
 */
export const hasAnyPrivilegedSubscription = (user) => {
  const normalized = normalizeUserSubscriptions(user);
  return SUBSCRIPTION_KIND_IDS.some((kind) => getSubscription(normalized, kind).isPrivileged);
};
