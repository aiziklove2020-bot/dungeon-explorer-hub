import { createNotification } from '../notifications';

/** Build mention targets from in-memory member list + nick map (avoids N getForumUserById on send). */
export function buildMemberNicknamesForMentions(members, nicknameById = {}) {
  if (!Array.isArray(members)) return [];
  const out = [];
  for (const m of members) {
    if (!m?.id) continue;
    const nickname = String(nicknameById[m.id] || '').trim();
    if (!nickname) continue;
    out.push({ id: m.id, nickname });
  }
  return out;
}

export async function maybeNotifyMentions(roomId, text, authorForumUser, memberNicknames, opts = {}) {
  if (!text?.includes('@') || !memberNicknames?.length) return;
  const roomName = String(opts?.roomName || '').slice(0, 100);
  // The message id lets the bell deep-link to /chat/<room>?m=<msg> and
  // briefly highlight the exact message that mentioned the recipient
  // (the `?m=` flow is already wired in ChatRoomView).
  const messageId = String(opts?.messageId || '').slice(0, 64);
  const lower = text.toLowerCase();
  for (const { id, nickname } of memberNicknames) {
    if (!nickname || id === authorForumUser.id) continue;
    const needle = `@${nickname.toLowerCase()}`;
    if (!lower.includes(needle)) continue;
    createNotification({
      userId: id,
      type: 'chatMention',
      fromUserId: authorForumUser.id,
      fromUserName: authorForumUser.nickname || '',
      refId: roomId,
      // refTitle gets shown as the secondary line in the bell — using the
      // room name there gives the recipient enough context to know which
      // room they were @-mentioned in without opening it.
      refTitle: roomName,
      // refMessageId is read by NotificationBell.handleClick and
      // appended as ?m=<id> so we land on the exact mention.
      refMessageId: messageId || null,
      message: `${authorForumUser.nickname || 'משתמש'} הזכיר אותך בצ׳אט`
    }).catch(() => {});
  }
}
