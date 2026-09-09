/**
 * WhatsApp party notifications, sent to a locally-running bot (see /whatsapp-bot).
 * The bot only runs on the admin's machine, so this is best-effort: if it's not
 * reachable, we fail silently and never block the Telegram flow or the publish action.
 */

const WHATSAPP_BOT_URL = import.meta.env.VITE_WHATSAPP_BOT_URL || 'http://localhost:3000';
const WHATSAPP_BOT_API_KEY = import.meta.env.VITE_WHATSAPP_BOT_API_KEY || '';
const botAuthHeaders = () => (WHATSAPP_BOT_API_KEY ? { 'x-api-key': WHATSAPP_BOT_API_KEY } : {});

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

const SITE_URL = 'https://www.libralparty.net';

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
 * api/telegram-webhook.js) — delegates to the bot's own /broadcast-parties
 * endpoint, which reads Firestore directly and applies each group's
 * allowedAdvertiserIds filter (e.g. a partner venue's group only gets their
 * own parties + the Dungeon's, never competitors'). Do NOT reimplement this
 * client-side via sendNewPartyWhatsApp per party — that path has no filter
 * and would leak every party into every group.
 */
export const sendAllPartiesWhatsApp = async () => {
  const res = await fetch(`${WHATSAPP_BOT_URL}/broadcast-parties`, {
    method: 'POST',
    headers: { ...botAuthHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return { partiesSent: data.partiesSent ?? 0, total: data.partiesSent ?? 0, results: data.results || [] };
};

/**
 * Named contacts saved on the bot's own machine (SAVED_RECIPIENTS in its
 * .env — e.g. "מנהל הדאנגן") so the admin can pick a recipient by name
 * instead of typing a phone number every time. Throws if the bot isn't
 * reachable — callers should catch and fall back to manual phone entry.
 */
export const getWhatsappRecipients = async () => {
  const res = await fetch(`${WHATSAPP_BOT_URL}/recipients`, { headers: { ...botAuthHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.recipients || [];
};

/** WhatsApp groups the bot's connected account is a member of. */
export const getWhatsappGroups = async () => {
  const res = await fetch(`${WHATSAPP_BOT_URL}/groups`, { headers: { ...botAuthHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.groups || [];
};

/**
 * Send an arbitrary file (e.g. a generated XLSX) to either an individual
 * WhatsApp number (`to`, international format, digits only) or a group
 * (`groupId`, from getWhatsappGroups). Exactly one of the two must be set.
 */
export const sendFileWhatsApp = async ({ to, groupId, blob, filename, caption }) => {
  const form = new FormData();
  if (groupId) form.append('groupId', groupId);
  else if (to) form.append('to', to);
  else throw new Error('Provide either "to" or "groupId"');
  if (caption) form.append('text', caption);
  form.append('file', blob, filename);

  const res = await fetch(`${WHATSAPP_BOT_URL}/send-file`, {
    method: 'POST',
    headers: { ...botAuthHeaders() },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return true;
};
