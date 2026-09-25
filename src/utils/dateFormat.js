/**
 * Date formatting helpers.
 *
 * Handles all the date shapes the app receives:
 *   - Firestore Timestamp ({ toDate(): Date })
 *   - { seconds, nanoseconds } object (Firestore snapshot literal)
 *   - JS Date
 *   - string (ISO or anything Date can parse)
 *   - number (epoch ms)
 *
 * Returns '' on falsy / unparsable input so callers can render directly.
 */

export function toDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch (_) {
      return null;
    }
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DEFAULT_OPTIONS_DATE = { year: 'numeric', month: '2-digit', day: '2-digit' };
const DEFAULT_OPTIONS_DATETIME = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
const DEFAULT_OPTIONS_LONG = { year: 'numeric', month: 'long', day: 'numeric' };

const DEFAULT_LOCALE = 'he-IL';

/** Date only (e.g., "12/04/2026"). */
export function formatDate(value, locale = DEFAULT_LOCALE, options = DEFAULT_OPTIONS_DATE) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString(locale, options);
}

/** Date with time (e.g., "12/04/2026, 14:30"). */
export function formatDateTime(value, locale = DEFAULT_LOCALE, options = DEFAULT_OPTIONS_DATETIME) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString(locale, options);
}

/** Long date (e.g., "12 באפריל 2026"). */
export function formatDateLong(value, locale = DEFAULT_LOCALE, options = DEFAULT_OPTIONS_LONG) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString(locale, options);
}

/**
 * A Date as a `YYYY-MM-DD` string in the BROWSER's local calendar day —
 * suitable for a `<input type="date">` value or a "date of this action"
 * field. `date.toISOString().split('T')[0]` (used to be scattered across
 * several admin components for exactly this) gives the UTC calendar day
 * instead: between local midnight and 2-3am Israel time (UTC+2/+3), that
 * expression silently returns YESTERDAY's date — a payment recorded, or a
 * new party/subscription defaulted, in that window gets stamped one day
 * early.
 */
export function dateToLocalInputStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `dateToLocalInputStr` for right now — today's date in local time. */
export function todayLocalStr() {
  return dateToLocalInputStr(new Date());
}
