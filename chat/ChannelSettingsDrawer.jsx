import { useId } from 'react';
import { X } from 'lucide-react';
import { ModPanel } from './ModPanel';
import Dialog from '../a11y/Dialog';

/**
 * Side-drawer that wraps `ModPanel` for room staff (private rooms).
 *
 * Extracted from `ChatRoomView` so the room view doesn't have to inline
 * ~35 lines of overlay markup. The component is purposefully dumb: it
 * just owns the modal frame and forwards everything to `ModPanel`.
 */
export function ChannelSettingsDrawer({
  open,
  onClose,
  roomId,
  room,
  forumUser,
  siteUser,
  memberSelf,
  globalMod,
  t
}) {
  const titleId = useId();
  return (
    <Dialog
      open={!!open}
      onClose={onClose}
      labelledBy={titleId}
      className="pointer-events-auto fixed inset-0 z-[19900] flex justify-start bg-black/60"
      panelClassName="relative ms-auto flex h-full max-h-[100dvh] w-full max-w-lg flex-col border-s border-zinc-800 bg-zinc-950 shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div dir="rtl" className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            aria-label={t('cancel')}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-bold text-zinc-100">
            {t('chat.channelSettings')}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3">
          <ModPanel
            roomId={roomId}
            room={room}
            forumUser={forumUser}
            siteUser={siteUser}
            memberSelf={memberSelf}
            globalMod={globalMod}
            t={t}
            inModal
          />
        </div>
      </div>
    </Dialog>
  );
}

export default ChannelSettingsDrawer;
