/**
 * Helper for calling admin-only Vercel API routes (`/api/publish-content`,
 * `/api/import-content-from-git`, `/api/git-history`, etc.).
 *
 * Secret comes from `process.env.VITE_ADMIN_API_SECRET` at **build** time via
 * `vite.config.js` `define` → `__TBDSM_VITE_ADMIN_API_SECRET__` (inlined string).
 * The server compares the Bearer token against `ADMIN_API_SECRET` (see `lib/apiAuth.js`).
 *
 * NOTE: this is "shared secret" auth — the value is bundled into the admin
 * JS, so anyone who downloads it can read the secret. It blocks blind
 * unauthenticated POSTs (scanners, scripts) but it is NOT a substitute for
 * real per-user auth. Phase 1.2 of the code-review plan replaces this with
 * Firebase Auth + ID-token verification.
 */

/* global __TBDSM_VITE_ADMIN_API_SECRET__ */
const bundledAdminApiSecret = String(
  typeof __TBDSM_VITE_ADMIN_API_SECRET__ !== 'undefined' ? __TBDSM_VITE_ADMIN_API_SECRET__ : ''
).trim();

/** True when the admin bundle was built with a non-empty admin API secret (required for `/api/*` admin routes). */
export const hasAdminApiClientSecret = () => !!bundledAdminApiSecret;

/** Returns `{ Authorization: 'Bearer <secret>' }` or `{}` when secret missing (server returns 401). */
export const adminAuthHeader = () => {
  if (!bundledAdminApiSecret) {
    if (import.meta?.env?.DEV) {
      console.warn('[adminApi] VITE_ADMIN_API_SECRET is not set; admin API calls will be rejected by the server. Add it to .env.local (or Vercel env) and reload.');
    }
    return {};
  }
  return { Authorization: `Bearer ${bundledAdminApiSecret}` };
};

/**
 * POST to `/api/admin-settings`, which writes `settings/*` docs and the
 * `rssFeeds` collection through the Admin SDK — firestore.rules denies
 * direct client writes to both (see that file's own header comment for
 * why). Every settings-writing helper in src/firebase/{settings,
 * partySettings,siteConfig,dbBackup}.js goes through this instead of a
 * direct Firestore `setDoc`/`updateDoc`/`deleteDoc` now.
 */
export const callAdminSettings = async (action, payload = {}) => {
  const res = await fetch('/api/admin-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `admin-settings ${action} failed (HTTP ${res.status})`);
  }
  return data;
};
