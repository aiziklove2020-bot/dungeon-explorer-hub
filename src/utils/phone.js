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
