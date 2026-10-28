// One-off announcements sent once to every Telegram group and channel (api/telegram-webhook.js
// sendAnnouncementOnce). The id is the idempotency key: an announcement that already went out is never resent.
// (The 80 ₪ balance/membership announcement was removed: the site has no memberships any more.)
export const ANNOUNCEMENTS = [];
