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
  let digits = cleanPhone(value);
  // "00" international access prefix before the country code (e.g. dialed
  // as 00972501234567) — strip it so the 972-handling below still applies.
  if (digits.startsWith('00972')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('972')) {
    let rest = digits.slice(3);
    // A stray leading 0 kept after the country code (e.g. +972-050-1234567,
    // copied from a contact card that mixed the local and international
    // forms) — the mobile number itself never starts with 0 once the
    // country code is present.
    if (rest.startsWith('0')) rest = rest.slice(1);
    if (rest.length === 9) return '0' + rest;
  }
  return digits;
}
