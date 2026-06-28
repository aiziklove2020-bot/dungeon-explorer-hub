// App version - increment this to force all users to reload
// Also update public/version.json when deploying
export const APP_VERSION = '7';

const forceReload = (currentVersion, buildId = null) => {
  const currentUser = localStorage.getItem('currentUser');
  const dbLoggerEnabled = localStorage.getItem('db_logger_enabled');
  const webhookLoggerEnabled = localStorage.getItem('webhook_logger_enabled');
  localStorage.clear();
  sessionStorage.clear();

  if (currentUser) localStorage.setItem('currentUser', currentUser);
  if (dbLoggerEnabled) localStorage.setItem('db_logger_enabled', dbLoggerEnabled);
  if (webhookLoggerEnabled) localStorage.setItem('webhook_logger_enabled', webhookLoggerEnabled);
  localStorage.setItem('language', 'he');

  localStorage.setItem('app_version', currentVersion);
  if (buildId) localStorage.setItem('app_build_id', buildId);

  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  window.location.reload(true);
};

// Compare semver-like versions (e.g. "1.0.1" vs "1.0.2")
const isNewerVersion = (server, local) => {
  const parse = (v) => (v || '0').split('.').map(Number);
  const [s0, s1, s2] = parse(server);
  const [l0, l1, l2] = parse(local);
  if (s0 !== l0) return s0 > l0;
  if (s1 !== l1) return s1 > l1;
  return s2 > l2;
};

/**
 * Version check - ensures app cannot run when outdated.
 * - If server version is newer: force reload (clears caches, reloads).
 * - If we cannot verify (e.g. offline): return block so app does not run.
 * - If up to date: return ok.
 * @returns {Promise<{ ok: true } | { ok: false, blockReason: 'network' }>}
 */
export const checkVersion = async () => {
  const storedVersion = localStorage.getItem('app_version');
  const currentVersion = APP_VERSION;

  // 1. Local version changed (e.g. new deploy, user got new bundle)
  if (storedVersion !== currentVersion) {
    forceReload(currentVersion);
    return { ok: true }; // forceReload never returns; type helper
  }

  // 2. Fetch server version - must succeed so we know we're not stale
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      return { ok: false, blockReason: 'network' };
    }
    const data = await res.json();
    const serverVersion = data.version;
    const serverBuildId = data.buildId;

    if (serverVersion && isNewerVersion(serverVersion, currentVersion)) {
      forceReload(serverVersion);
      return { ok: true };
    }
    // Same or older version but different build (e.g. icon/assets-only deploy) → force reload
    const storedBuildId = localStorage.getItem('app_build_id');
    if (serverBuildId && storedBuildId !== serverBuildId) {
      forceReload(serverVersion || currentVersion, serverBuildId);
      return { ok: true };
    }
    if (!storedVersion) {
      localStorage.setItem('app_version', currentVersion);
    }
    if (serverBuildId) {
      localStorage.setItem('app_build_id', serverBuildId);
    }
    return { ok: true };
  } catch (err) {
    // Offline or fetch failed; refuse to run the app on a stale bundle.
    // We log so users hitting the offline gate have a breadcrumb in devtools
    // (and so monitoring catches recurring CDN failures, not just user-side
    // network blips).
    console.warn('checkVersion: version.json fetch failed:', err);
    return { ok: false, blockReason: 'network' };
  }
};
