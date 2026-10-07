// Days of national mourning: nothing is published automatically (Telegram,
// push, campaigns, reminders). Dates are Israel local, YYYY-MM-DD.
export const SILENT_DAYS = ['2026-10-07'];

export function israelDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isSilentDay(now = new Date()) {
  return SILENT_DAYS.includes(israelDate(now));
}

// Jobs on api/telegram-webhook.js that read or administer only, never publish.
export const NON_PUBLISHING_JOBS = new Set([
  'promo-check', 'health', 'standup', 'cleanup-parties', 'list-delete-requests', 'process-delete-request',
  'recent-chats', 'bot-info', 'webhook-info', 'chat-status', 'set-webhook', 'manual-post-check',
  'fix-channels', 'fix-chatids', 'migrate-support-chat-secret', 'fix-party-whatsapp'
]);
