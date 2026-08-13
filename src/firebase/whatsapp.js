/**
 * WhatsApp party notifications, sent to a locally-running bot (see /whatsapp-bot).
 * The bot only runs on the admin's machine, so this is best-effort: if it's not
 * reachable, we fail silently and never block the Telegram flow or the publish action.
 */

const WHATSAPP_BOT_URL = import.meta.env.VITE_WHATSAPP_BOT_URL || 'http://localhost:3000';

const formatDateOnly = (date, language = 'he') => {
  if (date == null) return '';
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const SITE_URL = 'https://libralparty.net';

const buildPartyPayload = (party, language, partyUrl) => ({
  name: party?.name || party?.title || '',
  day: party?.day || '',
  date: formatDateOnly(party?.date, language),
  time: party?.time || '',
  dj: party?.dj || '',
  maleLimit: party?.maleLimit ?? '',
  femaleLimit: party?.femaleLimit ?? '',
  description: party?.description || '',
  imageURL: party?.imageURL || '',
  partyUrl: partyUrl || SITE_URL,
});

const postToBot = async (payload) => {
  try {
    const res = await fetch(`${WHATSAPP_BOT_URL}/send-party`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    // Bot not running locally (e.g. published from a different machine) - ignore.
    return false;
  }
};

/** Send new (internal) party notification to WhatsApp. Mirrors sendNewPartyTelegram. */
export const sendNewPartyWhatsApp = async (party, language = 'he') => {
  return postToBot(buildPartyPayload(party, language));
};

/** Send new external party notification to WhatsApp. Mirrors sendNewExternalPartyTelegram. */
export const sendNewExternalPartyWhatsApp = async (party, partyUrl, language = 'he') => {
  return postToBot(buildPartyPayload(party, language, partyUrl));
};

/**
 * Send every currently-active party to WhatsApp in one go. Mirrors the
 * "פרסם מסיבות לטלגרם" admin button (sendAllPartyReminders in
 * api/telegram-webhook.js), but runs client-side since the WhatsApp bot only
 * runs on the admin's own machine and can't be reached from Vercel's servers.
 */
export const sendAllPartiesWhatsApp = async (language = 'he') => {
  const { getActiveParties } = await import('./parties');
  const parties = await getActiveParties();
  const results = [];
  let sent = 0;
  for (const party of parties) {
    const isExternal = party.partyType === 'external';
    const ok = isExternal
      ? await sendNewExternalPartyWhatsApp(party, party.registrationLink || '', language)
      : await sendNewPartyWhatsApp(party, language);
    if (ok) sent += 1;
    results.push({ party: party.name || party.title, ok });
  }
  return { partiesSent: sent, total: parties.length, results };
};
