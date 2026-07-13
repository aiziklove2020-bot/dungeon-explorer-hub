/**
 * Shared party-expiry rule, used by:
 *   - src/pages/Home.jsx              (homepage events filter)
 *   - src/firebase/parties.js         (client-side Firestore cleanup)
 *   - api/publish-content.js          (publish-time Firestore cleanup + JSON filter)
 *   - api/import-content-from-git.js  (re-import skip)
 *
 * Rule: a party is expired once `retentionHours` have passed since the *end*
 * of the labeled day in Asia/Jerusalem (i.e. the cutoff is `00:00 IL of
 * (labeledDate + 1)` plus `retentionHours`).
 *
 *   - The window is counted from the end of the day, not its start, so a
 *     "Friday 15.05" party with the 24h preset stays visible for *all of
 *     Saturday* and disappears Sunday 00:00 IL — matching the admin's mental
 *     model of "keep it for the day itself, then N hours more". With the 48h
 *     default it disappears Monday 00:00 IL — i.e. it's already gone on Monday.
 *   - `retentionHours` is admin-configurable (Parties tab); defaults to 48h.
 *   - The "labeled date" is the date the admin entered (e.g. "Friday 15.05") —
 *     NOT the night-owl-shifted real party moment (e.g. Saturday 00:00 for a
 *     "Friday 00:00" party).
 *   - The party `time` ("HH:MM") is intentionally ignored: it's display-only
 *     for guests and would otherwise change the cutoff in confusing ways.
 */

export const ISRAEL_TZ = 'Asia/Jerusalem';

/** Default retention window when no admin-configured value is provided. */
export const DEFAULT_PARTY_RETENTION_HOURS = 48;

/** Bounds for the configurable value — guards against bad input from settings. */
const MIN_RETENTION_HOURS = 1;
const MAX_RETENTION_HOURS = 24 * 30; // 30 days hard ceiling.

/** Coerce arbitrary input into a sane retention-hours integer. */
export function normalizeRetentionHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PARTY_RETENTION_HOURS;
  return Math.min(MAX_RETENTION_HOURS, Math.max(MIN_RETENTION_HOURS, Math.round(n)));
}

/**
 * Returns the Asia/Jerusalem UTC offset (e.g. "+03:00" / "+02:00") that applies
 * to a given wall-clock moment in Israel. Uses `Intl.DateTimeFormat` with the
 * `longOffset` option (ES2022 — supported on Node 20+ and modern browsers).
 * Falls back to "+02:00" (IST, winter) on older runtimes.
 */
export function getIsraelOffsetForWallTime(year, month, day, hour = 0, minute = 0) {
  try {
    // Anchor an instant by treating the wall-clock components as UTC. This
    // lands us within ~1h of the real Israeli moment — close enough for the
    // offset lookup outside DST cusps.
    const anchor = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ISRAEL_TZ,
      timeZoneName: 'longOffset',
    }).formatToParts(anchor);
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const m = tz.match(/GMT([+\-\u2212])(\d{1,2})(?::?(\d{2}))?/);
    if (!m) return '+02:00';
    const sign = m[1] === '\u2212' ? '-' : m[1];
    const hh = String(parseInt(m[2], 10)).padStart(2, '0');
    const mm = String(parseInt(m[3] || '0', 10)).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  } catch {
    return '+02:00';
  }
}

/**
 * Convert an Asia/Jerusalem-offset string ("+03:00" / "-02:30") to total
 * minutes east of UTC.
 */
function offsetStringToMinutes(offsetStr) {
  const sign = offsetStr[0] === '-' ? -1 : 1;
  const [hh, mm] = offsetStr.slice(1).split(':').map((n) => parseInt(n, 10) || 0);
  return sign * (hh * 60 + mm);
}

/**
 * Return the Israel-local calendar date components (year/month/day) for a given
 * `Date` instant. Works regardless of the host process timezone (browser,
 * Vercel/Node, Firebase Functions). Returns `null` for invalid input.
 */
export function getIsraelLocalDateComponents(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ISRAEL_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value, 10);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    if (!year || !month || !day) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * Compute the UTC instant (ms since epoch) at which a party with the given
 * Israel-local labeled date becomes expired — i.e. `retentionHours` after the
 * Israel clock crosses 00:00 of the day *after* the labeled date (equivalent
 * to "end of labeled day + retentionHours").
 *
 * Concrete examples for "Friday 15.05" (anchor = Sat 16.05 00:00 IL):
 *   - 24h  → Sun 17.05 00:00 IL  (visible through Saturday)
 *   - 48h  → Mon 18.05 00:00 IL  (visible through Sunday — gone on Monday)
 *   - 168h → Sat 23.05 00:00 IL  (visible through next Friday)
 */
