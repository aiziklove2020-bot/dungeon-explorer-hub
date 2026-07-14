import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { registerForumUser, loginForumUser, getForumUserById, linkForumUserToSiteUser, completeForumPasswordReset, getForumUserBySiteUserId } from '../firebase/forumUsers';
import { signInForumForChatFirebase, signOutChatFirebase } from '../firebase/chatForumAuth';
import { restoreSupabaseChatSessionFromStorage, signInForumForSupabaseChat, signOutSupabaseChat } from '../supabase/chat/authBridge';
import { useSiteAuth } from './AuthContext';
import { createUser, getUserByPhone } from '../firebase/users';
import { logError, logWarn } from '../utils/logger';
import { isSupabaseChatBackend } from '../chat/backend';

const FORUM_USER_KEY = 'forumUser';
const ForumAuthContext = createContext(null);

export function useForumAuth() {
  return useContext(ForumAuthContext);
}

export function ForumAuthProvider({ children }) {
  const signInForumForChatBackend = useCallback(async (nickname, password) => {
    if (isSupabaseChatBackend()) {
      return signInForumForSupabaseChat(nickname, password);
    }
    return signInForumForChatFirebase(nickname, password);
  }, []);

  const signOutForumForChatBackend = useCallback(async () => {
    if (isSupabaseChatBackend()) {
      return signOutSupabaseChat();
    }
    return signOutChatFirebase();
  }, []);

  const { siteUser, syncSiteUserFromLinkedUserId, clearSiteUser } = useSiteAuth();
  const [forumUser, setForumUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const autoLink = useCallback(async (fUser) => {
    // After phone-login was retired, `siteUser` is only ever populated as a
    // derivation of an existing forum link. autoLink therefore no longer fires
    // on a clean session — the link is established at register time via the
    // `siteFields.phone` branch of `forumRegister` below. We keep this hook
    // for the rare case where a stale localStorage `siteUser` from a previous
    // build hydrates before the forum login that owns it.
    if (siteUser?.id && fUser?.id && !fUser.linkedUserId) {
      try {
        await linkForumUserToSiteUser(fUser.id, siteUser.id);
        fUser.linkedUserId = siteUser.id;
      } catch (err) {
        // Linking is best-effort; user can still use the forum unlinked.
        logWarn('ForumAuth.autoLink', err);
      }
    }
  }, [siteUser]);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem(FORUM_USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) {
            const fresh = await getForumUserById(parsed.id);
            if (fresh && !fresh.isBlocked && !fresh.mustResetPassword) {
              await autoLink(fresh);
              if (isSupabaseChatBackend()) {
                await restoreSupabaseChatSessionFromStorage();
              }
              // On cold start, derive the site session from the forum link.
              // This used to happen lazily via phone-login; now that the
              // forum is the only login, the linked party profile (when it
              // exists) is the site session. Best-effort — if the user has
              // no linked party profile this is a no-op.
              if (fresh.linkedUserId) {
                try {
                  await syncSiteUserFromLinkedUserId(fresh.linkedUserId);
                } catch (err) {
                  logWarn('ForumAuth.load.syncSite', err);
                }
              }
              setForumUser(fresh);
            } else {
              /* Blocked, missing, or admin marked the password as must-reset → force a fresh
               * login so the modal can drive the user through the reset flow. */
              localStorage.removeItem(FORUM_USER_KEY);
            }
          }
        }
      } catch (err) {
        logError('ForumAuth.load', err);
        localStorage.removeItem(FORUM_USER_KEY);
      }
      setLoading(false);
    };
    load();
  }, [autoLink, syncSiteUserFromLinkedUserId]);

  const forumLogin = useCallback(async (nickname, password) => {
    let user = await loginForumUser(nickname, password);
    if (user.mustResetPassword) {
      const err = new Error('PASSWORD_RESET_REQUIRED');
      err.code = 'PASSWORD_RESET_REQUIRED';
      err.userId = user.id;
      err.nickname = user.nickname;
      throw err;
    }
    await autoLink(user);
    const fresh = await getForumUserById(user.id);
    if (fresh) user = fresh;
    if (user.linkedUserId) {
      await syncSiteUserFromLinkedUserId(user.linkedUserId);
    }
    // Chat backend sign-in is best-effort. A failure here (transient JWT
    // bridge error, Supabase env misconfiguration, eventual consistency on
    // a freshly-created user, etc.) used to throw and abort forum login,
    // leaving the user with a registered account but an unusable client.
    // Forum login is the source of truth; chat is a secondary feature, so
    // we degrade gracefully — the chat surface will simply be unavailable
    // until the next successful sign-in. Underlying error is already
    // logged by signInForumForSupabaseChat for diagnosis.
    const chatOk = await signInForumForChatBackend(nickname, password);
    if (isSupabaseChatBackend() && !chatOk) {
      logWarn('ForumAuth.login.chatSignInFailed', { nickname });
    }
    const safe = { id: user.id, nickname: user.nickname, role: user.role, isBlocked: user.isBlocked };
    localStorage.setItem(FORUM_USER_KEY, JSON.stringify(safe));
    setForumUser(user);
    return user;
  }, [autoLink, signInForumForChatBackend, syncSiteUserFromLinkedUserId]);

  /** Verify the temporary password, set the user-chosen new one, then complete login.
   * Called by ForumLoginModal after `forumLogin` throws PASSWORD_RESET_REQUIRED. */
  const forumResetPassword = useCallback(async (nickname, oldPassword, newPassword) => {
    const user = await loginForumUser(nickname, oldPassword);
    await completeForumPasswordReset(user.id, newPassword);
    return forumLogin(nickname, newPassword);
  }, [forumLogin]);

  const requestForumEmailVerification = useCallback(async ({ forumUserId, identifier } = {}) => {
    try {
      await fetch('/api/forum-auth?action=verify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forumUserId ? { forumUserId } : { identifier: identifier || '' })
      });
    } catch (err) {
      // Generic-success endpoint; we silently ignore network errors so the
      // UI can keep showing "we sent a link" without leaking failures.
      logWarn('ForumAuth.requestEmailVerification', err);
    }
  }, []);

  const requestForumPasswordReset = useCallback(async (identifier) => {
    try {
      await fetch('/api/forum-auth?action=reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: String(identifier || '').trim() })
      });
    } catch (err) {
      logWarn('ForumAuth.requestPasswordReset', err);
    }
  }, []);

  const forumRegister = useCallback(async (nickname, password, siteFields, email) => {
    // Email is mandatory for self-registration: it's the only channel for
    // verification and password reset. Admin "add forum account" goes through
    // registerForumUser directly (no email), so the strictness lives here in
    // the user-facing path rather than in the shared firestore helper.
    const trimmedEmail = String(email || '').trim();
    if (!trimmedEmail) {
      throw new Error('כתובת אימייל נדרשת לרישום');
    }

    // Pre-flight: enforce "one forum user per site user" BEFORE creating the
    // forum doc, to avoid orphan forumUsers when the link step would fail.
    if (siteUser?.id) {
      const existingFu = await getForumUserBySiteUserId(siteUser.id);
      if (existingFu) {
        throw new Error('למשתמש האתר שלך כבר קיים חשבון פורום. התחבר עם הכינוי הקיים.');
      }
    } else if (siteFields?.phone) {
      try {
        const existingSiteUser = await getUserByPhone(siteFields.phone);
        if (existingSiteUser?.id) {
          const fuExisting = await getForumUserBySiteUserId(existingSiteUser.id);
          if (fuExisting) {
            throw new Error('למספר הטלפון הזה כבר קיים חשבון פורום מקושר');
          }
        }
      } catch (err) {
        if (err?.message?.includes('כבר קיים חשבון פורום')) throw err;
        // Other lookup failures fall through; uniqueness is rechecked at link time.
        logWarn('ForumAuth.register.preflight', err);
      }
    }

    let user = await registerForumUser(nickname, password, trimmedEmail);

    if (siteUser?.id) {
      await autoLink(user);
    } else if (siteFields?.phone && siteFields?.name) {
      try {
        let existing = await getUserByPhone(siteFields.phone);
        if (!existing) {
          existing = await createUser(siteFields.phone, siteFields.name, siteFields.gender || '');
        }
        if (existing?.id) {
          await linkForumUserToSiteUser(user.id, existing.id);
          user.linkedUserId = existing.id;
        }
      } catch (err) {
        // Site-account linking is best-effort during forum registration; the
        // forum user is already created and usable on its own.
        logWarn('ForumAuth.register.link', err);
      }
    }

    const fresh = await getForumUserById(user.id);
    if (fresh) user = fresh;
    if (user.linkedUserId) {
      await syncSiteUserFromLinkedUserId(user.linkedUserId);
    }

    // Fire the verification email AS SOON AS the forum user doc exists, before
    // any chat sign-in attempt. Previously this lived after the chat step, so a
    // transient chat-sign-in failure would skip the email entirely — leaving
    // newly-registered users with an account they can never verify or recover.
    // Endpoint is generic-success so we ignore failures here.
    if (user.email && !user.emailVerified) {
      requestForumEmailVerification({ forumUserId: user.id }).catch(() => {});
    }

    // Chat backend sign-in is best-effort (see forumLogin for rationale).
    const chatOk = await signInForumForChatBackend(user.nickname, password);
    if (isSupabaseChatBackend() && !chatOk) {
      logWarn('ForumAuth.register.chatSignInFailed', { nickname: user.nickname });
    }

    const safe = { id: user.id, nickname: user.nickname, role: user.role, isBlocked: user.isBlocked };
    localStorage.setItem(FORUM_USER_KEY, JSON.stringify(safe));
    setForumUser(user);

    return user;
  }, [autoLink, signInForumForChatBackend, siteUser, syncSiteUserFromLinkedUserId, requestForumEmailVerification]);

  const forumLogout = useCallback(() => {
    localStorage.removeItem(FORUM_USER_KEY);
    setForumUser(null);
    // The derived site session is owned by the forum login — clear it so the
    // workshops/store auto-fill doesn't keep showing the old phone profile to
    // whoever opens the browser next.
    clearSiteUser();
    void signOutForumForChatBackend();
  }, [signOutForumForChatBackend, clearSiteUser]);

  /** Re-fetch the current forum user doc and update context state. Called after
   *  flows that mutate the user record outside of the context (admin tools,
   *  email-required gate writing email, verification round-trip), so gated UIs
   *  re-evaluate against fresh fields like `email` and `emailVerified`. */
  const refreshForumUser = useCallback(async () => {
    if (!forumUser?.id) return null;
    try {
      const fresh = await getForumUserById(forumUser.id);
      if (fresh) setForumUser(fresh);
      return fresh;
    } catch (err) {
      logWarn('ForumAuth.refresh', err);
      return null;
    }
  }, [forumUser?.id]);

  const value = useMemo(() => ({
    forumUser,
    loading,
    forumLogin,
    forumRegister,
    forumLogout,
    forumResetPassword,
    refreshForumUser,
    requestForumPasswordReset,
    requestForumEmailVerification,
    isForumAdmin: forumUser?.role === 'forumAdmin'
  }), [forumUser, loading, forumLogin, forumRegister, forumLogout, forumResetPassword, refreshForumUser, requestForumPasswordReset, requestForumEmailVerification]);

  return (
    <ForumAuthContext.Provider value={value}>
      {children}
    </ForumAuthContext.Provider>
  );
}
