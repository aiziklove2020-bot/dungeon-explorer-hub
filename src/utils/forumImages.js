/**
 * Forum/Blog attachment images: `{ url, isSpoiler? }` or legacy string URL.
 *
 * URL validation: only allow `https:` to avoid `javascript:`/`data:` injection.
 * (Modern browsers already block `javascript:` in `<img src>`, but explicit
 * validation keeps the value safe for any consumer that puts it elsewhere.)
 */

const isSafeUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
    return parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

export function normalizeForumImage(img) {
  if (img == null) return null;
  if (typeof img === 'string') {
    return isSafeUrl(img) ? { url: img, isSpoiler: false } : null;
  }
  const url = img.url;
  if (!isSafeUrl(url)) return null;
  return { url, isSpoiler: !!img.isSpoiler };
}
