// One-off announcements sent once to every Telegram group and channel (api/telegram-webhook.js
// sendAnnouncementOnce). The id is the idempotency key: an announcement that already went out is never resent.
export const ANNOUNCEMENTS = [
  {
    id: 'balance-80',
    image: 'https://www.libralparty.net/assets/campaigns/special-balance-80.jpg',
    caption: '📣 עדכון חשוב!\nמהיום איזון חד־פעמי עולה 80 ₪ בלבד לכל מסיבה.\n\nמנוי חד־פעמי לאיזון מגדרי, בבדסמ ובסווינגרס.\n\n👇 נרשמים באתר:\nhttps://www.libralparty.net/register',
  },
];
