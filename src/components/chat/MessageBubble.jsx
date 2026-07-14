import { useState, useEffect, useMemo } from 'react';
import { Pin, Trash2, MessagesSquare, Copy, Flag, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeReactions,
  toggleReaction,
  pinMessage,
  softDeleteMessage
} from '../../firebase/liveChat';
import { QUICK_REACTIONS } from './chatRoomConstants';

/** @see subscribeReactions in firebase/liveChat — one listener per visible message row. */
export function MessageBubble({
  msg,
  roomId,
  forumUser,
  siteUser,
  memberSelf,
  room,
  nicknameMap,
  /** Map author forum user id → room title (תואר בחדר) for this room’s members. */
  memberRoomTitleById = {},
  forumRoleById = {},
  roomAdminById = {},
  onReply,
  canMod,
  canUseChatInteractions,
  replySnippet,
  highlightId,
  onReport,
  onOpenThread,
  t,
  /** When true, bottom spacing comes from the virtual list `gap` (not margin) so row height measures correctly. */
  virtualListRow = false,
  /**
   * When set (e.g. main virtual list), reactions come from `useVisibleChatReactions` — bounded listeners.
   * Omit in thread panel / other contexts so each bubble subscribes on its own.
   */
  parentReactionPool,
  /** Outgoing message: show spinner then check (WhatsApp-style). */
  deliveryStatus
}) {
  const navigate = useNavigate();
  const fromParentPool = parentReactionPool !== undefined;
  const [internalReactions, setInternalReactions] = useState([]);
  useEffect(() => {
    if (!msg?.id || msg.deleted || fromParentPool) return () => {};
    return subscribeReactions(roomId, msg.id, setInternalReactions);
  }, [roomId, msg?.id, msg.deleted, fromParentPool]);

  const reactions = fromParentPool ? (parentReactionPool[msg.id] ?? []) : internalReactions;

  /** Optimistic reaction state for instant UI feedback.
   *  null  → pass server reactions through unchanged
   *  ''    → optimistically cleared mine
   *  emoji → optimistically picked emoji (replaces any prior emoji of mine)
   */
  const [optimisticMine, setOptimisticMine] = useState(null);

  const myServerEmoji = useMemo(() => {
    if (!forumUser?.id) return '';
    const r = reactions.find((x) => x.userId === forumUser.id);
    return r?.emoji || '';
  }, [reactions, forumUser?.id]);

  /** Once the server reflects what we optimistically applied, drop the override so future
   * server updates flow through normally (and so a revert doesn't fight live state).
   */
  useEffect(() => {
    if (optimisticMine === null) return;
    if (myServerEmoji === optimisticMine) setOptimisticMine(null);
  }, [myServerEmoji, optimisticMine]);

  const myCurrentEmoji = optimisticMine != null ? optimisticMine : myServerEmoji;

  const displayedReactions = useMemo(() => {
    if (optimisticMine === null) return reactions;
    const others = reactions.filter((x) => x.userId !== forumUser?.id);
    if (optimisticMine) {
      others.push({
        id: `optimistic-${forumUser?.id}`,
        emoji: optimisticMine,
        userId: forumUser?.id,
        createdAt: new Date()
      });
    }
    return others;
  }, [reactions, optimisticMine, forumUser?.id]);

  const handleReactionClick = (emoji) => {
    if (!canUseChatInteractions || !forumUser?.id) return;
    const safeEmoji = [...(emoji || '')].slice(0, 4).join('') || '👍';
    const next = myCurrentEmoji === safeEmoji ? '' : safeEmoji;
    setOptimisticMine(next);
    toggleReaction(roomId, msg.id, forumUser, siteUser, emoji).catch((err) => {
      setOptimisticMine(null);
      alert(err?.message || 'שגיאה');
    });
  };

  const mine = msg.authorId === forumUser?.id;
  const hl = highlightId === msg.id;
  if (msg.deleted) {
    return (
      <div
        id={`chat-msg-${msg.id}`}
        className={`flex ${mine ? 'justify-start' : 'justify-start'} ${virtualListRow ? 'mb-0' : 'mb-3'}`}
      >
        <div className="max-w-[min(92%,24rem)] sm:max-w-[85%] rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm italic text-zinc-500">
          {t('chat.deleted')}
        </div>
      </div>
    );
  }

  const replyLabel = msg.replyToMessageId
    ? (replySnippet(msg.replyToMessageId) || msg.replyToMessageId)
    : null;

  const grouped = displayedReactions.reduce((acc, r) => {
    const e = r.emoji || '👍';
    acc[e] = acc[e] || [];
    acc[e].push(r.userId);
    return acc;
  }, {});

  const formattedTime = useMemo(() => {
    if (!msg.createdAt) return '';
    const d = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    return isToday 
      ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }, [msg.createdAt]);

  const authorForumAdmin = forumRoleById[msg.authorId] === 'forumAdmin';
  const authorRoomAdmin = !!roomAdminById[msg.authorId] && !authorForumAdmin;
  const authorRoomTitle = memberRoomTitleById[msg.authorId] || '';

  // Clicking a nickname routes to the author's profile (where the "send PM"
  // button already exists). Self-author and system messages are not
  // clickable. authorId === 'system' guards against the synthetic system
  // sender used by chat_send_system_line.
  const authorClickable =
    !!msg.authorId && msg.authorId !== 'system' && msg.authorId !== forumUser?.id;
  const onAuthorClick = authorClickable
    ? () => navigate(`/profile/${msg.authorId}`)
    : undefined;

  const copyMessageText = () => {
    const text = msg?.text || '';
    if (!text) return;
    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        alert('לא ניתן להעתיק');
      }
    })();
  };

  const actionBtnClass =
    'inline-flex max-w-full touch-manipulation items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold leading-tight text-zinc-300 hover:bg-zinc-800/60 hover:text-white';

  return (
    <div
      id={`chat-msg-${msg.id}`}
      className={`flex ${virtualListRow ? 'mb-0' : 'mb-3'} ${mine ? 'justify-end' : 'justify-start'} ${hl ? 'transition-shadow duration-300' : ''}`}
    >
      <div
        className={`max-w-[min(92%,24rem)] sm:max-w-[85%] rounded-2xl ${
          msg.isSystem ? 'px-2 py-1 sm:px-2.5 sm:py-1' : 'px-3 py-2 sm:px-4 sm:py-2.5'
        } ${
          hl ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950' : ''
        } ${
          msg.isSystem
            ? 'mx-auto max-w-[min(96%,28rem)] border border-zinc-700 bg-zinc-800/80 text-center text-[11px] leading-tight text-zinc-400'
            : mine
              ? 'bg-red-900/90 text-white border border-red-800'
              : 'bg-zinc-900 border border-zinc-700 text-zinc-100'
        }`}
      >
        {!msg.isSystem && (
          <div className="mb-1 rounded-md px-2 py-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              {(() => {
                const baseClass =
                  authorForumAdmin
                    ? 'font-bold text-amber-600'
                    : authorRoomAdmin
                      ? 'rounded bg-white/95 px-1.5 py-0.5 font-bold text-black'
                      : 'rounded bg-zinc-800 px-1.5 py-0.5 font-bold text-white';
                const inner = (
                  <>
                    {msg.authorNickname || nicknameMap[msg.authorId] || msg.authorId}
                    {authorRoomTitle ? (
                      <span className="font-normal text-amber-400"> · {authorRoomTitle}</span>
                    ) : null}
                  </>
                );
                return authorClickable ? (
                  <button
                    type="button"
                    onClick={onAuthorClick}
                    className={`${baseClass} hover:underline focus:underline focus:outline-none`}
                    title={t('chat.viewProfile') || 'צפייה בפרופיל'}
                  >
                    {inner}
                  </button>
                ) : (
                  <span className={baseClass}>{inner}</span>
                );
              })()}
              <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
                {!msg.isSystem && onOpenThread && (
                  <button type="button" className={actionBtnClass} onClick={() => onOpenThread(msg)}>
                    <MessagesSquare size={12} className="shrink-0" />
                    <span>{t('chat.openThread')}</span>
                  </button>
                )}
                <button type="button" className={actionBtnClass} onClick={copyMessageText}>
                  <Copy size={12} className="shrink-0" />
                  <span>{t('chat.copyMsg')}</span>
                </button>
                {canMod && (
                  <>
                    <button
                      type="button"
                      className={actionBtnClass}
                      onClick={() => pinMessage(roomId, msg.id, forumUser, siteUser, memberSelf, room)}
                    >
                      <Pin size={12} className="shrink-0" />
                      <span>{t('chat.pinMsg')}</span>
                    </button>
                    <button
                      type="button"
                      className={actionBtnClass}
                      onClick={() => softDeleteMessage(roomId, msg.id, forumUser, siteUser, memberSelf, room)}
                    >
                      <Trash2 size={12} className="shrink-0" />
                      <span>{t('chat.deleteMsg')}</span>
                    </button>
                  </>
                )}
                {!msg.isSystem && !mine && onReport && (
                  <button type="button" className={actionBtnClass} onClick={() => onReport(msg)}>
                    <Flag size={12} className="shrink-0" />
                    <span>{t('chat.report')}</span>
                  </button>
                )}
              </span>
            </div>
          </div>
        )}
        {replyLabel && !msg.isSystem && (
          <div className="mb-1 line-clamp-2 rounded border-r-4 border-red-600 bg-white/95 px-2 py-1 text-[10px] shadow-sm">
            <span className="font-bold text-black">{t('chat.replyingTo')}:</span>{' '}
            <span className="font-bold text-zinc-800">{replyLabel}</span>
          </div>
        )}
        {msg.isAction ? (
          <p className={`text-center italic text-white ${msg.isSystem ? 'text-xs leading-snug' : 'text-sm'}`}>
            *
            {(() => {
              const baseClass =
                authorForumAdmin
                  ? 'font-bold text-amber-400'
                  : authorRoomAdmin
                    ? 'rounded bg-white/95 px-1 font-bold text-black'
                    : 'font-bold text-white';
              const inner = (
                <>
                  {msg.authorNickname || nicknameMap[msg.authorId] || ''}
                  {authorRoomTitle ? (
                    <span className="font-normal text-amber-300"> · {authorRoomTitle}</span>
                  ) : null}
                </>
              );
              return authorClickable ? (
                <button
                  type="button"
                  onClick={onAuthorClick}
                  className={`${baseClass} hover:underline focus:underline focus:outline-none`}
                  title={t('chat.viewProfile') || 'צפייה בפרופיל'}
                >
                  {inner}
                </button>
              ) : (
                <span className={baseClass}>{inner}</span>
              );
            })()}{' '}
            <span className="text-white">{msg.text}</span>*
          </p>
        ) : (
          <p
            className={`whitespace-pre-wrap break-words text-white ${
              msg.isSystem ? 'text-[11px] leading-tight' : 'text-sm leading-relaxed'
            }`}
          >
            {msg.text}
          </p>
        )}
        {!msg.isSystem && !msg.isAction && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {QUICK_REACTIONS.map((emoji) => {
              const isMine = myCurrentEmoji === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  disabled={!canUseChatInteractions}
                  aria-disabled={!canUseChatInteractions}
                  aria-pressed={isMine}
                  className={`rounded-full px-1.5 py-0.5 text-base transition disabled:pointer-events-none disabled:grayscale disabled:opacity-60 ${
                    isMine
                      ? 'bg-amber-500/20 ring-1 ring-amber-400 opacity-100'
                      : 'opacity-90 hover:scale-110 hover:opacity-100'
                  }`}
                  onClick={() => handleReactionClick(emoji)}
                >
                  {emoji}
                </button>
              );
            })}
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[11px] font-bold text-zinc-300 hover:text-white hover:underline"
              onClick={() => onReply(msg)}
            >
              {t('chat.replyingTo')}
            </button>
          </div>
        )}
        {Object.keys(grouped).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(grouped).map(([emoji, ids]) => (
              <span
                key={emoji}
                className="rounded-full border border-zinc-600 bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300"
              >
                {emoji} {ids.length}
              </span>
            ))}
          </div>
        )}
        {!msg.isSystem && (formattedTime || (mine && deliveryStatus)) && (
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/50" aria-live="polite">
            {formattedTime && <span>{formattedTime}</span>}
            {mine && deliveryStatus && (
              <>
                {deliveryStatus === 'sending' ? (
                  <Loader2
                    className={`size-3.5 shrink-0 animate-spin ${msg.isAction ? 'text-white/70' : 'text-white/65'}`}
                    aria-label={t('chat.sending')}
                  />
                ) : (
                  <Check
                    className={`size-3.5 shrink-0 ${msg.isAction ? 'text-white/80' : 'text-white/75'}`}
                    strokeWidth={2.5}
                    aria-label={t('chat.sent')}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
