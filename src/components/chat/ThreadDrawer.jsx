import { X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

/**
 * Side drawer rendering a single thread (a message + its replies).
 *
 * Pulled out of `ChatRoomView` to keep the chat room render below 1.5k
 * lines. The drawer is purely presentational: the parent owns the
 * `threadFor` state and the `threadMessages` selector.
 */
export function ThreadDrawer({
  open,
  onClose,
  threadMessages,
  roomId,
  forumUser,
  siteUser,
  memberSelf,
  room,
  nickMap,
  memberRoomTitleById,
  forumRoleById,
  roomAdminById,
  canMod,
  canUseChatInteractions,
  replySnippet,
  outgoingDelivery,
  onReply,
  onReport,
  t
}) {
  if (!open) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[20000] flex justify-start" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 cursor-default touch-manipulation border-0 bg-black/55"
        aria-label={t('chat.closeThread')}
        onClick={onClose}
      />
      <div className="relative ms-auto flex h-full max-h-[100dvh] w-full flex-col border-s border-zinc-800 bg-zinc-950 shadow-2xl sm:max-w-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 p-3">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg p-2.5 text-zinc-400 hover:bg-zinc-900 hover:text-white sm:min-h-0 sm:min-w-0 sm:p-2"
            onClick={onClose}
            title={t('chat.closeThread')}
          >
            <X size={20} />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100">
            {t('chat.threadTitle')}
          </h2>
        </div>
        <div className="min-h-0 flex-1 touch-pan-y space-y-1 overflow-y-auto overscroll-y-contain bg-zinc-950 p-3">
          {threadMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              roomId={roomId}
              forumUser={forumUser}
              siteUser={siteUser}
              memberSelf={memberSelf}
              room={room}
              nicknameMap={nickMap}
              memberRoomTitleById={memberRoomTitleById}
              forumRoleById={forumRoleById}
              roomAdminById={roomAdminById}
              onReply={onReply}
              canMod={canMod}
              canUseChatInteractions={canUseChatInteractions}
              replySnippet={replySnippet}
              highlightId={null}
              onReport={onReport}
              onOpenThread={null}
              t={t}
              deliveryStatus={outgoingDelivery[msg.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThreadDrawer;