export function partyExpiryInstantMs(year, month, day, retentionHours = DEFAULT_PARTY_RETENTION_HOURS) {
  const hours = normalizeRetentionHours(retentionHours);
  // Anchor at Israel midnight of (labeledDay + 1) — i.e. the very end of the
  // labeled day. Using `Date.UTC(.., day + 1)` lets the Date constructor handle
  // month/year rollover (e.g. labeled-day 31.12 → anchor 01.01 next year).
  const wall = new Date(Date.UTC(year, month - 1, day + 1));
  const wallY = wall.getUTCFullYear();
  const wallM = wall.getUTCMonth() + 1;
  const wallD = wall.getUTCDate();
  const offsetMin = offsetStringToMinutes(
    getIsraelOffsetForWallTime(wallY, wallM, wallD, 0, 0)
  );
  // Israel-local midnight of the anchor day, expressed as a UTC instant:
  //   israelMidnightUtc = UTC midnight of that calendar date − offset
  const israelMidnightUtc = Date.UTC(wallY, wallM - 1, wallD, 0, 0, 0, 0) - offsetMin * 60 * 1000;
  return israelMidnightUtc + hours * 60 * 60 * 1000;
}

/**
 * Returns true when a party labeled for the given Israel-local date is
 * expired *right now*. `nowMs` is overridable for testing.
 */
export function isPartyExpiredByComponents(year, month, day, retentionHours = DEFAULT_PARTY_RETENTION_HOURS, nowMs = Date.now()) {
  return nowMs >= partyExpiryInstantMs(year, month, day, retentionHours);
}

/**
 * Decide whether a party stored as a `Date` (e.g. from a Firestore Timestamp,
 * which is admin-local-midnight at write time) is expired. We always read the
 * date back in Asia/Jerusalem so the cutoff matches the day the admin meant —
 * never off-by-one because the host runtime happens to be in UTC.
 *
 * Returns `false` for invalid/missing input so callers don't accidentally
 * delete data on parsing errors.
 */
export function isPartyExpiredByDate(date, retentionHours = DEFAULT_PARTY_RETENTION_HOURS, nowMs = Date.now()) {
  const comps = getIsraelLocalDateComponents(date);
  if (!comps) return false;
  return isPartyExpiredByComponents(comps.year, comps.month, comps.day, retentionHours, nowMs);
}

/**
 * Decide whether a party labeled with a `"DD.MM"` string (with the year
 * inferred from "today in Israel") is expired. Used by the public homepage
 * which only has the user-facing date string.
 */
export function isPartyExpiredByDdMm(dateStr, retentionHours = DEFAULT_PARTY_RETENTION_HOURS, nowMs = Date.now()) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parts = dateStr.trim().split('.');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) return false;
  // Anchor the year to "today in Israel" so the right side of New Year's Eve
  // doesn't accidentally pick up next year's pre-published events.
  const todayComps = getIsraelLocalDateComponents(new Date(nowMs)) || {
    year: new Date(nowMs).getFullYear(),
  };
  return isPartyExpiredByComponents(todayComps.year, month, day, retentionHours, nowMs);
}

/**
 * Compute the `expiration` ISO 8601 (UTC) string for a party labeled with the
 * given date. Accepts a `Date`, a Firestore-`Timestamp`-like object with
 * `.toDate()`, or a `"DD.MM"` string (year inferred from "today in Israel").
 *
 * Returns `null` when the input can't be parsed — callers that already have a
 * valid `Date` will never get null here, so the public-site filter can safely
 * fall back to live computation for legacy events that don't carry the field.
 *
 * The output is a UTC ISO string (`...Z`) so it round-trips through
 * `JSON.stringify` -> `Date.parse` without timezone surprises on the public
 * site, and so two parties with the same expiry produce byte-identical JSON.
 */
export function computePartyExpirationIso(date, retentionHours = DEFAULT_PARTY_RETENTION_HOURS) {
  let comps = null;
  if (date instanceof Date) {
    comps = getIsraelLocalDateComponents(date);
  } else if (date && typeof date.toDate === 'function') {
    comps = getIsraelLocalDateComponents(date.toDate());
  } else if (typeof date === 'string') {
    // Try a full ISO/parseable date first (e.g. "2026-05-15" or
    // "2026-05-15T00:00:00Z"); only fall back to "DD.MM" when that fails.
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      comps = getIsraelLocalDateComponents(parsed);
    }
    if (!comps) {
      const parts = date.trim().split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        const today = getIsraelLocalDateComponents(new Date()) || { year: new Date().getFullYear() };
        comps = { year: today.year, month, day };
      }
    }
  }
  if (!comps) return null;
  const ms = partyExpiryInstantMs(comps.year, comps.month, comps.day, retentionHours);
  return new Date(ms).toISOString();
}

/**
 * Visibility-time check used by the public homepage: prefer a stored
 * `expiration` ISO string when present (the new world), fall back to
 * recomputing from the labeled "DD.MM" + global retention (legacy parties).
 *
 * Returns `false` for invalid input so callers don't accidentally hide events
 * because of a parsing failure.
 */
export function isPartyExpiredByExpiration(expiration, fallbackDateStr, retentionHours = DEFAULT_PARTY_RETENTION_HOURS, nowMs = Date.now()) {
  if (expiration) {
    const t = Date.parse(expiration);
    if (Number.isFinite(t)) return nowMs >= t;
  }
  return isPartyExpiredByDdMm(fallbackDateStr, retentionHours, nowMs);
}
