/**
 * Telegram Bot webhook: receive admin replies and forward to support chat.
 * Set webhook from Admin. Requires GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel for replies to reach the website.
 *
 * Auth: Verifies `X-Telegram-Bot-Api-Secret-Token` against TELEGRAM_WEBHOOK_SECRET
 *       env var when set. Configure via:
 *       POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *            ?url=<URL>&secret_token=<SAME_VALUE_AS_ENV>
 *
 * GET (default / ?job=reminders): Cron job (see vercel.json "crons") — posts
 * every currently-active party as its own Telegram message (photo + caption)
 * to every channel/group configured in the admin "טלגרם" tab's ערוצים list
 * (settings/telegram.channels in Firestore), a few times a week. Merged in
 * here (rather than its own file) to stay under the Vercel Hobby plan's
 * 12-serverless-function limit — same reasoning as git-history.js absorbing
 * the old record-deploy-status route.
 *
 * Same run also pokes the whatsapp-bot's /broadcast-parties (see
 * publishActiveWhatsApp) once it's hosted somewhere public — set
 * WHATSAPP_BOT_PUBLIC_URL + WHATSAPP_BOT_API_KEY to enable; until then this
 * silently no-ops and WhatsApp stays the admin's manual button.
 *
 * Auth: Vercel signs cron-triggered requests with `Authorization: Bearer
 * ${CRON_SECRET}` when that env var is set — verified below so this can't be
 * triggered by an arbitrary GET from outside Vercel.
 * Env (cron): CRON_SECRET, TELEGRAM_BOT_TOKEN (the "Legacy (Matching)" bot —
 * needs to already be a member of every configured channel/group).
 *
 * GET ?job=promo: Sends a short recurring "publish your party through the
 * site" message to the "מסיבות בישראל" group. Vercel Hobby cron jobs can only
 * run once/day, so a every-few-hours schedule needs an external pinger (e.g.
 * cron-job.org) hitting this URL with ?job=promo&key=TELEGRAM_PROMO_SECRET.
 * Env: TELEGRAM_PROMO_SECRET, TELEGRAM_BOT_TOKEN.
 *
 * GET ?job=manual-post: Admin panel's "פרסם מסיבות לטלגרם" button — same
 * send-every-active-party logic as the cron, triggered on demand. Auth via
 * `Authorization: Bearer ADMIN_API_SECRET` (see lib/apiAuth.js), same as
 * every other admin-only endpoint.
 */
import { ANNOUNCEMENTS } from '../shared/announcements.js';
import { isSilentDay, israelDate, NON_PUBLISHING_JOBS, isSiteClosed, PUBLISHER_PAUSED } from '../shared/silentDay.js';
import { requireTelegramWebhookSecret, requireAdminApiSecret, safeEq } from '../lib/apiAuth.js';
import { isPartyExpiredByDate } from '../shared/partyExpiry.js';
import { TELEGRAM_CAMPAIGNS, TELEGRAM_CAMPAIGNS_VERSION } from '../shared/telegramCampaigns.js';
import { TIKTOK_PACK } from '../shared/tiktokPack.js';
import { agentById } from '../shared/agentsRoster.js';

// Sending every active party to every allowed destination can take longer
// than Vercel Hobby's default 10s function timeout, which caused the
// platform to retry the whole invocation from scratch — duplicating every
// message already sent. Raise the ceiling (Hobby allows up to 60s) so a
// realistic batch finishes within one invocation instead of retrying.
export const config = { maxDuration: 60 };

// Fallback destinations, used only if the admin-configured channel list
// (settings/telegram.channels — the "ערוצים" panel in the Telegram admin
// tab) can't be read for some reason.
const REMINDER_CHANNEL_CHAT_ID = '-1002446012533'; // @libralparty channel
const REMINDER_GROUP_CHAT_ID = '-1001610769071'; // "מסיבות בישראל" group
const DEFAULT_RETENTION_HOURS = 48;

// Some admin-entered chat IDs are missing the leading "-" (or "-100" for
// supergroups) or carry a stray "_<topic>" suffix copied from a topic link.
// Best-effort normalize rather than silently skipping them.
function sanitizeChatId(raw) {
  let s = String(raw || '').trim();
  // Only strip a "_<topic>" suffix for numeric/negative ids (a stray
  // topic-thread id copied from a link) — never for @usernames, which can
  // legitimately contain underscores (e.g. @avi_swingers2).
  if (/^-?\d+_\d+$/.test(s)) s = s.split('_')[0];
  if (/^\d+$/.test(s)) s = `-100${s}`;
  return s;
}

// Returns [{ chatId, allowedAdvertiserIds }] — allowedAdvertiserIds is null
// when the destination accepts every advertiser's parties (the default),
// or an array restricting it to specific approved advertisers only (set via
// the "רק מפרסמים נבחרים מותרים לפרסם כאן" picker in the ערוצים panel).
async function getReminderDestinations(admin) {
  try {
    const snap = await admin.firestore().collection('settings').doc('telegram').get();
    const channels = snap.exists ? snap.data()?.channels : null;
    const dests = (channels || [])
      // Group/channel owners can opt out of the automatic party broadcast
      // (checkbox in the ערוצים panel) without deleting the destination —
      // some only want their own party posted there, not everyone else's.
      .filter((c) => c.broadcastEnabled !== false)
      .map((c) => ({ chatId: sanitizeChatId(c.chatId), name: c.name || '', allowedAdvertiserIds: Array.isArray(c.allowedAdvertiserIds) ? c.allowedAdvertiserIds : null }))
      .filter((d) => /^-\d+$/.test(d.chatId) || /^@[\w-]+$/.test(d.chatId));
    if (dests.length > 0) return dests;
  } catch (err) {
    console.error('getReminderDestinations:', err);
  }
  return [{ chatId: REMINDER_CHANNEL_CHAT_ID, allowedAdvertiserIds: null }, { chatId: REMINDER_GROUP_CHAT_ID, allowedAdvertiserIds: null }];
}

// Matches the frontend's ADMIN_PSEUDO_ADVERTISER_ID (TelegramSection.jsx) —
// not a real advertiser doc, just an explicit opt-in checkbox so the admin
// can allow their own directly-added parties into a restricted channel.
const ADMIN_PSEUDO_ADVERTISER_ID = '__admin__';

// Deliberately strict: a party with no advertiser attached (e.g. added
// directly by the site admin with no owner tagged) does NOT get a free
// pass into restricted groups — only an explicitly-approved advertiser (or
// the admin themself, if checked in the picker) does. This is intentional
// so a mistake can never leak a party into a competitor's group; an
// untagged party still reaches every unrestricted (allowedAdvertiserIds
// === null) destination as normal.
function partyAllowedFor(party, allowedAdvertiserIds) {
  if (!allowedAdvertiserIds) return true;
  if (party.createdBy) return allowedAdvertiserIds.includes(party.createdBy);
  return allowedAdvertiserIds.includes(ADMIN_PSEUDO_ADVERTISER_ID);
}

async function initAdmin() {
  const admin = (await import('firebase-admin')).default;
  if (!admin.firestore) {
    // firebase-admin v14 dropped admin.firestore()/admin.apps (kept
    // initializeApp/cert at top level) in favor of the modular API. Patch the
    // missing pieces back on so the rest of this file (written against the old
    // namespaced shape) keeps working unchanged.
    const [{ getApps }, { getFirestore, Timestamp }] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/firestore')
    ]);
    Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
    admin.firestore = Object.assign(() => getFirestore(), { Timestamp });
  }
  if (!admin.apps?.length) {
    const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
    admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
  }
  return admin;
}

function isCronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED when unset — this gate exists specifically so a bare GET to
  // this URL from outside Vercel can't trigger a real broadcast to every
  // channel. Vercel automatically attaches `Authorization: Bearer
  // ${CRON_SECRET}` to its own scheduled cron requests once the env var is
  // set, so setting it doesn't require touching vercel.json.
  if (!secret) return false;
  const auth = req.headers?.authorization || '';
  return auth === `Bearer ${secret}`;
}

const CAPTION_LIMIT = 1024; // Telegram caption limit

