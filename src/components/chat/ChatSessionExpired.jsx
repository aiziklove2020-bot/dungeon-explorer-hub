import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ForumLoginModal from '../forum/ForumLoginModal';

/**
 * Shared "chat session expired" screen.
 *
 * The Supabase chat JWT is short-lived (≈1h). When it expires the forum
 * login is still valid, but every Supabase call now fails with RLS / 401.
 * We previously asked the user to log out and back in by hand. The same
 * effect is achieved transparently by re-opening the forum login modal:
 * `forumLogin` re-issues the chat JWT via `signInForumForSupabaseChat`,
 * so a single re-auth restores the chat surface in place.
 *
 * Used from both the lobby (where we detect the expired session before
 * issuing any room queries) and the in-room view (where the per-room
 * `joinRoom` call is the first thing that fails).
 */
export function ChatSessionExpired({
  title,
  hint,
  primaryLabel,
  secondaryLabel,
  onSecondary,
  onReconnected
}) {
  const { t } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  // Modal `onLoggedIn` fires on a successful re-auth; we forward it to the
  // parent so it can clear `sessionExpired` and bump its reload key.
  // `onClose` covers both the cancel path (no token change) and the
  // post-success path (the modal closes itself), so we never need to
  // probe the access-token state from here.
  const handleLoggedIn = () => {
    onReconnected?.();
  };
  return (
    <div
      className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-8 text-center"
      dir="rtl"
    >
      <p className="text-red-300 text-sm mb-2 max-w-md" role="alert">
        {title || t('chat.sessionExpired')}
      </p>
      <p className="text-zinc-400 text-xs mb-6 max-w-md leading-relaxed">
        {hint || t('chat.sessionExpiredHint')}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="inline-flex flex-1 items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm"
        >
          <LogIn size={16} aria-hidden="true" />
          {primaryLabel || t('chat.reconnect')}
        </button>
        {(secondaryLabel || onSecondary) && (
          <button
            type="button"
            onClick={onSecondary}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
          >
            {secondaryLabel || t('chat.goToForum')}
          </button>
        )}
      </div>
      <ForumLoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoggedIn={handleLoggedIn}
      />
    </div>
  );
}

export default ChatSessionExpired;
