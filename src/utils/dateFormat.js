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
