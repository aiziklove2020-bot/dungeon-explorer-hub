/** Client-only prefs for live chat (nav dot, drafts key prefix). */

export const CHAT_LAST_SEEN_KEY = 'chatLastSeenAt';

/** '1' = enabled desktop notifications for new chat messages when tab hidden */
export const CHAT_DESKTOP_NOTIF_KEY = 'chat_desktop_notif';

export function getDesktopNotifEnabled() {
  try {
    return localStorage.getItem(CHAT_DESKTOP_NOTIF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDesktopNotifEnabled(on) {
  try {
    localStorage.setItem(CHAT_DESKTOP_NOTIF_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function markChatSeen() {
  try {
    localStorage.setItem(CHAT_LAST_SEEN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function getChatLastSeenMs() {
  try {
    return parseInt(localStorage.getItem(CHAT_LAST_SEEN_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function chatDraftKey(roomId) {
  return `chatDraft:${roomId}`;
}
