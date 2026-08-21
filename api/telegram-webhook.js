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
 * Same run also re-posts every active party marked "כלול באינסטגרם" to
 * Instagram (see publishActiveInstagramParties, reusing publish-content.js's
 * publishPartyToInstagram — server-side via Windsor.ai, no admin browser
 * needed). WhatsApp is NOT included here: the WhatsApp bot only listens on
 * the admin's own machine (VITE_WHATSAPP_BOT_URL defaults to localhost),
 * unreachable from this cron — it stays a manual button until the bot is
 * deployed somewhere with a public URL.
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
import { requireTelegramWebhookSecret, requireAdminApiSecret } from '../lib/apiAuth.js';
import { isPartyExpiredByDate } from '../shared/partyExpiry.js';

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
      .map((c) => ({ chatId: sanitizeChatId(c.chatId), allowedAdvertiserIds: Array.isArray(c.allowedAdvertiserIds) ? c.allowedAdvertiserIds : null }))
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
  if (!secret) return true; // lenient if unset, matches requireAdminApiSecret's pattern
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
  const linkLine = `הרשמה: https://www.libralparty.net/register`;

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

async function sendReminderToChat(botToken, chatId, party) {
  const caption = buildReminderCaption(party);
  const endpoint = party.imageURL
    ? `https://api.telegram.org/bot${botToken}/sendPhoto`
    : `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = party.imageURL
    ? { chat_id: chatId, photo: party.imageURL, caption }
    : { chat_id: chatId, text: caption };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PROMO_MESSAGE = [
  '📣 מעוניינים לפרסם את המסיבה שלכם?',
  '',
  'בואו באהבה 🩶 כל פרסום מסיבות בקבוצה נעשה רק דרך לינק אחד — אתר הקהילה. ככה כולם רואים את כל המסיבות במקום אחד, מסודר וברור.',
  '',
  'להרשמה כמפרסם ופרסום המסיבה שלכם:',
  'https://www.libralparty.net/advertiser/register'
].join('\n');

function isPromoAuthorized(req) {
  const secret = process.env.TELEGRAM_PROMO_SECRET;
  if (!secret) return false; // must be explicitly configured — no lenient default for a public-facing job
  const key = req.query?.key || new URL(req.url, 'http://x').searchParams.get('key');
  return key === secret;
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

async function handleListDeleteRequests(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const admin = await initAdmin();
    const snap = await admin.firestore().collection('deleteRequests').orderBy('createdAt', 'desc').limit(200).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ ok: true, rows });
  } catch (err) {
    console.error('list-delete-requests:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

const DELETE_REQUEST_STATUSES = new Set(['pending', 'done', 'dismissed']);

// GET ?job=process-delete-request&requestId=<x>&status=<pending|done|dismissed>
// Marks the request's status — this endpoint does NOT itself delete any
// user data (that stays a deliberate manual step for the admin, given how
// much a phone number can touch: users, registrations, forum posts, chat
// messages), it just tracks that the request was seen and handled.
async function handleProcessDeleteRequest(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  const url = new URL(req.url, 'http://x');
  const requestId = req.query?.requestId || url.searchParams.get('requestId');
  const status = req.query?.status || url.searchParams.get('status');
  if (!requestId || !DELETE_REQUEST_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Missing requestId or invalid status' });
  }
  try {
    const admin = await initAdmin();
    await admin.firestore().collection('deleteRequests').doc(requestId).update({
      status,
      processedAt: new Date().toISOString(),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('process-delete-request:', err);
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
async function recordSeenChat(admin, chat) {
  if (!chat) return;
  try {
    const ref = admin.firestore().collection('settings').doc('telegramSeenChats');
    const snap = await ref.get();
    const list = snap.exists ? (snap.data()?.chats || []) : [];
    const withoutDup = list.filter((c) => c.id !== chat.id);
    const next = [{ id: chat.id, title: chat.title || chat.username || chat.first_name || '', type: chat.type, seenAt: new Date().toISOString() }, ...withoutDup].slice(0, 30);
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

async function handleGroupPromo(req, res) {
  if (!isPromoAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  try {
    const res2 = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: REMINDER_GROUP_CHAT_ID, text: PROMO_MESSAGE })
    });
    const data = await res2.json();
    return res.status(200).json({ ok: data.ok, description: data.description });
  } catch (err) {
    console.error('group-promo:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// Core sending logic, shared by the scheduled cron path and the admin
// "פרסם מסיבות לטלגרם" manual-trigger button — only the auth check differs
// between the two callers.
// A stuck/retried invocation re-running the full send loop is exactly what
// caused the duplicate-spam incident this fixes — guard against it with a
// short Firestore lock. Any invocation that starts while another is still
// "active" (per its own last-heartbeat, not just a fixed TTL) is rejected
// outright rather than silently resending everything.
const BROADCAST_LOCK_STALE_MS = 90_000;

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

// Instagram side of the same scheduled run: posts every active party
// explicitly marked "כלול באינסטגרם" (publishToInstagram) — same account
// scoping the admin's manual "פרסם לאינסטגרם" button already applies (see
// pages/Admin.jsx). No dedup/skip-if-already-posted by design, matching the
// existing manual behavior and the Telegram reminder cadence the admin
// chose this to mirror — re-running a few times a week just refreshes the
// story and re-shares the feed post.
async function publishActiveInstagramParties(admin, activeParties) {
  const results = [];
  const eligible = activeParties.filter((p) => p.publishToInstagram === true && (p.imageURL || p.img));
  if (eligible.length === 0) return results;

  const { publishPartyToInstagram } = await import('./publish-content.js');
  for (const party of eligible) {
    try {
      const { postId, storyId } = await publishPartyToInstagram(party);
      results.push({ party: party.title || party.name, ok: true, postId, storyId });
    } catch (e) {
      results.push({ party: party.title || party.name, ok: false, error: e.message });
    }
  }
  return results;
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
        results.push({ party: party.title || party.name, chatId: dest.chatId, ok: data.ok, description: data.description });
        await sleep(400); // each send targets a different chat, so Telegram's ~1/sec-per-chat limit doesn't apply; this just stays well under the ~30/sec global limit
      }
    }

    // Instagram rides the same schedule, but only on the real full run — a
    // manual resend to one fixed Telegram channel (targetChatId) shouldn't
    // also trigger an Instagram post.
    const instagramResults = targetChatId ? [] : await publishActiveInstagramParties(admin, activeParties);

    return { partiesSent: activeParties.length, destinationCount: destinations.length, results, instagramResults };
  } finally {
    await releaseBroadcastLock(lockRef);
  }
}

async function handlePartyReminders(req, res) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { partiesSent, results, instagramResults } = await sendAllPartyReminders();
    return res.status(200).json({ ok: true, partiesSent, results, instagramResults });
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
    const { partiesSent, results, instagramResults } = await sendAllPartyReminders(targetChatId);
    return res.status(200).json({ ok: true, partiesSent, results, instagramResults });
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
    const snap = await db.collection('parties').where('expiration', '<=', now).get();
    if (snap.empty) return res.status(200).json({ ok: true, deleted: 0 });
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return res.status(200).json({ ok: true, deleted: snap.size });
  } catch (err) {
    return res.status(200).json({ ok: false, deleted: 0, error: String(err?.message || err) });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const job = req.query?.job || new URL(req.url, 'http://x').searchParams.get('job');
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
    if (job === 'promo') {
      return handleGroupPromo(req, res);
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
    if (job === 'list-delete-requests') {
      return handleListDeleteRequests(req, res);
    }
    if (job === 'cleanup-parties') {
      return handleCleanupExpiredParties(req, res);
    }
    if (job === 'process-delete-request') {
      return handleProcessDeleteRequest(req, res);
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
    if (anyChat) await recordSeenChat(admin, anyChat);

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
