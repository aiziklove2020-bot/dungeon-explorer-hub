import { useState, useEffect, useId, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { getAllForumUsers } from '../../firebase/forumUsers';
import Dialog from '../a11y/Dialog';
import {
  setPrivateRoomInviteLink,
  regeneratePrivateRoomInviteToken,
  inviteForumUsersToPrivateRoom,
  setRoomAdminsOnlyMode,
  setRoomSlowMode,
  renameRoom,
  setRoomDescription,
  closeRoom,
  setRoomLinkedTopic
} from '../../firebase/liveChat';
import { canInviteToPrivateRoom, canToggleAdminsOnlyMode } from '../../utils/liveChatPermissions';

export function ModPanel({ roomId, room, forumUser, siteUser, memberSelf, globalMod, t, inModal = false }) {
  const [slow, setSlow] = useState(String(room?.slowModeSeconds || 0));
  const [description, setDescription] = useState(String(room?.description || ''));
  const [descriptionBusy, setDescriptionBusy] = useState(false);
  const [adminsOnlyBusy, setAdminsOnlyBusy] = useState(false);

  // Keep the editor in sync when the room doc changes underneath us
  // (realtime push from another mod, or initial late load).
  useEffect(() => {
    setDescription(String(room?.description || ''));
  }, [room?.description]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [forumUsers, setForumUsers] = useState([]);
  const [inviteSelected, setInviteSelected] = useState(() => new Set());
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLinkBusy, setInviteLinkBusy] = useState(false);
  const [regenerateBusy, setRegenerateBusy] = useState(false);
  const inviteTitleId = useId();

  const canInvite =
    room?.type === 'private' && forumUser?.id && memberSelf && canInviteToPrivateRoom(room, forumUser, memberSelf);

  const inviteJoinUrl =
    room?.inviteLinkEnabled && room?.inviteToken && typeof window !== 'undefined'
      ? `${window.location.origin.replace(/\/+$/, '')}/chat/join/${room.inviteToken}`
      : '';

  const copyInviteJoinUrl = () => {
    if (!inviteJoinUrl) return;
    void navigator.clipboard?.writeText(inviteJoinUrl).then(
      () => alert(t('chat.inviteLinkCopied')),
      () => alert(t('chat.inviteLinkCopyFailed'))
    );
  };

  const toggleInviteLink = async (enabled) => {
    setInviteLinkBusy(true);
    try {
      await setPrivateRoomInviteLink(roomId, enabled, forumUser, siteUser, memberSelf, room);
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setInviteLinkBusy(false);
    }
  };

  const regenerateInviteLink = async () => {
    if (!confirm(t('chat.inviteLinkRegenerateConfirm'))) return;
    setRegenerateBusy(true);
    try {
      await regeneratePrivateRoomInviteToken(roomId, forumUser, siteUser, memberSelf, room);
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setRegenerateBusy(false);
    }
  };

  useEffect(() => {
    setSlow(String(room?.slowModeSeconds || 0));
  }, [room?.slowModeSeconds, roomId]);

  useEffect(() => {
    if (!inviteOpen || !forumUser?.id) return;
    let cancelled = false;
    (async () => {
      const users = await getAllForumUsers();
      if (!cancelled) setForumUsers(users || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteOpen, forumUser?.id]);

  useEffect(() => {
    if (!inviteOpen) {
      setInviteQuery('');
      setInviteSelected(new Set());
    }
  }, [inviteOpen]);

  const canAdminsOnlyToggle =
    room && canToggleAdminsOnlyMode(room, siteUser, forumUser, memberSelf);

  const onAdminsOnlyChange = (e) => {
    const checked = e.target.checked;
    setAdminsOnlyBusy(true);
    setRoomAdminsOnlyMode(roomId, checked, forumUser, siteUser, memberSelf, room)
      .catch((err) => alert(err.message || 'שגיאה'))
      .finally(() => setAdminsOnlyBusy(false));
  };

  const participantSet = useMemo(() => new Set(room?.participantIds || []), [room?.participantIds]);

  const inviteCandidates = useMemo(() => {
    const q = inviteQuery.trim().toLowerCase();
    return forumUsers
      .filter((u) => {
        if (!u.id || u.id === forumUser?.id || u.isBlocked) return false;
        if (participantSet.has(u.id)) return false;
        if (!q) return true;
        return (u.nickname || '').toLowerCase().includes(q);
      })
      .slice(0, 40);
  }, [forumUsers, inviteQuery, forumUser?.id, participantSet]);

  const toggleInviteSelect = (id) => {
    setInviteSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runInvite = async () => {
    const ids = [...inviteSelected];
    if (ids.length === 0) return;
    setInviteBusy(true);
    try {
      await inviteForumUsersToPrivateRoom(roomId, ids, forumUser, memberSelf, room);
      setInviteOpen(false);
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setInviteBusy(false);
    }
  };

  const applySlow = () =>
    setRoomSlowMode(roomId, Number(slow) || 0, forumUser, siteUser, memberSelf, room).catch((e) =>
      alert(e.message)
    );

  const applyRename = () => {
    const name = prompt(t('chat.rename'), room?.name || '');
    if (name == null) return;
    renameRoom(roomId, name, forumUser, siteUser, memberSelf, room).catch((e) => alert(e.message));
  };

  const applyDescription = async () => {
    if (descriptionBusy) return;
    setDescriptionBusy(true);
    try {
      await setRoomDescription(roomId, description, forumUser, siteUser, memberSelf, room);
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setDescriptionBusy(false);
    }
  };

  const applyClose = () => {
    if (!confirm(t('chat.closeRoomConfirm'))) return;
    closeRoom(roomId, forumUser, siteUser, memberSelf, room).catch((e) => alert(e.message));
  };

  const applyLinkedTopic = () => {
    const v = prompt(t('chat.linkedTopicPrompt'), room?.linkedTopicId || '');
    if (v == null) return;
    const trimmed = v.trim();
    setRoomLinkedTopic(
      roomId,
      trimmed || null,
      forumUser,
      siteUser,
      memberSelf,
      room
    ).catch((e) => alert(e.message));
  };

  const panelWrap = inModal ? 'space-y-4 text-xs' : 'space-y-2 border-t border-zinc-800 p-3 text-xs';

  return (
    <div className={panelWrap}>
      {canInvite && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
          <h3 className="text-sm font-bold text-zinc-100">{t('chat.inviteLinkSection')}</h3>
          <p className="text-[11px] leading-snug text-zinc-500">{t('chat.inviteLinkHint')}</p>
          <label className="flex cursor-pointer select-none items-center gap-2 text-zinc-300">
            <input
              type="checkbox"
              className="size-4 rounded border-zinc-600 bg-zinc-900 text-red-600"
              checked={!!room?.inviteLinkEnabled}
              disabled={inviteLinkBusy}
              onChange={(e) => void toggleInviteLink(e.target.checked)}
            />
            <span>{t('chat.inviteLinkEnable')}</span>
          </label>
          {!!room?.inviteLinkEnabled && !!room?.inviteToken && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={inviteJoinUrl}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-[11px] text-zinc-300"
                  aria-label={t('chat.inviteLinkUrl')}
                />
                <button
                  type="button"
                  onClick={copyInviteJoinUrl}
                  className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                >
                  {t('chat.inviteLinkCopy')}
                </button>
              </div>
              <button
                type="button"
                disabled={regenerateBusy}
                onClick={() => void regenerateInviteLink()}
                className="text-xs font-bold text-amber-400/90 hover:text-amber-300 disabled:opacity-40"
              >
                {regenerateBusy ? '…' : t('chat.inviteLinkRegenerate')}
              </button>
            </div>
          )}
        </div>
      )}
      {canInvite && (
        <>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-red-900/50 py-2 font-bold text-white hover:bg-red-900/80"
          >
            <UserPlus size={16} />
            {t('chat.inviteByNickname')}
          </button>
          <Dialog
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            labelledBy={inviteTitleId}
            className="fixed inset-0 z-[19950] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
            panelClassName="max-h-[min(88dvh,100vh)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-950 p-4 sm:rounded-2xl"
          >
            <h4 id={inviteTitleId} className="mb-2 text-sm font-bold text-white">{t('chat.inviteByNickname')}</h4>
            <p className="mb-3 text-[11px] leading-snug text-zinc-400">{t('chat.inviteToRoomHint')}</p>
            <label htmlFor={inviteTitleId + '-search'} className="sr-only">{t('chat.searchUsers')}</label>
            <input
              id={inviteTitleId + '-search'}
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              placeholder={t('chat.searchUsers')}
              className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white placeholder:text-zinc-400"
            />
            <ul className="mb-3 max-h-36 divide-y divide-zinc-800 overflow-y-auto rounded-lg border border-zinc-800" aria-label={t('chat.inviteByNickname')}>
              {inviteCandidates.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => toggleInviteSelect(u.id)}
                    aria-pressed={inviteSelected.has(u.id)}
                    className={`w-full px-2 py-2 text-right text-sm ${
                      inviteSelected.has(u.id) ? 'bg-red-900/40 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {u.nickname}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 sm:w-auto"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={inviteBusy || inviteSelected.size === 0}
                aria-disabled={inviteBusy || inviteSelected.size === 0}
                onClick={runInvite}
                className="w-full rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-400 sm:w-auto"
              >
                {inviteBusy ? '…' : t('chat.sendInvites')}
              </button>
            </div>
          </Dialog>
        </>
      )}
      {inModal && (
        <p className="text-[11px] leading-snug text-zinc-500">{t('chat.sectionMembersHint')}</p>
      )}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
        <h3 className="text-sm font-bold text-zinc-200">{t('chat.roomDescription')}</h3>
        <p className="text-[11px] leading-snug text-zinc-500">{t('chat.roomDescriptionHint')}</p>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value.replace(/[\r\n]+/g, ' '))}
          maxLength={200}
          placeholder={t('chat.roomDescriptionPlaceholder')}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
        />
        <button
          type="button"
          onClick={() => void applyDescription()}
          disabled={descriptionBusy || description === (room?.description || '')}
          className="w-full rounded bg-zinc-800 py-1.5 text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {descriptionBusy ? '…' : t('chat.roomDescriptionSave')}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
        <h3 className="text-sm font-bold text-zinc-200">{t('chat.sectionPosting')}</h3>
        {canAdminsOnlyToggle && (
          <label className="flex cursor-pointer select-none items-center gap-2 text-zinc-300">
            <input
              type="checkbox"
              checked={!!room?.adminsOnlyMode}
              disabled={adminsOnlyBusy}
              onChange={onAdminsOnlyChange}
            />
            <span>{t('chat.adminsOnlyMode')}</span>
          </label>
        )}
        <p className="text-[11px] leading-snug text-zinc-500">{t('chat.slowModeHint')}</p>
        <input
          type="number"
          min={0}
          max={3600}
          value={slow}
          onChange={(e) => setSlow(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
          placeholder={t('chat.slowMode')}
        />
        <button type="button" onClick={applySlow} className="w-full rounded bg-zinc-800 py-1.5 text-white hover:bg-zinc-700">
          {t('chat.slowModeSave')}
        </button>
        <button type="button" onClick={applyRename} className="w-full text-red-400 hover:text-white">
          {t('chat.rename')}
        </button>
        <button type="button" onClick={applyLinkedTopic} className="w-full text-amber-400/90 hover:text-amber-300">
          {t('chat.setLinkedTopic')}
        </button>
        {(room?.type === 'private' || globalMod) && (
          <button type="button" onClick={applyClose} className="w-full text-red-500 hover:text-red-400">
            {t('chat.closeRoom')}
          </button>
        )}
      </div>
    </div>
  );
}
