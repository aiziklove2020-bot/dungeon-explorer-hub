import { clearSupabaseAccessToken, getSupabaseClient, setSupabaseAccessToken, syncRealtimeAuthToken } from '../client';

const STORAGE_JWT = 'tbdsm_supabase_chat_jwt';
const STORAGE_EXP = 'tbdsm_supabase_chat_jwt_exp';

/** Persist the chat JWT in localStorage rather than sessionStorage.
 *
 * The email-verification flow typically opens the verify link in a new tab,
 * and sessionStorage is per-tab. Without cross-tab persistence the new tab
 * lands on /forum with no chat JWT, every Supabase chat call hits RLS and
 * silently fails (lobby spinner that never resolves, "room not found" when
 * creating a private room, etc.).
 *
 * The stored value is a short-lived (≈1h) HS256 token whose claims are bound
 * to the forum user; expiry is enforced on restore. The site already exposes
 * forumUsers (with hashed passwords) via public reads, so persisting this
 * derived bearer token in localStorage doesn't materially change the
 * existing threat model.
 */
function chatJwtStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_) {}
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch (_) {}
  return null;
}

function persistChatJwt(token, expUnixSec) {
  const store = chatJwtStorage();
  if (!store) return;
  try {
    if (token && expUnixSec) {
      store.setItem(STORAGE_JWT, token);
      store.setItem(STORAGE_EXP, String(expUnixSec));
    }
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function clearPersistedChatJwt() {
  const store = chatJwtStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_JWT);
    store.removeItem(STORAGE_EXP);
  } catch (_) {}
  // Best-effort sweep of the previous sessionStorage location so a user who
  // had a stale token there before the migration doesn't trip on it.
  try {
    if (typeof sessionStorage !== 'undefined' && store !== sessionStorage) {
      sessionStorage.removeItem(STORAGE_JWT);
      sessionStorage.removeItem(STORAGE_EXP);
    }
  } catch (_) {}
}

function readPersistedChatJwt() {
  const store = chatJwtStorage();
  if (!store) return { token: null, exp: 0 };
  try {
    const token = store.getItem(STORAGE_JWT);
    const exp = Number(store.getItem(STORAGE_EXP) || 0);
    if (token) return { token, exp };
  } catch (_) {}
  // Migration fallback: read from the legacy sessionStorage key.
  try {
    if (typeof sessionStorage !== 'undefined' && store !== sessionStorage) {
      const token = sessionStorage.getItem(STORAGE_JWT);
      const exp = Number(sessionStorage.getItem(STORAGE_EXP) || 0);
      if (token) {
        try {
          store.setItem(STORAGE_JWT, token);
          store.setItem(STORAGE_EXP, String(exp));
          sessionStorage.removeItem(STORAGE_JWT);
          sessionStorage.removeItem(STORAGE_EXP);
        } catch (_) {}
        return { token, exp };
      }
    }
  } catch (_) {}
  return { token: null, exp: 0 };
}

/** After forum user is restored from localStorage, reattach Supabase JWT (password not available). */
export async function restoreSupabaseChatSessionFromStorage() {
  try {
    const { token, exp } = readPersistedChatJwt();
    const skewMs = 15_000;
    if (!token || !exp || exp * 1000 < Date.now() + skewMs) {
      clearPersistedChatJwt();
      clearSupabaseAccessToken();
      return false;
    }
    setSupabaseAccessToken(token);
    await syncRealtimeAuthToken();
    const sb = getSupabaseClient();
    const { error } = await sb.from('chat_rooms').select('id').limit(1);
    if (error) {
      clearPersistedChatJwt();
      clearSupabaseAccessToken();
      return false;
    }
    return true;
  } catch (_) {
    clearPersistedChatJwt();
    clearSupabaseAccessToken();
    return false;
  }
}

async function callJwtBridge(nickname, password) {
  const res = await fetch('/api/chat-supabase-jwt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.token) {
    throw new Error(json?.error || json?.message || 'Failed to issue chat token');
  }
  return json;
}

export async function signInForumForSupabaseChat(nickname, password) {
  if (typeof nickname !== 'string' || typeof password !== 'string') return false;
  try {
    const issued = await callJwtBridge(nickname.trim(), password);
    setSupabaseAccessToken(issued.token);
    await syncRealtimeAuthToken();

    // Probe lightweight query so misconfigured JWT/RLS fails immediately.
    const sb = getSupabaseClient();
    const { error } = await sb.from('chat_rooms').select('id').limit(1);
    if (error) {
      // Surface so the cause (typically RLS or wrong SUPABASE_URL) is visible
      // in DevTools rather than only manifesting as a silent `false`.
      console.error('[chat/supabase] post-issue probe failed', error);
      clearSupabaseAccessToken();
      clearPersistedChatJwt();
      return false;
    }
    persistChatJwt(issued.token, issued.exp);
    return true;
  } catch (e) {
    console.error('[chat/supabase] signIn bridge failed', e);
    clearSupabaseAccessToken();
    clearPersistedChatJwt();
    return false;
  }
}

export async function signOutSupabaseChat() {
  clearPersistedChatJwt();
  clearSupabaseAccessToken();
}