function buildReminderCaption(party) {
  const header = [`🎉 ${party.title || party.name || 'מסיבה'}`];
  if (party.day || party.date) {
    // Vercel functions run in UTC. party.date is stored as Israel local
    // midnight, so formatting it with toLocaleDateString('he-IL') and no
    // explicit timeZone used the *server's* UTC calendar date instead —
    // for a party stored as e.g. 2026-08-07 00:00 Israel time
    // (2026-08-06T21:00:00Z), that showed "6.8" instead of "7.8" in the
    // actual Telegram broadcast caption. Same root cause as the
    // PartyEditor date-field bug fixed earlier, just in the outbound
    // message instead of the admin form.
    const dateStr = party.date?.toDate ? party.date.toDate().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }) : '';
    header.push([party.day, dateStr].filter(Boolean).join(' · '));
  }
  if (party.dj) header.push(`🎧 ${party.dj}`);

  // Always point to the site's own registration page, regardless of whether
  // this party's actual registration is external/WhatsApp — the Telegram
  // post intentionally doesn't expose those direct links, so people go
  // through the site.
  const linkLine = `הרשמה: https://www.libralparty.net/`;

  // Reserve space for the header and link line first, so the link (added last)
  // can never be pushed past CAPTION_LIMIT by a long description — only the
  // description itself gets truncated to whatever budget remains.
  const headerText = header.join('\n');
  const fixedLength = headerText.length + 2 /* blank line before description */ + 2 /* blank line before link */ + linkLine.length;
  const descBudget = Math.max(0, CAPTION_LIMIT - fixedLength);

  const lines = [headerText];
  if (party.description && descBudget > 0) {
    lines.push('', party.description.slice(0, descBudget));
  }
  lines.push('', linkLine);
  return lines.join('\n').slice(0, CAPTION_LIMIT);
}

// Telegram fetches a photo by URL and rejects big files (> ~5 MB or > 10000 px on both sides
// summed). Cloudinary can resize on the fly, so ask it for a 1280 px JPEG first.
function telegramFriendlyImage(url) {
  const u = String(url || '').trim();
  if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?!c_|w_|f_|q_)/.test(u)) {
    return u.replace('/image/upload/', '/image/upload/c_limit,w_1280,q_auto,f_jpg/');
  }
  return u;
}

async function sendReminderToChat(botToken, chatId, party) {
  // Stray spaces at line ends and long runs of blank lines only waste room in the caption.
  const caption = buildReminderCaption(party).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const post = async (method, body) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  };
  if (party.imageURL) {
    // One message: the image with the text as its caption. Try the resized image,
    // then the original URL.
    const candidates = [...new Set([telegramFriendlyImage(party.imageURL), String(party.imageURL).trim()])];
    let lastError = '';
    for (const photo of candidates) {
      const withPhoto = await post('sendPhoto', { chat_id: chatId, photo, caption });
      if (withPhoto.ok) return withPhoto;
      lastError = withPhoto.description || lastError;
    }
    // Last resort so the party still goes out: the text alone.
    const asText = await post('sendMessage', { chat_id: chatId, text: caption });
    return asText.ok ? { ...asText, imageFailed: lastError } : { ...asText, description: `${asText.description || ''} (תמונה: ${lastError || 'נכשלה'})` };
  }
  return post('sendMessage', { chat_id: chatId, text: caption });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isPromoAuthorized(req) {
  const secret = process.env.TELEGRAM_PROMO_SECRET;
  if (!secret) return false; // must be explicitly configured — no lenient default for a public-facing job
  const key = req.query?.key || new URL(req.url, 'http://x').searchParams.get('key');
  return safeEq(key, secret);
}

