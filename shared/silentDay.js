// Days of national mourning: nothing is published automatically (Telegram,
// push, campaigns, reminders). Dates are Israel local, YYYY-MM-DD.
export const SILENT_DAYS = ['2026-10-07'];

export function israelDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isSilentDay(now = new Date()) {
  if (process.env.SILENT_DAYS_OFF === '1') return false; // tests only
  return SILENT_DAYS.includes(israelDate(now));
}

// Jobs on api/telegram-webhook.js that read or administer only, never publish.
export const NON_PUBLISHING_JOBS = new Set([
  'promo-check', 'health', 'standup', 'cleanup-parties',
  'recent-chats', 'bot-info', 'webhook-info', 'chat-status', 'set-webhook', 'manual-post-check',
  'fix-channels', 'fix-chatids', 'migrate-support-chat-secret', 'fix-party-whatsapp'
]);

// The agents were switched back on by the owner on 27.10.2026 (global kill switch off). The channel
// publisher (עומר) was paused until 1.11.2026, when the owner asked to turn him on again (PUBLISHER_PAUSED off).
export const SITE_CLOSED = false;
export const PUBLISHER_PAUSED = false;
export function isSiteClosed() {
  return SITE_CLOSED && process.env.SILENT_DAYS_OFF !== '1'; // tests of the publishing code switch it off
}
