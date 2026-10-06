// Keeps the admin signed in on this device, so the owner does not type the login
// details every time. The login itself (api/admin-settings.js `admin-login`) is
// unchanged; this only remembers that it succeeded, for 30 days, in localStorage.
// "יציאה" in the panel forgets it.
const KEY = 'admin_session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function rememberAdminSession(id, username) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, username, at: Date.now() }));
  } catch {
    /* private mode: just stays session-only */
  }
}

export function forgetAdminSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Re-creates the session keys the panel reads. Returns true when a valid remembered login exists. */
export function restoreAdminSession() {
  try {
    if (sessionStorage.getItem('admin_authenticated') === 'true') return true;
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved?.id || !saved.at || Date.now() - saved.at > MAX_AGE_MS) {
      forgetAdminSession();
      return false;
    }
    sessionStorage.setItem('admin_authenticated', 'true');
    sessionStorage.setItem('adminAuthenticated', 'true');
    sessionStorage.setItem('admin_id', saved.id);
    sessionStorage.setItem('admin_username', saved.username || saved.id);
    return true;
  } catch {
    return false;
  }
}
