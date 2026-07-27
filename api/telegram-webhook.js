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

// Deliberately strict: a party with no advertiser attached (e.g. added
// directly by the site admin with no owner tagged) does NOT get a free
// pass into restricted groups — only an explicitly-approved advertiser's
// parties do. This is intentional so a mistake can never leak a party into
// a competitor's group; an untagged party still reaches every unrestricted
// (allowedAdvertiserIds === null) destination as normal.
function partyAllowedFor(party, allowedAdvertiserIds) {
  if (!allowedAdvertiserIds) return true;
  return !!party.createdBy && allowedAdvertiserIds.includes(party.createdBy);
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
    const dateStr = party.date?.toDate ? party.date.toDate().toLocaleDateString('he-IL') : '';
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

// One-off migration (?job=fix-channels): applies the specific channel-list
// corrections worked out with the admin in chat — fixes מוניק's chat_id and
// advertiser allowlist, and adds the new 2vs2/אבי סווינגרס channel. Only
// touches the `channels` field on settings/telegram (via .update, not a full
// doc overwrite) so bot tokens/message templates on that doc are untouched.
// Safe to leave in place; re-running it is idempotent (upserts by id).
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
        return { ...c, chatId: '-3413559919', allowedAdvertiserIds: [BOUTIQUE_ID, NO_LIMIT_ID] };
      }
      return c;
    });
    if (!found) {
      updated.push({ id: 'krjj67olds', name: 'מוניק', chatId: '-3413559919', allowedAdvertiserIds: [BOUTIQUE_ID, NO_LIMIT_ID] });
    }

    const aviExists = updated.some((c) => c.chatId === '@avi_swingers2');
    if (!aviExists) {
      updated.push({ id: 'avi2vs2', name: '2vs2 (אבי סווינגרס)', chatId: '@avi_swingers2', allowedAdvertiserIds: [AVI_ID] });
    }

    await ref.update({ channels: updated });
    return res.status(200).json({ ok: true, channels: updated });
  } catch (err) {
    console.error('fix-channels:', err);
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
async function sendAllPartyReminders() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Server not configured (missing TELEGRAM_BOT_TOKEN)');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error('Server not configured (missing GOOGLE_APPLICATION_CREDENTIALS_JSON)');
  }

  const admin = await initAdmin();
  const settingsSnap = await admin.firestore().collection('settings').doc('partySettings').get();
  const retentionHours = settingsSnap.exists ? settingsSnap.data()?.retentionHours : DEFAULT_RETENTION_HOURS;
  const destinations = await getReminderDestinations(admin);

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
      await sleep(1200); // stay well under Telegram's per-chat rate limit
    }
  }

  return { partiesSent: activeParties.length, destinationCount: destinations.length, results };
}

async function handlePartyReminders(req, res) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { partiesSent, results } = await sendAllPartyReminders();
    return res.status(200).json({ ok: true, partiesSent, results });
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
async function handleManualPost(req, res) {
  if (!requireAdminApiSecret(req, res)) return;
  try {
    const { partiesSent, results } = await sendAllPartyReminders();
    return res.status(200).json({ ok: true, partiesSent, results });
  } catch (err) {
    console.error('manual-post:', err);
    return res.status(err.message?.startsWith('Server not configured') ? 503 : 500).json({ error: err.message || 'Internal error' });
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
    return handlePartyReminders(req, res);
  }
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  if (!requireTelegramWebhookSecret(req, res)) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const msg = body?.message || body?.edited_message;
    if (!msg?.text) {
      return res.status(200).json({ ok: true });
    }

    const replyTo = msg.reply_to_message;
    if (!replyTo?.message_id) {
      return res.status(200).json({ ok: true });
    }

    const replyToMsgId = String(replyTo.message_id);

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
