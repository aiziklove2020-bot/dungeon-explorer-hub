/**
 * Website content cache – split by public (publish) vs edit mode.
 * Public: content from Git (content/content.json). Persisted to localStorage for instant load on revisit.
 * Edit: content from Firestore.
 */

const PREFIX = 'website_content_';
const STORAGE_KEY_PUBLIC = 'tbdsm_public_content';
const CACHE_TTL_PUBLIC_MS = 5 * 60 * 1000;
const CACHE_TTL_EDIT_MS = 2 * 60 * 1000;
const MAX_STALE_PUBLIC_MS = 7 * 24 * 60 * 60 * 1000;

const memory = new Map();

function fullKey(mode) {
  return `${PREFIX}${mode}`;
}

function get(key) {
  const ent = memory.get(key);
  if (!ent) return null;
  if (ent.expiry != null && Date.now() > ent.expiry) {
    memory.delete(key);
    return null;
  }
  return ent.value;
}

function set(key, value, ttlMs = 0) {
  const expiry = ttlMs ? Date.now() + ttlMs : null;
  memory.set(key, { value, expiry });
}

/**
 * Synchronously read public content from memory or localStorage (for instant first paint).
 * Returns null if no cache or expired. Safe to call from useState initializer.
 */
export function getCachedPublicSync() {
  const fromMemory = get(fullKey('public'));
  if (fromMemory != null && typeof fromMemory === 'object') return fromMemory;
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PUBLIC);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const expiry = Number(parsed.expiry);
    if (!Number.isNaN(expiry) && expiry > 0) {
      const staleForMs = Date.now() - expiry;
      if (staleForMs > MAX_STALE_PUBLIC_MS) {
        window.localStorage.removeItem(STORAGE_KEY_PUBLIC);
        return null;
      }
    }
    // Return stale data without deleting it — background refresh in ContentContext
    // will overwrite with fresh content. This gives instant RSS feeds on every return visit.
    return parsed.value != null ? parsed.value : null;
  } catch {
    return null;
  }
}

export function getCached(mode) {
  const fromMemory = get(fullKey(mode));
  if (fromMemory != null) return fromMemory;
  if (mode === 'public') return getCachedPublicSync();
  return null;
}

export function setCached(mode, value) {
  const ttl = mode === 'public' ? CACHE_TTL_PUBLIC_MS : CACHE_TTL_EDIT_MS;
  set(fullKey(mode), value, ttl);
  if (mode === 'public' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify({
        value,
        expiry: Date.now() + ttl
      }));
    } catch (err) {
      // localStorage may be full or disabled (Safari private mode); cache stays in memory.
      console.warn('contentCache.set: localStorage write failed:', err);
    }
  }
}

export function clearMode(mode) {
  memory.delete(fullKey(mode));
  if (mode === 'public' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY_PUBLIC);
    } catch (err) {
      console.warn('contentCache.clear: localStorage remove failed:', err);
    }
  }
}

export function clearAll() {
  memory.delete(fullKey('public'));
  memory.delete(fullKey('edit'));
}
