export const CHAT_SEND_ON_ENTER_KEY = 'chat_send_on_enter';

export function readSendOnEnterPreference() {
  try {
    const v = localStorage.getItem(CHAT_SEND_ON_ENTER_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function pickTime(a) {
  if (!a?.createdAt) return 0;
  if (a.createdAt?.toMillis) return a.createdAt.toMillis();
  if (a.createdAt?.seconds) return a.createdAt.seconds * 1000;
  if (a.createdAt instanceof Date) return a.createdAt.getTime();
  return 0;
}

/** Firestore Timestamp | Date | epoch ms | ISO string — used for member presence heartbeat. */
export function memberLastSeenAtMs(lastSeenAt) {
  if (lastSeenAt == null) return 0;
  if (typeof lastSeenAt.toMillis === 'function') return lastSeenAt.toMillis();
  if (typeof lastSeenAt.seconds === 'number') return lastSeenAt.seconds * 1000;
  if (lastSeenAt instanceof Date) {
    const t = lastSeenAt.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof lastSeenAt === 'number' && Number.isFinite(lastSeenAt)) return lastSeenAt;
  const d = new Date(lastSeenAt);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Full thread for side panel: walk up `replyToMessageId` to the root, then include every
 * message that replies (directly or nested) to any message already in the thread.
 */
export function collectThreadMessageIds(messages, openMessageId) {
  const byId = new Map(messages.map((m) => [m.id, m]));
  let rootId = openMessageId;
  for (let depth = 0; depth < 500; depth++) {
    const m = byId.get(rootId);
    if (!m?.replyToMessageId) break;
    const parent = byId.get(m.replyToMessageId);
    if (!parent) break;
    rootId = parent.id;
  }
  const inThread = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of messages) {
      if (!m.replyToMessageId || !inThread.has(m.replyToMessageId)) continue;
      if (!inThread.has(m.id)) {
        inThread.add(m.id);
        changed = true;
      }
    }
  }
  return inThread;
}
