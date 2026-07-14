import { Users, X } from 'lucide-react';
import { MemberRow } from './MemberRow';
import { ModPanel } from './ModPanel';

/**
 * Mobile bottom-sheet that lists room members and (for staff) embeds
 * `ModPanel` underneath. Only renders on lg-down breakpoints (`lg:hidden`)
 * — desktop has its own sidebar in `ChatRoomView`.
 */
export function MobileMembersDrawer({
  open,
  onClose,
  rosterForSidebar,
  memberRowSharedProps,
  nickMap,
  onRemoveParticipantFromPrivate,
  canMod,
  roomId,
  room,
  forumUser,
  siteUser,
  memberSelf,
  globalMod,
  t
}) {
  if (!open) return null;
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[19950] flex items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4 lg:hidden"
      dir="rtl"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default touch-manipulation border-0 bg-black/65"
        aria-label={t('close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-chat-members-title"
        className="relative z-10 flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
          <div
            id="mobile-chat-members-title"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-zinc-100"
          >
            <Users size={18} className="shrink-0 text-zinc-400" aria-hidden />
            <span className="truncate">
              {t('chat.members')} ({rosterForSidebar.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-2">
          {rosterForSidebar.map((row) => (
            <MemberRow
              key={row.id}
              {...memberRowSharedProps}
              m={row.m}
              nick={nickMap[row.id]}
              presenceOnline={row.presenceOnline}
              invitedOnly={row.invitedOnly}
              canRemoveThisUser={row.canRemoveThisUser}
              onRemoveParticipantFromPrivate={onRemoveParticipantFromPrivate}
            />
          ))}
        </div>
        {canMod && (
          <div className="max-h-[min(38dvh,16rem)] shrink-0 overflow-y-auto overscroll-contain border-t border-zinc-800 p-3">
            <ModPanel
              roomId={roomId}
              room={room}
              forumUser={forumUser}
              siteUser={siteUser}
              memberSelf={memberSelf}
              globalMod={globalMod}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileMembersDrawer;
