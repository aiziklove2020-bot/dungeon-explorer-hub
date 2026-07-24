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
 * to the community channel and group, a few times a week. Merged in here
 * (rather than its own file) to stay under the Vercel Hobby plan's
 * 12-serverless-function limit — same reasoning as git-history.js absorbing
 * the old record-deploy-status route.
 *
 * Auth: Vercel signs cron-triggered requests with `Authorization: Bearer
 * ${CRON_SECRET}` when that env var is set — verified below so this can't be
 * triggered by an arbitrary GET from outside Vercel.
 * Env (cron): CRON_SECRET, TELEGRAM_BOT_TOKEN (the "Legacy (Matching)" bot —
 * already has access to both destinations).
 *
 * GET ?job=promo: Sends a short recurring "publish your party through the
 * site" message to the "מסיבות בישראל" group. Vercel Hobby cron jobs can only
 * run once/day, so a every-few-hours schedule needs an external pinger (e.g.
 * cron-job.org) hitting this URL with ?job=promo&key=TELEGRAM_PROMO_SECRET.
 * Env: TELEGRAM_PROMO_SECRET, TELEGRAM_BOT_TOKEN.
 */
import { requireTelegramWebhookSecret } from '../lib/apiAuth.js';
import { isPartyExpiredByDate } from '../shared/partyExpiry.js';

const REMINDER_CHANNEL_CHAT_ID = '-1002446012533'; // @libralparty channel
const REMINDER_GROUP_CHAT_ID = '-1001610769071'; // "מסיבות בישראל" group
const DEFAULT_RETENTION_HOURS = 48;

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

async function handlePartyReminders(req, res) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return res.status(503).json({ error: 'Server not configured (missing GOOGLE_APPLICATION_CREDENTIALS_JSON)' });
  }

  try {
    const admin = await initAdmin();
    const settingsSnap = await admin.firestore().collection('settings').doc('partySettings').get();
    const retentionHours = settingsSnap.exists ? settingsSnap.data()?.retentionHours : DEFAULT_RETENTION_HOURS;

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
      for (const chatId of [REMINDER_CHANNEL_CHAT_ID, REMINDER_GROUP_CHAT_ID]) {
        const data = await sendReminderToChat(botToken, chatId, party);
        results.push({ party: party.title || party.name, chatId, ok: data.ok, description: data.description });
        await sleep(1200); // stay well under Telegram's per-chat rate limit
      }
    }

    return res.status(200).json({ ok: true, partiesSent: activeParties.length, results });
  } catch (err) {
    console.error('party-reminders:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
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
