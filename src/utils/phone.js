/**
 * Israeli mobile phone helpers.
 *
 * Canonical format: 10 digits starting with `05` (e.g., 0501234567).
 *
 * `cleanPhone` strips everything that is not a digit so users can paste any
 * formatted version. `isValidIsraeliPhone` validates the cleaned form.
 */

const ISRAELI_MOBILE_RE = /^05\d{8}$/;

export function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function isValidIsraeliPhone(value) {
  return ISRAELI_MOBILE_RE.test(cleanPhone(value));
}

/**
 * Normalizes a phone number to the canonical local form (0501234567),
 * converting an international `972...`/`+972...` prefix back to `0...`.
 * Registrations sometimes arrive with the international prefix (e.g. from
 * Telegram contacts), which the canonical form doesn't accept as-is.
 */
export function normalizeIsraeliPhone(value) {
  const digits = cleanPhone(value);
  if (digits.startsWith('972') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  return digits;
}
