export function getChatBackend() {
  if (typeof import.meta === 'undefined') return 'firebase';
  const raw = String(import.meta.env?.VITE_CHAT_BACKEND || '').trim().toLowerCase();
  if (raw === 'supabase') return 'supabase';
  return 'firebase';
}

export function isSupabaseChatBackend() {
  return getChatBackend() === 'supabase';
}