// ?job=set-webhook — (re)registers the webhook URL with Telegram. Found via
// ?job=webhook-info that the url was empty (25 updates stuck undelivered) —
// this had nothing to do with any specific group, no webhook meant nothing
// was ever reaching this server at all.
async function handleSetWebhook(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  const webhookUrl = 'https://www.libralparty.net/api/telegram-webhook';
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  try {
    const params = new URLSearchParams({ url: webhookUrl, drop_pending_updates: 'true' });
    if (secretToken) params.set('secret_token', secretToken);
    const r = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?${params.toString()}`);
    const data = await r.json();
    return res.status(200).json({ ok: data.ok, description: data.description, webhookUrl, secretConfigured: Boolean(secretToken) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// ?job=webhook-info — Telegram's own getWebhookInfo for the bot: shows the
// registered URL, pending update count, and last delivery error. Explains
// why recordSeenChat never captured anything even after tagging the bot.
async function handleWebhookInfo(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await r.json();
    return res.status(200).json(data.result || data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// ?job=bot-info — returns the @username of the bot behind TELEGRAM_BOT_TOKEN
// (the one used for all sends/reminders), so it can be confirmed against
// whichever bot was actually added to a given Telegram group. getMe only
// returns public bot info, nothing sensitive.
async function handleBotInfo(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await r.json();
    return res.status(200).json({ ok: data.ok, id: data.result?.id, username: data.result?.username, name: data.result?.first_name });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// ?job=chat-status&chatId=<id> — checks the bot's actual membership status
// (member/administrator/left/kicked) in a given chat, plus getChat details.
// Added because sendMessage can report {ok:true} for a message the members
// never actually see (e.g. sent into a hidden/archived forum topic, or a
// chat_id that resolves to a different/wrong chat than the one being
// eyeballed in the Telegram app) — this cross-checks against the chat
// itself rather than trusting the send response alone.
async function handleChatStatus(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  const rawChatId = req.query?.chatId || new URL(req.url, 'http://x').searchParams.get('chatId');
  if (!rawChatId) {
    return res.status(400).json({ error: 'Missing chatId query param' });
  }
  const chatId = sanitizeChatId(rawChatId);
  try {
    const meR = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const me = (await meR.json()).result;

    const chatR = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`);
    const chatData = await chatR.json();

    const memberR = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${me.id}`);
    const memberData = await memberR.json();

    return res.status(200).json({
      chatIdTried: chatId,
      chat: chatData.ok ? { id: chatData.result.id, title: chatData.result.title, type: chatData.result.type, isForum: chatData.result.is_forum || false } : { error: chatData.description },
      botMembership: memberData.ok ? { status: memberData.result.status } : { error: memberData.description },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// One-off migration (?job=fix-channels): applies the specific channel-list
// corrections worked out with the admin in chat — fixes מוניק's chat_id and
// advertiser allowlist, and adds the new 2vs2/אבי סווינגרס channel. Only
// touches the `channels` field on settings/telegram (via .update, not a full
// doc overwrite) so bot tokens/message templates on that doc are untouched.
// Safe to leave in place; re-running it is idempotent (upserts by id).
// One-off: this specific party ("מסיבת ט"ו באב של זוגות ליברלים", doc
// Peo1JfBR4h0p91enqRHG) was marked "internal" (on-site registration) but its
// description says "WhatsApp only" with the whatsappNumber field left empty
// by the advertiser — so it wasn't excluded from /register like other
// WhatsApp-contact parties are. Number confirmed directly by the admin in
// chat (matches the advertiser's other party).
async function handleFixPartyWhatsapp(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const admin = await initAdmin();
    const ref = admin.firestore().collection('parties').doc('Peo1JfBR4h0p91enqRHG');
    await ref.update({ whatsappNumber: '0559364370' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('fix-party-whatsapp:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

async function handleFixChannels(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const admin = await initAdmin();
    const ref = admin.firestore().collection('settings').doc('telegram');
    const snap = await ref.get();
    const channels = snap.exists ? (snap.data()?.channels || []) : [];

    const BOUTIQUE_ID = 'lOmonxa5U8cgAr5K7Wjp';
    const NO_LIMIT_ID = 'YaVU9sZVPI10mgLpIsXz';
    const AVI_ID = 'SteUWXIgzPLVZVZ6Lu3a';

    let found = false;
    const updated = channels.map((c) => {
      if (c.id === 'krjj67olds' || c.name === 'מוניק') {
        found = true;
        return { ...c, chatId: '-1003413559919', allowedAdvertiserIds: [BOUTIQUE_ID, NO_LIMIT_ID] };
      }
      return c;
    });
    if (!found) {
      updated.push({ id: 'krjj67olds', name: 'מוניק', chatId: '-1003413559919', allowedAdvertiserIds: [BOUTIQUE_ID, NO_LIMIT_ID] });
    }

    const aviExists = updated.some((c) => c.chatId === '@avi_swingers2');
    if (!aviExists) {
      updated.push({ id: 'avi2vs2', name: '2vs2 (אבי סווינגרס)', chatId: '@avi_swingers2', allowedAdvertiserIds: [AVI_ID] });
    }

    // "רישומים לחמישי שישי" is a dedicated registrations list, not a
    // party-promo group — exclude it from the automatic broadcast entirely.
    const withRegistrationsFix = updated.map((c) =>
      (c.name === 'רישומים לחמישי שישי' ? { ...c, broadcastEnabled: false } : c)
    );

    // These are the admin's own "open to everyone" groups — remove the
    // restriction entirely (rather than listing every current advertiser)
    // so a newly-approved advertiser is automatically allowed too, with no
    // manual re-checking required per group.
    const OPEN_CHANNEL_NAMES = ['מנוים מדברים בדסמ', 'מסיבות ליברליות ערוץ', 'מדברים בדסמ ערוץ', 'מסיבות בישראל', 'מדברים בדסמ קבוצה'];
    const withOpenChannelsFix = withRegistrationsFix.map((c) => {
      if (!OPEN_CHANNEL_NAMES.includes(c.name)) return c;
      const { allowedAdvertiserIds, ...rest } = c;
      return rest;
    });

    await ref.update({ channels: withOpenChannelsFix });
    return res.status(200).json({ ok: true, channels: withOpenChannelsFix });
  } catch (err) {
    console.error('fix-channels:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// GET ?job=list-delete-requests — account-deletion requests submitted via
// /delete-account (src/firebase/deleteRequests.js) were being written to
// Firestore but nothing anywhere ever read them back — no admin UI, no
// notification, nothing. A real privacy/compliance gap: someone could
// request deletion and the site would silently never act on it. This and
// ?job=process-delete-request are the read/update side, surfaced in the
// admin panel's new "בקשות מחיקה" tab (DeleteRequestsSection.jsx).
// GET ?job=migrate-support-chat-secret — one-off: settings/supportChat was
// publicly readable (Firestore rules allow read: true on the whole
// `settings` collection), exposing the support bot's token to anyone with
// no authentication. settings/private/{document=**} is already locked to
// admin-SDK-only access in the rules but nothing used it. Copies
// botToken+chatId to settings/private/supportChat/config (matching the
// already-locked-down path) and strips them from the public doc, leaving
// only the genuinely-public fields (enabled, siteUrl) there. Safe to run —
// grepped the codebase first: nothing client-side reads or writes
// botToken/chatId on the public doc, only enabled/siteUrl (SupportChat.jsx).
async function handleMigrateSupportChatSecret(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const admin = await initAdmin();
    const publicRef = admin.firestore().collection('settings').doc('supportChat');
    const snap = await publicRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'settings/supportChat not found' });
    const data = snap.data();
    const { botToken, chatId, ...publicFields } = data;
    if (!botToken && !chatId) {
      return res.status(200).json({ ok: true, message: 'Already migrated (no secret fields present)' });
    }
    await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').set({ botToken, chatId });
    await publicRef.set(publicFields);
    return res.status(200).json({ ok: true, movedFields: Object.keys({ botToken, chatId }).filter((k) => data[k] !== undefined) });
  } catch (err) {
    console.error('migrate-support-chat-secret:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// GET ?job=fix-chatids — one-off correction for channels whose chatId was
// entered without the "-100" supergroup prefix (e.g. "-3989635097" instead
// of "-1003989635097"), discovered via ?job=recent-chats. sanitizeChatId()
// can't auto-fix these because they already start with "-", so it never
// applies the -100 prepend that only kicks in for purely-numeric ids.
async function handleFixChatIds(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const admin = await initAdmin();
    const ref = admin.firestore().collection('settings').doc('telegram');
    const snap = await ref.get();
    const channels = snap.exists ? (snap.data()?.channels || []) : [];

    const CORRECTIONS = {
      '-3989635097': '-1003989635097', // "sins"
      '-2291618623': '-1002291618623', // "NO LIMIT"
    };

    const updated = channels.map((c) =>
      CORRECTIONS[c.chatId] ? { ...c, chatId: CORRECTIONS[c.chatId] } : c
    );

    await ref.update({ channels: updated });
    return res.status(200).json({ ok: true, channels: updated });
  } catch (err) {
    console.error('fix-chatids:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// The bot runs in webhook mode (see POST handler below), so getUpdates
// can't be used to discover a chat_id (Telegram rejects it while a webhook
// is active). Instead, every incoming POST update's chat is best-effort
// logged to Firestore (capped list) so a group's real id can be read back
// after someone sends any message there — see recordSeenChat() + the POST
// handler, and ?job=recent-chats below to read the capped list.
async function recordSeenChat(admin, chat, botStatus) {
  // Private chats are not destinations and used to push groups out of the capped list.
  if (!chat || chat.type === 'private') return;
  try {
    const ref = admin.firestore().collection('settings').doc('telegramSeenChats');
    const snap = await ref.get();
    const list = snap.exists ? (snap.data()?.chats || []) : [];
    const withoutDup = list.filter((c) => c.id !== chat.id);
    // The bot was removed from the group: drop it from the list.
    if (botStatus === 'left' || botStatus === 'kicked') {
      await ref.set({ chats: withoutDup });
      return;
    }
    const next = [{ id: chat.id, title: chat.title || chat.username || chat.first_name || '', type: chat.type, seenAt: new Date().toISOString() }, ...withoutDup].filter((c) => c.type !== 'private').slice(0, 60);
    await ref.set({ chats: next });
  } catch (err) {
    console.error('recordSeenChat:', err);
  }
}

// ?job=recent-chats — reads back the capped list of chats the bot has seen
// (via recordSeenChat), so the correct chat_id for a group can be found
// with certainty after someone sends any message there.
async function handleRecentChats(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const admin = await initAdmin();
    const snap = await admin.firestore().collection('settings').doc('telegramSeenChats').get();
    return res.status(200).json({ ok: true, chats: snap.exists ? (snap.data()?.chats || []) : [] });
  } catch (err) {
    console.error('recent-chats:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}


// One-off connectivity check for a single destination (?job=test-group&chatId=...),
// so a specific entry from the admin channel list can be verified without
// running the full broadcast. chatId goes through the same sanitizer as the
// real send path.
async function handleTestGroup(req, res) {
  if (!isPromoAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  const rawChatId = req.query?.chatId || new URL(req.url, 'http://x').searchParams.get('chatId');
  if (!rawChatId) {
    return res.status(400).json({ error: 'Missing chatId query param' });
  }
  const chatId = sanitizeChatId(rawChatId);
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ בדיקת חיבור — הבוט מצליח לשלוח הודעות לקבוצה הזו.' })
    });
    const data = await r.json();
    return res.status(200).json({ ok: data.ok, description: data.description, chatIdTried: chatId });
  } catch (err) {
    console.error('test-group:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

async function acquireBroadcastLock(admin) {
  const ref = admin.firestore().collection('settings').doc('telegramBroadcastLock');
  const now = Date.now();
  const acquired = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const lockedAt = snap.exists ? snap.data()?.lockedAt : null;
    if (lockedAt && now - lockedAt < BROADCAST_LOCK_STALE_MS) {
      return false;
    }
    tx.set(ref, { lockedAt: now });
    return true;
  });
  return acquired ? ref : null;
}

async function releaseBroadcastLock(ref) {
  try {
    await ref.delete();
  } catch (err) {
    console.error('releaseBroadcastLock:', err);
  }
}

// WhatsApp side of the same scheduled run: pokes the whatsapp-bot's own
// /broadcast-parties endpoint, now that the bot runs on a public host
// (Render) instead of localhost. Silently does nothing until both env vars
// are set — before that, WhatsApp stays the admin's manual button. The bot
// has its own internal broadcastActiveParties() with the same
// allowedAdvertiserIds filtering as here, so this call intentionally does
// no per-party logic itself.
async function publishActiveWhatsApp() {
  const url = process.env.WHATSAPP_BOT_PUBLIC_URL;
  const apiKey = process.env.WHATSAPP_BOT_API_KEY;
  if (!url) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/broadcast-parties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true, partiesSent: data.partiesSent, groupCount: data.groupCount };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendAllPartyReminders(targetChatId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Server not configured (missing TELEGRAM_BOT_TOKEN)');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error('Server not configured (missing GOOGLE_APPLICATION_CREDENTIALS_JSON)');
  }

  const admin = await initAdmin();
  const lockRef = await acquireBroadcastLock(admin);
  if (!lockRef) {
    throw new Error('Broadcast already in progress — try again in a minute');
  }

  try {
    const settingsSnap = await admin.firestore().collection('settings').doc('partySettings').get();
    const retentionHours = settingsSnap.exists ? settingsSnap.data()?.retentionHours : DEFAULT_RETENTION_HOURS;
    let destinations = await getReminderDestinations(admin);
    if (targetChatId) {
      destinations = destinations.filter((d) => d.chatId === targetChatId);
    }

    const partiesSnap = await admin.firestore().collection('parties').get();
    const now = Date.now();
    const activeParties = partiesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => !isPartyExpiredByDate(p.date?.toDate ? p.date.toDate() : p.date, retentionHours, now))
      .sort((a, b) => {
        const toMs = (d) => (d?.toDate ? d.toDate().getTime() : new Date(d).getTime());
        return toMs(a.date) - toMs(b.date);
      });

    const results = [];
    for (const party of activeParties) {
      for (const dest of destinations) {
        if (!partyAllowedFor(party, dest.allowedAdvertiserIds)) continue;
        const data = await sendReminderToChat(botToken, dest.chatId, party);
        results.push({ party: party.title || party.name, chatId: dest.chatId, group: dest.name || '', ok: data.ok, description: data.description, imageFailed: data.imageFailed || undefined });
        // Each send targets a different chat, so Telegram's ~1/sec-per-chat
        // limit doesn't apply — only the ~30/sec global limit does, which
        // needs ~34ms between sends, not 400ms. The old 400ms delay was the
        // real cause of "only some parties posted": this loop runs serially
        // for every party x every destination with no maxDuration override
        // on this function (see vercel.json), and sendPhoto (used whenever a
        // party has an image) is itself slow because Telegram fetches the
        // photo URL before delivering it — a handful of parties across a
        // couple of channels easily pushed total runtime past the platform's
        // default timeout, silently cutting the loop off partway with no
        // error surfaced anywhere. 80ms keeps a wide safety margin under the
        // rate limit while cutting total runtime by ~5x.
        await sleep(80);
      }
    }

    const whatsappResult = targetChatId ? null : await publishActiveWhatsApp();

    return { partiesSent: activeParties.length, destinationCount: destinations.length, results, whatsappResult };
  } finally {
    await releaseBroadcastLock(lockRef);
  }
}



// ── Team chat ──────────────────────────────────────────────────────────────
// The agents report what they did in settings/agentChat (last 150 lines),
// shown in the admin tab "צוות הסוכנים". Best effort: never breaks a job.
export async function agentSay(agentId, text, to = null) {
  try {
    const agent = agentById(agentId);
    if (!agent || !text) return;
    const admin = await initAdmin();
    const db = admin.firestore();
    const ref = db.collection('settings').doc('agentChat');
    const toAgent = to ? agentById(to) : null;
    const line = { agent: agentId, name: agent.name, role: agent.role, text: toAgent ? `@${toAgent.name} ${text}` : text, ts: Date.now(), ...(toAgent ? { to: toAgent.id } : {}) };
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists && Array.isArray(snap.data()?.messages) ? snap.data().messages : [];
      tx.set(ref, { messages: [...prev, line].slice(-150) });
    });
  } catch (err) {
    console.error('agentSay:', err?.message || err);
  }
}


// Owner-set switches for the agents (see shared/agentCommands.js, written by
// api/admin-settings.js action 'agent-chat-post').
async function getAgentConfig(db) {
  try {
    const snap = await db.collection('settings').doc('agentConfig').get();
    return snap.exists ? snap.data() || {} : {};
  } catch {
    return {};
  }
}

// ── Campaign posts ─────────────────────────────────────────────────────────
// A designed image + caption (see scripts/campaigns/make_campaigns.py and
// shared/telegramCampaigns.js) goes to the community channel on Sun/Tue/Thu,
// a different one each time, in rotation. Piggybacks on the daily reminders
// cron (Hobby plans cap the number of crons). A short lock window on
// lastSentAt keeps a retried run from posting twice.
const CAMPAIGN_DAYS = [0, 2, 4]; // Sunday, Tuesday, Thursday (Israel time)
const CAMPAIGN_MIN_GAP_MS = 20 * 60 * 60 * 1000;

function israelWeekday(date = new Date()) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

async function sendCampaignPost({ force = false } = {}) {
  // The owner asked that the publisher publishes nothing for now, not even a forced manual run.
  if (PUBLISHER_PAUSED && process.env.SILENT_DAYS_OFF !== '1') return { ok: true, skipped: 'publisher paused by the owner' };
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('Server not configured (missing TELEGRAM_BOT_TOKEN)');
  if (!TELEGRAM_CAMPAIGNS.length) return { ok: false, skipped: 'no campaigns' };
  const admin = await initAdmin();
  const db = admin.firestore();
  const agentCfg = (await getAgentConfig(db)).publisher || {};
  if (!force && agentCfg.paused) return { ok: true, skipped: 'paused by the owner' };
  const campaignDays = Array.isArray(agentCfg.days) && agentCfg.days.length ? agentCfg.days : CAMPAIGN_DAYS;
  if (!force && !campaignDays.includes(israelWeekday())) return { ok: true, skipped: 'not a campaign day' };
  const ref = db.collection('settings').doc('telegramCampaigns');
  const now = Date.now();
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};
    if (!force && data.lastSentAt && now - data.lastSentAt < CAMPAIGN_MIN_GAP_MS) return null;
    // A refreshed pool (new version) starts again from its first campaign.
    const index = data.version === TELEGRAM_CAMPAIGNS_VERSION && Number.isInteger(data.nextIndex) ? data.nextIndex % TELEGRAM_CAMPAIGNS.length : 0;
    tx.set(ref, { nextIndex: (index + 1) % TELEGRAM_CAMPAIGNS.length, lastSentAt: now, lastId: TELEGRAM_CAMPAIGNS[index].id, version: TELEGRAM_CAMPAIGNS_VERSION }, { merge: true });
    return { index, previous: { nextIndex: data.nextIndex ?? 0, lastSentAt: data.lastSentAt ?? null, version: data.version ?? null } };
  });
  if (!claimed) return { ok: true, skipped: 'already posted recently' };

  const campaign = TELEGRAM_CAMPAIGNS[claimed.index];
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: REMINDER_CHANNEL_CHAT_ID, photo: campaign.image, caption: campaign.caption })
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    // Give the slot back so the next run retries the same campaign.
    await ref.set(claimed.previous, { merge: true }).catch(() => {});
    await agentSay('publisher', `לא הצלחתי לפרסם את הקמפיין בערוץ: ${data.description || `HTTP ${res.status}`}`);
    return { ok: false, id: campaign.id, description: data.description || `HTTP ${res.status}` };
  }
  await agentSay('publisher', `פרסמתי בערוץ את הקמפיין "${campaign.caption.split('\n')[0].replace(/^[^\p{L}\p{N}]+/u, '')}" ✅`);
  return { ok: true, id: campaign.id };
}

// GET ?job=campaign&key=<TELEGRAM_PROMO_SECRET>[&force=1] — manual run/test;
// force=1 posts the next campaign now, ignoring the weekday and the gap.
async function handleCampaign(req, res) {
  if (!isPromoAuthorized(req) && !isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const force = (req.query?.force || new URL(req.url, 'http://x').searchParams.get('force')) === '1';
    return res.status(200).json(await sendCampaignPost({ force }));
  } catch (err) {
    console.error('campaign:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
}


// ── TikTok helper agent (נועם) ─────────────────────────────────────────────
// TikTok's posting API needs an approved developer app, so this agent only
// prepares the next post: it sends the owner (the support-chat Telegram chat)
// the image and a ready caption, and the owner uploads it in the TikTok app.
const TIKTOK_DAYS = [0, 4]; // Sunday, Thursday (Israel time)
const TIKTOK_MIN_GAP_MS = 20 * 60 * 60 * 1000;

export async function sendTiktokPostIfDue({ force = false } = {}) {
  // The owner's Telegram chat is the support group, and TikTok posts must not
  // appear there in any form. Nothing is sent until a separate destination is chosen.
  return { ok: true, skipped: 'tiktok posts are not sent to the support group' };
  // eslint-disable-next-line no-unreachable
  if (!TIKTOK_PACK.length) return { ok: false, skipped: 'no tiktok pack' };
  const admin = await initAdmin();
  const db = admin.firestore();
  const agentCfg = (await getAgentConfig(db)).tiktok || {};
  if (!force && agentCfg.paused) return { ok: true, skipped: 'paused by the owner' };
  const days = Array.isArray(agentCfg.days) && agentCfg.days.length ? agentCfg.days : TIKTOK_DAYS;
  if (!force && !days.includes(israelWeekday())) return { ok: true, skipped: 'not a tiktok day' };
  const cfgSnap = await db.collection('settings').doc('private').collection('supportChat').doc('config').get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : null;
  if (!cfg?.botToken || !cfg?.chatId) return { ok: false, skipped: 'owner chat is not configured' };
  const ref = db.collection('settings').doc('tiktokPosts');
  const now = Date.now();
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};
    if (!force && data.lastSentAt && now - data.lastSentAt < TIKTOK_MIN_GAP_MS) return null;
    const index = Number.isInteger(data.nextIndex) ? data.nextIndex % TIKTOK_PACK.length : 0;
    tx.set(ref, { nextIndex: (index + 1) % TIKTOK_PACK.length, lastSentAt: now, lastId: TIKTOK_PACK[index].id }, { merge: true });
    return { index, previous: { nextIndex: data.nextIndex ?? 0, lastSentAt: data.lastSentAt ?? null } };
  });
  if (!claimed) return { ok: true, skipped: 'already sent recently' };
  const post = TIKTOK_PACK[claimed.index];
  const caption = `🎵 פוסט הטיקטוק הבא (${post.id})\n\nמעלים את התמונה בטיקטוק ומדביקים את הכיתוב:\n\n${post.caption}`.slice(0, 1000);
  const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: cfg.chatId, photo: post.image, caption })
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    await ref.set(claimed.previous, { merge: true }).catch(() => {});
    return { ok: false, id: post.id, description: data.description || `HTTP ${res.status}` };
  }
  await agentSay('tiktok', `שלחתי לך בטלגרם את פוסט הטיקטוק הבא (${post.id}) ✅`);
  return { ok: true, id: post.id };
}

// ── Daily health check ─────────────────────────────────────────────────────
// Runs with the daily reminders cron: opens the key pages and assets of the
// live site, checks Firestore and the Telegram bot, and that the campaign
// posts are still going out. Problems are sent to the admin as a Telegram
// message (same chat the other agent alerts use) and the result is stored in
// settings/healthCheck so a follow-up agent can read it and prepare a fix.
const HEALTH_SITE = 'https://www.libralparty.net';
const HEALTH_PAGES = ['/', '/events', '/calendar', '/membership', '/register', '/login', '/about', '/contact', '/advertiser-register', '/my-area', '/profile'];
const HEALTH_ASSETS = ['/assets/app.js', '/assets/site-data.js', '/assets/design/style.css', '/assets/design/hero-v3-800.webp'];
const CAMPAIGN_MAX_SILENCE_MS = 9 * 24 * 60 * 60 * 1000;

async function healthFetch(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    // Assets only need to exist: HEAD skips downloading them (site-data.js alone is large).
    const asset = path.startsWith('/assets/');
    const res = await fetch(`${HEALTH_SITE}${path}`, { method: asset ? 'HEAD' : 'GET', signal: ctrl.signal, headers: { 'user-agent': 'libral-health-check' } });
    return { status: res.status, text: asset ? '' : await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function runHealthCheck({ alert = true } = {}) {
  const problems = [];
  for (const path of HEALTH_PAGES) {
    try {
      const { status, text } = await healthFetch(path);
      if (status !== 200) problems.push(`הדף ${path} החזיר שגיאה ${status}`);
      else if (!text.includes('</html>')) problems.push(`הדף ${path} נטען חלקית`);
    } catch (err) {
      problems.push(`הדף ${path} לא נטען (${String(err?.message || err).slice(0, 60)})`);
    }
  }
  for (const path of HEALTH_ASSETS) {
    try {
      const { status } = await healthFetch(path);
      if (status !== 200) problems.push(`הקובץ ${path} לא נמצא (${status})`);
    } catch (err) {
      problems.push(`הקובץ ${path} לא נטען`);
    }
  }

  let db = null;
  try {
    const admin = await initAdmin();
    db = admin.firestore();
    await db.collection('settings').doc('telegramCampaigns').get();
  } catch (err) {
    problems.push(`בסיס הנתונים לא זמין (${String(err?.message || err).slice(0, 60)})`);
    db = null;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    problems.push('חסר טוקן של בוט הטלגרם בשרת');
  } else {
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await r.json();
      if (!data.ok) problems.push('בוט הטלגרם לא מגיב (הטוקן לא תקין?)');
    } catch (err) {
      problems.push('אין חיבור לטלגרם');
    }
  }

  if (db) {
    try {
      const snap = await db.collection('settings').doc('telegramCampaigns').get();
      const last = snap.exists ? snap.data()?.lastSentAt : null;
      if (last && Date.now() - last > CAMPAIGN_MAX_SILENCE_MS) problems.push('לא פורסם קמפיין בערוץ יותר מ-9 ימים');
    } catch (err) { /* already reported above */ }
  }

  const result = { ok: problems.length === 0, problems };
  if (result.ok) {
    await agentSay('doctor', 'בדקתי את האתר: 11 דפים, קבצים, בסיס נתונים, בוט הטלגרם וקמפיינים. הכל תקין ✅');
  } else {
    await agentSay('doctor', `מצאתי ${problems.length} בעיות באתר: ${problems.slice(0, 3).join('; ')}`);
    await agentSay('doctor', 'יש בעיות באתר, תבדוק בבקשה היום ב-13:37 ותתקן אם זה בקוד.', 'fixer');
    if (problems.some((x) => x.includes('קמפיין'))) await agentSay('doctor', 'לא יצא קמפיין זמן רב, תבדוק מה קורה.', 'publisher');
  }
  if (db) {
    await db.collection('settings').doc('healthCheck').set({ lastRunAt: Date.now(), ok: result.ok, problems }, { merge: true }).catch(() => {});
  }
  if (!result.ok && alert) {
    try {
      const admin = await initAdmin();
      const snap = await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').get();
      const cfg = snap.exists ? snap.data() : null;
      if (cfg?.botToken && cfg?.chatId) {
        await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cfg.chatId, text: `⚠️ בדיקה יומית של האתר מצאה ${problems.length} בעיות:\n\n${problems.map((x) => `• ${x}`).join('\n')}` })
        });
      }
    } catch (err) {
      console.error('health alert:', err);
    }
  }
  return result;
}

// GET ?job=health&key=<TELEGRAM_PROMO_SECRET>[&noalert=1] — manual run.
async function handleHealth(req, res) {
  if (!isPromoAuthorized(req) && !isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const noAlert = (req.query?.noalert || new URL(req.url, 'http://x').searchParams.get('noalert')) === '1';
  try {
    return res.status(200).json(await runHealthCheck({ alert: !noAlert }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
}

async function handlePartyReminders(req, res) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    let secretaryPaused = false;
    try { secretaryPaused = Boolean((await getAgentConfig((await initAdmin()).firestore())).secretary?.paused); } catch { /* keep sending */ }
    const { partiesSent, results, whatsappResult } = secretaryPaused
      ? { partiesSent: 0, results: [], whatsappResult: null }
      : await sendAllPartyReminders();
    if (secretaryPaused) await agentSay('secretary', 'אני בהפסקה לפי הבקשה שלך, לא שלחתי תזכורות היום.');
    else {
      await agentSay('secretary', partiesSent ? `שלחתי תזכורות על ${partiesSent} מסיבות לערוצים ולקבוצות ✅` : 'אין מסיבות פעילות היום, לא נשלחו תזכורות.');
      const failed = describeFailedChats(results);
      if (failed) await agentSay('secretary', `לא הצלחתי לשלוח ל: ${failed}. צריך לתת לבוט הרשאות שם.`);
      const noPhoto = [...new Set((results || []).filter((r) => r.ok && r.imageFailed).map((r) => r.group || String(r.chatId)))];
      if (noPhoto.length) await agentSay('secretary', `ל-${noPhoto.join(', ')} התזכורת יצאה בלי תמונה (כנראה אין לבוט הרשאה לשלוח תמונות שם).`);
    }
    const announcements = await sendAnnouncementsOnce().catch((err) => ({ ok: false, error: String(err?.message || err) }));
    const campaign = await sendCampaignPost().catch((err) => ({ ok: false, error: String(err?.message || err) }));
    const tiktok = await sendTiktokPostIfDue().catch((err) => ({ ok: false, error: String(err?.message || err) }));
    const health = await runHealthCheck().catch((err) => ({ ok: false, error: String(err?.message || err) }));
    const standup = await runDailyStandup({ health }).catch((err) => ({ ok: false, error: String(err?.message || err) }));
    return res.status(200).json({ ok: true, partiesSent, results, whatsappResult, announcements, campaign, tiktok, health, standup });
  } catch (err) {
    console.error('party-reminders:', err);
    return res.status(err.message?.startsWith('Server not configured') ? 503 : 500).json({ error: err.message || 'Internal error' });
  }
}

// GET ?job=manual-post-check — diagnostic only, never sends anything. Runs
// the exact same requireAdminApiSecret() check as the real manual-post job,
// so a mismatched ADMIN_API_SECRET / VITE_ADMIN_API_SECRET pair can be
// confirmed without risking a real broadcast.
async function handleManualPostCheck(req, res) {
  if (!requireAdminApiSecret(req, res)) return; // writes its own 401/503 response
  return res.status(200).json({ authorized: true });
}

// GET ?job=manual-post — the admin panel's "פרסם מסיבות לטלגרם" button.
// Same sending logic as the cron, but triggered on demand from the browser,
// authenticated via the shared ADMIN_API_SECRET (Bearer header) used by
// every other admin-only endpoint (see lib/apiAuth.js).
// Optional &chatId=<id> restricts the send to a single destination channel
// (e.g. to re-send to just one group that was fixed/added, without
// re-broadcasting to every other group).
async function handleManualPost(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  const targetChatId = req.query?.chatId || new URL(req.url, 'http://x').searchParams.get('chatId') || undefined;
  try {
    const { partiesSent, results, whatsappResult } = await sendAllPartyReminders(targetChatId);
    return res.status(200).json({ ok: true, partiesSent, results, whatsappResult });
  } catch (err) {
    console.error('manual-post:', err);
    return res.status(err.message?.startsWith('Server not configured') ? 503 : 500).json({ error: err.message || 'Internal error' });
  }
}

/**
 * Permanently deletes party docs whose `expiration` timestamp has passed.
 * `expiration` is computed at party-create/update time from the admin's
 * "party retention hours" setting (see shared/partyExpiry.js) — e.g. with
 * the current 1-hour setting, a Thursday party (ending at midnight) is
 * deleted at 01:00. Called two ways: opportunistically (fire-and-forget
 * from the public site's loadEvents(), so real traffic drives near-real-time
 * cleanup) and by this file's existing cron as a backstop. Safe to call
 * anytime — it only deletes docs already past their own stored expiration.
 */
async function handleCleanupExpiredParties(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const admin = await initAdmin();
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const partiesSnap = await db.collection('parties').where('expiration', '<=', now).get();
    let deletedParties = 0;
    if (!partiesSnap.empty) {
      const batch = db.batch();
      partiesSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deletedParties = partiesSnap.size;
    }
    await agentSay('cleaner', deletedParties ? `סיימתי ניקיון לילי: נמחקו ${deletedParties} מסיבות שעבר זמנן.` : 'ניקיון לילי: אין מה לנקות, הכל מסודר ✅');
    try { await db.collection('settings').doc('cleanupLast').set({ at: Date.now(), deleted: deletedParties }, { merge: true }); } catch { /* stats only */ }
    return res.status(200).json({ ok: true, deleted: deletedParties });
  } catch (err) {
    return res.status(200).json({ ok: false, deleted: 0, error: String(err?.message || err) });
  }
}

// Same public half /api/send-push.js hardcodes — safe to expose.
const VAPID_PUBLIC_KEY = 'BEKO6poc32JAn1MYTdwdvzRve1BRIwZ85AgtEUQe_JqWLTYal5sdwJK-TossqFQzWmnE9Hoj0nxRQtA4nMjTb7Y';

/**
 * Pushes "new party" to every subscriber, given only a partyId — called
 * right after a party is created, from both the admin panel and (the actual
 * bug this exists to fix) the public advertiser-posting flow, which has no
 * admin session and therefore no way to call the admin-gated /api/send-push
 * directly. That endpoint has to stay admin-only (it accepts arbitrary
 * subscriptions/title/body from the caller, so opening it up would turn this
 * deploy's VAPID identity into a free open push relay for anyone). This job
 * is safe to leave open instead: it accepts nothing but a partyId, looks the
 * party and every subscription up itself via the Admin SDK, and only ever
 * sends the one fixed "new party" message about a party that actually exists
 * — there is no way to make it push arbitrary content to arbitrary endpoints.
 */
async function handleNotifyNewParty(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const partyId = req.query?.partyId || new URL(req.url, 'http://x').searchParams.get('partyId');
    if (!partyId) return res.status(400).json({ ok: false, error: 'Missing partyId' });

    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!privateKey) return res.status(200).json({ ok: false, error: 'Push not configured' });

    const admin = await initAdmin();
    const db = admin.firestore();
    const partySnap = await db.collection('parties').doc(partyId).get();
    if (!partySnap.exists) return res.status(200).json({ ok: false, error: 'Party not found' });
    const party = partySnap.data();

    const subsSnap = await db.collection('pushSubscriptions').get();
    const subs = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!subs.length) return res.status(200).json({ ok: true, sent: 0, total: 0 });

    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails('mailto:admin@libralparty.co.il', VAPID_PUBLIC_KEY, privateKey);
    const payload = JSON.stringify({
      title: '🎉 מסיבה חדשה!',
      body: `${party.name || party.title || 'מסיבה חדשה'} נוספה לאתר`,
      url: `/event?id=${partyId}`,
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload)
          .then(() => ({ id: s.id, ok: true }))
          .catch((err) => ({ id: s.id, ok: false, statusCode: err.statusCode }))
      )
    );
    const items = results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false }));
    const sent = items.filter((i) => i.ok).length;
    const deadIds = items.filter((i) => !i.ok && (i.statusCode === 404 || i.statusCode === 410)).map((i) => i.id);
    if (deadIds.length) {
      const batch = db.batch();
      deadIds.forEach((id) => batch.delete(db.collection('pushSubscriptions').doc(id)));
      await batch.commit();
    }

    return res.status(200).json({ ok: true, sent, total: subs.length });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
}


/**
 * Agent איתי, run by hand from the admin team chat ("איתי, תשלח התראות על מסיבות חדשות"):
 * pushes a "new parties" notification to every device that approved notifications.
 * Lists the parties added in the last 3 days (or, if none, the nearest upcoming ones).
 */
export async function sendPushUpdateNow({ scope = '' } = {}) {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) return { ok: false, error: 'Push not configured' };
  const admin = await initAdmin();
  const db = admin.firestore();
  const toMs = (v) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : NaN);
  const now = Date.now();
  const parties = (await db.collection('parties').get()).docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.status !== 'inactive' && (!Number.isFinite(toMs(p.date)) || toMs(p.date) >= now - 6 * 3600 * 1000))
    .sort((a, b) => toMs(a.date) - toMs(b.date));
  const internalOnly = scope === 'internal';
  const pool = internalOnly ? parties.filter((p) => p.partyType !== 'external') : parties;
  if (!pool.length) return { ok: true, sent: 0, total: 0, skipped: internalOnly ? 'no internal parties' : 'no active parties' };
  // Internal: simply the nearest upcoming internal parties. Otherwise prefer ones added in the last 3 days.
  const fresh = internalOnly ? [] : pool.filter((p) => now - toMs(p.createdAt) < 3 * 24 * 3600 * 1000);
  const chosen = fresh.length ? fresh : pool;
  const list = chosen.slice(0, 3);
  const names = list.map((p) => p.title || p.name).filter(Boolean);
  const more = chosen.length - list.length;
  const body = names.join(' · ') + (more > 0 ? ` ועוד ${more}` : '');

  const subs = (await db.collection('pushSubscriptions').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!subs.length) return { ok: true, sent: 0, total: 0 };
  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails('mailto:admin@libralparty.co.il', VAPID_PUBLIC_KEY, privateKey);
  // The owner's wording for the manual "send a notification" request.
  const title = internalOnly ? '🎉 חברים, המסיבות עלו!' : fresh.length ? '🎉 מסיבות חדשות באתר!' : '🎉 המסיבות הקרובות באתר';
  const text = internalOnly ? 'זה הזמן להירשם בוואטסאפ, אל תפספסו' : body;
  const payload = JSON.stringify({ title, body: text, url: '/events' });
  const items = await Promise.all(
    subs.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .then(() => ({ id: sub.id, ok: true }))
        .catch((err) => ({ id: sub.id, ok: false, statusCode: err.statusCode }))
    )
  );
  const sent = items.filter((i) => i.ok).length;
  const deadIds = items.filter((i) => !i.ok && (i.statusCode === 404 || i.statusCode === 410)).map((i) => i.id);
  if (deadIds.length) {
    const batch = db.batch();
    deadIds.forEach((id) => batch.delete(db.collection('pushSubscriptions').doc(id)));
    await batch.commit();
  }
  await agentSay('notifier', `שלחתי התראה לנייד ל-${sent} מכשירים מתוך ${subs.length}: ${body || 'עדכון מסיבות'} ✅`);
  return { ok: true, sent, total: subs.length };
}


// ── Daily team meeting ──────────────────────────────────────────────────────
// Every day the agents go over the site together in the team chat. Every line is built from real numbers
// read from the database (parties, push devices, the last campaign/health check), so the chat shows what
// is really going on; nothing is invented. שון runs the meeting. Agents hand things to each other with
// "@name" when the numbers call for it. There are no site accounts: registration is by WhatsApp.
export async function runDailyStandup({ health } = {}) {
  const admin = await initAdmin();
  const db = admin.firestore();
  const now = Date.now();
  const toMs = (v) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : NaN);
  const dayMs = 24 * 3600 * 1000;

  const parties = (await db.collection('parties').get()).docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.status !== 'inactive');
  const upcoming = parties.filter((p) => !Number.isFinite(toMs(p.date)) || toMs(p.date) >= now - 6 * 3600 * 1000).sort((a, b) => toMs(a.date) - toMs(b.date));
  const soon = upcoming.filter((p) => toMs(p.date) - now < 2 * dayMs);
  const pushDevices = (await db.collection('pushSubscriptions').get().catch(() => ({ size: 0 }))).size;
  const camp = (await db.collection('settings').doc('telegramCampaigns').get().catch(() => null))?.data?.() || {};
  const tik = (await db.collection('settings').doc('tiktokPosts').get().catch(() => null))?.data?.() || {};
  const cleanup = (await db.collection('settings').doc('cleanupLast').get().catch(() => null))?.data?.() || {};
  const hoursAgo = (t) => (t ? Math.round((now - t) / 3600000) : null);
  const problems = Array.isArray(health?.problems) ? health.problems : [];

  const say = (agent, text, to) => agentSay(agent, text, to);
  await say('fixer', `בוקר טוב צוות, ישיבת הבוקר. באתר ${upcoming.length} מסיבות פעילות. כל אחד מדווח מהתחום שלו.`);
  await say('doctor', problems.length ? `בדקתי את האתר: מצאתי ${problems.length} בעיות (${problems.slice(0, 2).join('; ')}).` : 'בדקתי את כל הדפים, הקבצים, בסיס הנתונים והבוט. הכל תקין ✅');
  if (problems.length) await say('doctor', 'צריך תיקון בקוד, אני מעביר אליך.', 'fixer');
  await say('cleaner', cleanup.at ? `בניקיון האחרון (לפני ${hoursAgo(cleanup.at)} שעות) נמחקו ${cleanup.deleted || 0} מסיבות שעבר זמנן.` : 'הניקיון הלילי פעיל, עוד אין לי נתוני ריצה אחרונים לדווח.');
  await say('secretary', soon.length ? `בשני הימים הקרובים יש ${soon.length} מסיבות. אני שולח עליהן תזכורות לערוצים ולקבוצות.` : 'אין מסיבות בשני הימים הקרובים, אין תזכורות להיום.');
  if (soon.length) await say('secretary', `${soon[0].title || soon[0].name} היא הקרובה ביותר. כדאי לחזק אותה בקמפיין.`, 'publisher');
  await say('publisher', camp.lastSentAt ? `הקמפיין האחרון בערוץ יצא לפני ${hoursAgo(camp.lastSentAt)} שעות. הבא יוצא ביום הקמפיין הקרוב.` : 'עוד לא יצא קמפיין החודש, אני מחכה ליום הקמפיין.');
  await say('tiktok', tik.lastSentAt ? `פוסט הטיקטוק האחרון נשלח אליך לפני ${hoursAgo(tik.lastSentAt)} שעות. הבא בראשון או בחמישי.` : 'עוד לא שלחתי לך פוסט לטיקטוק. הראשון יוצא ביום ראשון או חמישי.');
  await say('notifier', pushDevices ? `יש ${pushDevices} מכשירים שאישרו התראות. אני מוכן לשלוח על מסיבות חדשות.` : 'עוד אין מכשירים שאישרו התראות. כדאי לעודד אישור באתר.');
  await say('support', 'ענייתי לשאלות הנפוצות בצ׳אט התמיכה. שאלה שאין לי עליה תשובה ממתינה לך בצ׳אט.');
  const open = [problems.length ? `${problems.length} בעיות באתר` : ''].filter(Boolean);
  await say('fixer', open.length ? `סיכום: ${open.join(', ')}. כל השאר בסדר. נתראה מחר.` : 'סיכום: אין שום דבר פתוח, האתר ירוק. נתראה מחר ✅');
  return { ok: true, parties: upcoming.length };
}

// 7 October memorial: one picture, no caption, no link, sent once to every
// group and channel. It is the only thing published on the silent day.
async function sendMemorialOnce() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('Server not configured (missing TELEGRAM_BOT_TOKEN)');
  const admin = await initAdmin();
  const db = admin.firestore();
  const ref = db.collection('settings').doc('memorialSent');
  const day = israelDate();
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.day === day) return false;
    tx.set(ref, { day, at: Date.now() });
    return true;
  });
  if (!claimed) return { ok: true, skipped: 'memorial already sent today' };
  const destinations = await getReminderDestinations(admin);
  const results = [];
  for (const dest of destinations) {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: dest.chatId, photo: 'https://www.libralparty.net/assets/memorial-710.jpg' })
    });
    const data = await r.json().catch(() => ({}));
    results.push({ chatId: dest.chatId, name: dest.name || '', ok: Boolean(data.ok), description: data.description });
    await sleep(80);
  }
  if (!results.some((x) => x.ok)) await ref.set({ day: '' }).catch(() => {});
  const failedMem = describeFailedChats(results);
  await agentSay('publisher', `פרסמתי את תמונת הזיכרון ב-${results.filter((x) => x.ok).length} מתוך ${results.length} קבוצות וערוצים.${failedMem ? ` לא נשלח ל: ${failedMem}.` : ''}`).catch(() => {});
  return { ok: results.some((x) => x.ok), results };
}

// Sends every announcement in shared/announcements.js that has not gone out yet, once, to all groups and channels.
export async function sendAnnouncementsOnce() {
  if (PUBLISHER_PAUSED && process.env.SILENT_DAYS_OFF !== '1') return [{ skipped: 'publisher paused by the owner' }];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('Server not configured (missing TELEGRAM_BOT_TOKEN)');
  const admin = await initAdmin();
  const db = admin.firestore();
  const ref = db.collection('settings').doc('announcementsSent');
  const out = [];
  for (const a of ANNOUNCEMENTS) {
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const done = snap.exists ? snap.data() || {} : {};
      if (done[a.id]) return false;
      tx.set(ref, { [a.id]: Date.now() }, { merge: true });
      return true;
    });
    if (!claimed) { out.push({ id: a.id, skipped: 'already sent' }); continue; }
    const destinations = await getReminderDestinations(admin);
    const results = [];
    for (const dest of destinations) {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: dest.chatId, photo: a.image, caption: a.caption })
      });
      const data = await r.json().catch(() => ({}));
      results.push({ chatId: dest.chatId, name: dest.name || '', ok: Boolean(data.ok), description: data.description });
      await sleep(80);
    }
    if (!results.some((x) => x.ok)) await ref.set({ [a.id]: 0 }, { merge: true }).catch(() => {});
    const failedAnn = describeFailedChats(results);
    await agentSay('publisher', `פרסמתי את ההודעה המיוחדת ב-${results.filter((x) => x.ok).length} מתוך ${results.length} קבוצות וערוצים.${failedAnn ? ` לא נשלח ל: ${failedAnn}.` : ''}`).catch(() => {});
    out.push({ id: a.id, results });
  }
  return out;
}

// "MOJO (no rights to send photos), ..." — which groups a broadcast did not reach and why, so the owner
// can fix the bot's rights there. Telegram's English reasons are translated for the common cases.
export function describeFailedChats(results) {
  const reason = (d = '') => (/not enough rights to send photos/i.test(d) ? 'אין לבוט הרשאה לשלוח תמונות'
    : /not enough rights/i.test(d) ? 'אין לבוט הרשאה לשלוח הודעות'
    : /chat not found|kicked|not a member/i.test(d) ? 'הבוט לא נמצא בקבוצה'
    : d ? d.slice(0, 60) : 'סיבה לא ידועה');
  const seen = new Map();
  for (const r of results || []) {
    if (r.ok) continue;
    const key = r.group || r.name || String(r.chatId);
    if (!seen.has(key)) seen.set(key, reason(r.description));
  }
  return [...seen].map(([name, why]) => `${name} (${why})`).join(', ');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const job = req.query?.job || new URL(req.url, 'http://x').searchParams.get('job');
    // The site is closed for good: no reminders, campaigns, announcements, pushes or posts of any kind.
    if (isSiteClosed() && !NON_PUBLISHING_JOBS.has(job)) {
      return res.status(200).json({ ok: true, skipped: 'site-closed' });
    }
    // National mourning day: no automatic or manual publishing of any kind.
    if (isSilentDay() && !NON_PUBLISHING_JOBS.has(job)) {
      if (job && job !== 'memorial') return res.status(200).json({ ok: true, skipped: 'silent-day' });
      if (!isPromoAuthorized(req) && !isCronAuthorized(req)) return res.status(200).json({ ok: true, skipped: 'silent-day' });
      try { return res.status(200).json({ ok: true, skipped: 'silent-day', memorial: await sendMemorialOnce() }); } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    if (job === 'promo-check') {
      // Diagnostic only — never sends a message. Reports whether the secret
      // is configured and whether the provided key matches, without leaking
      // the actual secret value.
      return res.status(200).json({
        secretConfigured: Boolean(process.env.TELEGRAM_PROMO_SECRET),
        keyReceived: Boolean(req.query?.key || new URL(req.url, 'http://x').searchParams.get('key')),
        authorized: isPromoAuthorized(req)
      });
    }
    if (job === 'announce') {
      if (!isPromoAuthorized(req) && !isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
      try { return res.status(200).json({ ok: true, announcements: await sendAnnouncementsOnce() }); } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    if (job === 'health') {
      return handleHealth(req, res);
    }
    if (job === 'standup') {
      if (!isPromoAuthorized(req) && !isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
      try {
        const health = await runHealthCheck({ alert: false }).catch(() => null);
        return res.status(200).json(await runDailyStandup({ health }));
      } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    if (job === 'push-now') {
      if (!isPromoAuthorized(req) && !isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
      const scope = req.query?.scope || new URL(req.url, 'http://x').searchParams.get('scope') || '';
      try { return res.status(200).json(await sendPushUpdateNow({ scope })); } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    if (job === 'tiktok') {
      if (!isPromoAuthorized(req) && !isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
      const force = (req.query?.force || new URL(req.url, 'http://x').searchParams.get('force')) === '1';
      try { return res.status(200).json(await sendTiktokPostIfDue({ force })); } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    if (job === 'campaign') {
      return handleCampaign(req, res);
    }
    if (job === 'test-group') {
      return handleTestGroup(req, res);
    }
    if (job === 'manual-post-check') {
      return handleManualPostCheck(req, res);
    }
    if (job === 'manual-post') {
      return handleManualPost(req, res);
    }
    if (job === 'fix-channels') {
      return handleFixChannels(req, res);
    }
    if (job === 'fix-chatids') {
      return handleFixChatIds(req, res);
    }
    if (job === 'migrate-support-chat-secret') {
      return handleMigrateSupportChatSecret(req, res);
    }
    if (job === 'cleanup-parties') {
      return handleCleanupExpiredParties(req, res);
    }
    if (job === 'notify-new-party') {
      return handleNotifyNewParty(req, res);
    }
    if (job === 'fix-party-whatsapp') {
      return handleFixPartyWhatsapp(req, res);
    }
    if (job === 'recent-chats') {
      return handleRecentChats(req, res);
    }
    if (job === 'bot-info') {
      return handleBotInfo(req, res);
    }
    if (job === 'webhook-info') {
      return handleWebhookInfo(req, res);
    }
    if (job === 'chat-status') {
      return handleChatStatus(req, res);
    }
    if (job === 'set-webhook') {
      return handleSetWebhook(req, res);
    }
    return handlePartyReminders(req, res);
  }
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  if (req.method === 'POST') {
    const postJob = req.query?.job || new URL(req.url, 'http://x').searchParams.get('job');
  }
  if (!requireTelegramWebhookSecret(req, res)) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const msg = body?.message || body?.edited_message;
    const anyChat = msg?.chat || body?.my_chat_member?.chat || body?.channel_post?.chat;

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.error('telegram-webhook: GOOGLE_APPLICATION_CREDENTIALS_JSON not set - replies will not reach the website');
      return res.status(200).json({ ok: true });
    }
    let admin;
    try {
      admin = await initAdmin();
    } catch (e) {
      console.error('Firebase init:', e);
      return res.status(200).json({ ok: true });
    }

    // Best-effort: remember every chat the bot hears from, so a group's
    // real chat_id can be looked up later (?job=recent-chats) instead of
    // guessed from a partial/mistyped value.
    if (anyChat) await recordSeenChat(admin, anyChat, body?.my_chat_member?.new_chat_member?.status);

    if (!msg?.text) {
      return res.status(200).json({ ok: true });
    }

    const replyTo = msg.reply_to_message;
    if (!replyTo?.message_id) {
      return res.status(200).json({ ok: true });
    }

    const replyToMsgId = String(replyTo.message_id);

    const mapSnap = await admin.firestore().collection('supportChatTelegramMap').doc(replyToMsgId).get();
    const sessionId = mapSnap?.data?.()?.sessionId;
    if (!sessionId) {
      return res.status(200).json({ ok: true });
    }

    await admin.firestore().collection('supportChat').doc(sessionId).collection('messages').add({
      role: 'support',
      text: msg.text.trim(),
      createdAt: new Date()
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('telegram-webhook:', err);
    return res.status(200).json({ ok: true });
  }
}
