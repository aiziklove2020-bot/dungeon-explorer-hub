import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, EyeOff } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { getForumUserById } from '../../firebase/forumUsers';
import {
  setChatMute,
  clearRoomMuteForUser,
  clearChatMute,
  setMemberRoomTitle,
  setMemberVoice,
  promoteRoomAdmin
} from '../../firebase/liveChat';
import { targetIsProtectedForumAdmin, canDemoteRoomAdmin } from '../../utils/liveChatPermissions';

export function MemberRow({
  m,
  nick,
  forumUser,
  siteUser,
  room,
  memberSelf,
  roomId,
  canMod,
  globalMod,
  forumRoleById = {},
  roomAdminById = {},
  t,
  /** Main chat: private rooms the viewer may invite into (creator / room admin). */
  invitePrivateContexts = [],
  /** (targetForumUserId, displayLabel, ctx from invitePrivateContexts) — confirm + send invite. */
  onInviteToPrivateRoom,
  /** Private room: lastSeen heartbeat within threshold — `undefined` hides presence. */
  presenceOnline,
  /** Listed in participantIds but no members/ doc yet (never joined). */
  invitedOnly = false,
  canRemoveThisUser = false,
  onRemoveParticipantFromPrivate
}) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef(null);
  const navigate = useNavigate();
  const label = nick || m.id;
  const memberIsForumAdmin = forumRoleById[m.id] === 'forumAdmin';
  const memberRoomAdmin = !!roomAdminById[m.id] && !memberIsForumAdmin;
  const isSelf = !!forumUser?.id && m.id === forumUser.id;
  const canInviteThisMember =
    !isSelf &&
    invitePrivateContexts.length > 0 &&
    typeof onInviteToPrivateRoom === 'function';
  const showRemovePrivate =
    room?.type === 'private' &&
    canRemoveThisUser &&
    typeof onRemoveParticipantFromPrivate === 'function';
  // Every non-self forum member can be PM'd / have their profile viewed,
  // so the 3-dots menu always opens for them. Mod actions, invite-to-private
  // and remove-from-private are layered on top when applicable.
  const canShowSocialActions = !!forumUser?.id && !isSelf && !!m.id;
  const showMemberMenu =
    canShowSocialActions || canMod || canInviteThisMember || showRemovePrivate;

  const demoting = m.role === 'roomAdmin';
  const showAdminPromoteRow = canMod && m.id !== forumUser?.id;
  const cannotDemoteOwner =
    demoting && !canDemoteRoomAdmin(room, siteUser, forumUser, m.id);

  const run = async (fn) => {
    try {
      await fn();
    } catch (e) {
      alert(e.message || t('error'));
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rowRef}
      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <div
              className={`min-w-0 truncate font-bold ${
                memberIsForumAdmin
                  ? 'text-amber-500'
                  : memberRoomAdmin
                    ? 'rounded bg-white/95 px-1.5 py-0.5 text-black'
                    : 'rounded bg-zinc-800 px-1.5 py-0.5 text-white'
              }`}
            >
              {label}
            </div>
            {m.observeMode && (
              <span
                className="inline-flex shrink-0 text-zinc-500 sm:hidden"
                title={t('chat.observe')}
                aria-label={t('chat.observe')}
              >
                <EyeOff size={14} aria-hidden />
              </span>
            )}
          </div>
          {m.roomTitle ? (
            <div className="truncate text-[10px] text-amber-400">{m.roomTitle}</div>
          ) : null}
          {room?.type === 'private' && typeof presenceOnline === 'boolean' && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
              <span
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  presenceOnline ? 'bg-emerald-500' : 'bg-zinc-600'
                }`}
                aria-hidden
              />
              <span className={presenceOnline ? 'text-emerald-400' : 'text-zinc-500'}>
                {presenceOnline ? t('chat.presenceOnline') : t('chat.presenceOffline')}
              </span>
              {invitedOnly && (
                <span className="text-zinc-500">· {t('chat.invitedNotJoined')}</span>
              )}
            </div>
          )}
          {m.observeMode && (
            <div className="hidden text-[10px] text-zinc-500 sm:block">{t('chat.observe')}</div>
          )}
        </div>
        {showMemberMenu && (
          <button
            type="button"
            className="p-1 text-zinc-500 hover:text-white"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={t('chat.memberRowMenu')}
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-zinc-800 pt-2">
          {canShowSocialActions && (
            <>
              <button
                type="button"
                className="block w-full text-right text-xs text-zinc-200 hover:text-white"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: `/messages/${m.id}` });
                }}
              >
                {t('chat.sendPrivateMessage') || 'שלח הודעה פרטית'}
              </button>
              <button
                type="button"
                className="block w-full text-right text-xs text-zinc-300 hover:text-white"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: `/profile/${m.id}` });
                }}
              >
                {t('chat.viewProfile') || 'צפייה בפרופיל'}
              </button>
            </>
          )}
          {showRemovePrivate && (
            <button
              type="button"
              className="block w-full text-right text-xs font-bold text-red-400 hover:text-red-300"
              onClick={() =>
                run(async () => {
                  await onRemoveParticipantFromPrivate(m.id);
                })
              }
            >
              {t('chat.removeFromRoom')}
            </button>
          )}
          {canInviteThisMember && (
            <>
              {invitePrivateContexts.length === 1 ? (
                <button
                  type="button"
                  className="block w-full text-right text-xs font-bold text-amber-400 hover:text-amber-300"
                  onClick={() =>
                    run(async () => {
                      await onInviteToPrivateRoom(m.id, label, invitePrivateContexts[0]);
                    })
                  }
                >
                  {t('chat.inviteMemberToPrivate')}
                </button>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-zinc-500">{t('chat.inviteMemberPickPrivateSection')}</div>
                  {invitePrivateContexts.map((ctx) => (
                    <button
                      key={ctx.roomId}
                      type="button"
                      className="block w-full truncate text-right text-xs text-amber-400 hover:text-amber-300"
                      title={(ctx.room?.name || ctx.room?.id || ctx.roomId).slice(0, 120)}
                      onClick={() =>
                        run(async () => {
                          await onInviteToPrivateRoom(m.id, label, ctx);
                        })
                      }
                    >
                      {(ctx.room?.name || ctx.room?.id || ctx.roomId).slice(0, 48)}
                    </button>
                  ))}
                </>
              )}
            </>
          )}
          {!invitedOnly &&
            canMod &&
            m.id !== forumUser?.id && (
            <button
              type="button"
              className="block w-full text-right text-xs text-red-300 hover:text-white"
              onClick={() =>
                run(async () => {
                  const hours = Number(
                    prompt(globalMod ? t('chat.muteHours') : t('chat.muteRoomHours'), '24')
                  );
                  if (!hours || hours < 1) return;
                  await setChatMute(
                    m.id,
                    globalMod
                      ? { globalHours: hours, roomId: null, roomHours: 0 }
                      : { globalHours: 0, roomId, roomHours: hours },
                    forumUser,
                    siteUser,
                    room,
                    memberSelf
                  );
                })
              }
            >
              {t('chat.setMute')}
            </button>
          )}
          {!invitedOnly && canMod && !globalMod && (
            <button
              type="button"
              className="block w-full text-right text-xs text-zinc-400 hover:text-white"
              onClick={() =>
                run(async () => {
                  await clearRoomMuteForUser(m.id, roomId, forumUser, siteUser, room, memberSelf);
                })
              }
            >
              {t('chat.clearRoomMute')}
            </button>
          )}
          {!invitedOnly && globalMod && (
            <button
              type="button"
              className="block w-full text-right text-xs text-zinc-400 hover:text-white"
              onClick={() =>
                run(async () => {
                  await clearChatMute(m.id, siteUser, forumUser);
                })
              }
            >
              {t('chat.clearGlobalMute')}
            </button>
          )}
          {!invitedOnly && canMod && (
            <button
              type="button"
              className="block w-full text-right text-xs text-zinc-400 hover:text-white"
              onClick={() =>
                run(async () => {
                  const title = prompt(t('chat.setTitle'), m.roomTitle || '');
                  if (title == null) return;
                  await setMemberRoomTitle(roomId, m.id, title, forumUser, siteUser, memberSelf, room);
                })
              }
            >
              {t('chat.setTitle')}
            </button>
          )}
          {!invitedOnly &&
            canMod &&
            m.id !== forumUser?.id &&
            m.role !== 'roomAdmin' &&
            m.id !== room?.createdByForumUserId && (
              <>
                {!m.hasVoice ? (
                  <button
                    type="button"
                    className="block w-full text-right text-xs text-emerald-400 hover:text-white"
                    onClick={() =>
                      run(async () => {
                        await setMemberVoice(roomId, m.id, true, forumUser, siteUser, memberSelf, room);
                      })
                    }
                  >
                    {t('chat.giveVoice')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-right text-xs text-zinc-400 hover:text-white"
                    onClick={() =>
                      run(async () => {
                        await setMemberVoice(roomId, m.id, false, forumUser, siteUser, memberSelf, room);
                      })
                    }
                  >
                    {t('chat.revokeVoice')}
                  </button>
                )}
              </>
            )}
          {!invitedOnly && showAdminPromoteRow && (
            <button
              type="button"
              disabled={cannotDemoteOwner}
              aria-disabled={cannotDemoteOwner}
              title={cannotDemoteOwner ? t('chat.cannotDemoteOwner') : undefined}
              className="block w-full text-right text-xs text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600"
              onClick={() =>
                run(async () => {
                  const u = await getForumUserById(m.id);
                  if (targetIsProtectedForumAdmin(u)) {
                    alert(t('chat.cannotChangeForumAdminRole'));
                    return;
                  }
                  await promoteRoomAdmin(
                    roomId,
                    m.id,
                    !demoting,
                    forumUser,
                    siteUser,
                    memberSelf,
                    room
                  );
                })
              }
            >
              {demoting ? t('chat.demoteAdmin') : t('chat.promoteAdmin')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
