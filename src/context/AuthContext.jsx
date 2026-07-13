import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getUserById } from '../firebase/dataAccess';
import { logWarn } from '../utils/logger';

/**
 * Site auth used to be a separate phone-number login flow with its own modal
 * and localStorage session. As of the auth-consolidation pass, the only
 * supported user-facing auth is the forum login (nickname + password).
 *
 * The `siteUser` exposed here is now a derived snapshot of the forum-user's
 * linked party-registration record (`forumUser.linkedUserId` →
 * `users/{linkedUserId}`). It is populated by `syncSiteUserFromLinkedUserId`,
 * which is called by `ForumAuthProvider` after a successful forum login or
 * register, and cleared via `clearSiteUser` on forum logout.
 *
 * Downstream consumers (workshops auto-fill, store checkout pre-fill, party
 * `users` lookups, chat permissions) keep using the same `useSiteAuth()` hook
 * and `siteUser` shape, so the migration is transparent for them. Forum-only
 * users (no linked phone profile) simply see no `siteUser` and fall back to
 * guest flows where applicable.
 */

const SITE_USER_KEY = 'siteUser';

const AuthContext = createContext(null);

export function useSiteAuth() {
  const ctx = useContext(AuthContext);
  return ctx;
}

export function SiteAuthProvider({ children }) {
  const [siteUser, setSiteUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Hydrate from localStorage so cold-start consumers (Workshops, Store
   *  pre-fill, etc.) don't see a flicker before forum login finishes. */
  const loadStoredUser = useCallback(() => {
    try {
      const stored = localStorage.getItem(SITE_USER_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.phoneNumber && !user.level?.startsWith('admin')) {
          setSiteUserState(user);
          return;
        }
      }
    } catch (err) {
      logWarn('SiteAuthProvider.loadStoredUser', err);
    }
    setSiteUserState(null);
  }, []);

  useEffect(() => {
    loadStoredUser();
    setLoading(false);
  }, [loadStoredUser]);

  /** Clear the derived site session (called by ForumAuthProvider on logout). */
  const clearSiteUser = useCallback(() => {
    try {
      localStorage.removeItem(SITE_USER_KEY);
    } catch {}
    setSiteUserState(null);
  }, []);

  /**
   * Mirror a forum user's linked party-registration into the site session so
   * downstream surfaces (workshops, store, ChatRoomView's `siteUser` arg) see
   * a populated profile without each one re-fetching `users/{linkedUserId}`.
   * Returns the stored snapshot (or null when there is no usable link).
   */
  const syncSiteUserFromLinkedUserId = useCallback(async (linkedUserId) => {
    if (!linkedUserId) {
      clearSiteUser();
      return null;
    }
    try {
      const user = await getUserById(linkedUserId);
      if (!user || !user.phoneNumber) {
        clearSiteUser();
        return null;
      }
      // CMS admin level is intentionally never reflected in the derived site
      // session. The admin auth flow is a separate sessionStorage gate; we do
      // not want CMS admins moderating chat under their party profile.
      if (user.level === 'admin' || user.isAdmin) {
        clearSiteUser();
        return null;
      }
      const toStore = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        telegramUsername: user.telegramUsername || '',
        gender: user.gender,
        level: user.level
      };
      try {
        localStorage.setItem(SITE_USER_KEY, JSON.stringify(toStore));
      } catch {}
      setSiteUserState(toStore);
      return toStore;
    } catch (err) {
      logWarn('SiteAuthProvider.syncSiteUserFromLinkedUserId', err);
      return null;
    }
  }, [clearSiteUser]);

  const value = useMemo(() => ({
    siteUser,
    loading,
    clearSiteUser,
    refreshUser: loadStoredUser,
    syncSiteUserFromLinkedUserId
  }), [siteUser, loading, clearSiteUser, loadStoredUser, syncSiteUserFromLinkedUserId]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
