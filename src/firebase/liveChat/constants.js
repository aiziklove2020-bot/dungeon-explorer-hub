export const MAIN_ROOM_ID = 'main';
export const ROOMS_COL = 'chatRooms';
export const MUTES_COL = 'chatMutes';

export const MAX_TEXT = 4000;
export const MS_DAY = 24 * 60 * 60 * 1000;
export const TYPING_TTL_MS = 8000;
export const MAX_INVITE_IDS = 20;
export const BURST_WINDOW_MS = 10000;
export const BURST_MAX_MSG = 8;

/**
 * Presence (Firestore `members/{uid}.lastSeenAt`) — trade-off: freshness vs writes + listener churn.
 * Each heartbeat is one document update; every update re-fires `subscribeMembers` for all clients in the room.
 */
/** Ping interval while the chat tab is visible (was 25s — too write-heavy at scale). */
export const PRESENCE_HEARTBEAT_VISIBLE_MS = 90_000;
/**
 * When hidden: 0 = no pings (saves writes; user shows offline after threshold). Set e.g. 300_000 for a rare keepalive.
 */
export const PRESENCE_HEARTBEAT_HIDDEN_MS = 0;
/**
 * Roster “online” if `now - lastSeenAt` is less than this. Must exceed {@link PRESENCE_HEARTBEAT_VISIBLE_MS}
 * plus latency/jitter so users don’t flicker offline between heartbeats.
 */
export const PRESENCE_ONLINE_THRESHOLD_MS = 135_000;
