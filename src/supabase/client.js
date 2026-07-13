import { createClient } from '@supabase/supabase-js';

const url = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '';
const anonKey = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : '';

let accessToken = null;
let supabaseClient = null;

/** Publishable or legacy anon JWT only — never sb_secret_ / service_role (blocked by Supabase in browsers). */
function assertBrowserSafeSupabaseKey(key) {
  const k = String(key || '').trim();
  if (!k) return;
  if (k.startsWith('sb_secret_')) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY is a secret API key. Use the publishable key (sb_publishable_…) or legacy anon key in the browser; keep sb_secret_ only in server env (e.g. SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
}

export function supabaseChatConfigured() {
  return !!(url && anonKey);
}

export function setSupabaseAccessToken(token) {
  const next = token ? String(token).trim() : null;
  if (next === accessToken) return;
  accessToken = next;
  supabaseClient = null;
}

export function clearSupabaseAccessToken() {
  accessToken = null;
  supabaseClient = null;
}

/** Whether a forum chat JWT was set (required for PostgREST RLS). */
export function hasSupabaseChatAccessToken() {
  return !!accessToken;
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!supabaseChatConfigured()) {
    throw new Error('Supabase chat is not configured');
  }
  assertBrowserSafeSupabaseKey(anonKey);
  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    accessToken: async () => accessToken
  });
  return supabaseClient;
}

export async function syncRealtimeAuthToken() {
  const sb = getSupabaseClient();
  if (accessToken) {
    await sb.realtime.setAuth(accessToken);
  }
}

