/**
 * Allow only safe external URL schemes for href attributes.
 * Returns empty string when URL is missing or unsafe.
 */
export const sanitizeExternalUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return '';
  }

  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://example.com';
    const parsed = new URL(trimmed, base);
    const protocol = parsed.protocol.toLowerCase();
    const allowed = new Set(['http:', 'https:', 'mailto:', 'tel:']);
    if (!allowed.has(protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
};
