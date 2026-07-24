/**
 * Telegram Bot webhook: receive admin replies and forward to support chat.
 * Set webhook from Admin. Requires GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel for replies to reach the website.
 *
 * Auth: Verifies `X-Telegram-Bot-Api-Secret-Token` against TELEGRAM_WEBHOOK_SECRET
 *       env var when set. Configure via:
 *       POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *            ?url=<URL>&secret_token=<SAME_VALUE_AS_ENV>
 *
 * GET: Cron job (see vercel.json "crons") — posts every currently-active party
 * as its own Telegram message (photo + caption) to the community channel and
 * group, a few times a week. Merged in here (rather than its own file) to
 * stay under the Vercel Hobby plan's 12-serverless-function limit — same
 * reasoning as git-history.js absorbing the old record-deploy-status route.
 *
 * Auth: Vercel signs cron-triggered requests with `Authorization: Bearer
 * ${CRON_SECRET}` when that env var is set — verified below so this can't be
 * triggered by an arbitrary GET from outside Vercel.
 * Env (cron): CRON_SECRET, TELEGRAM_BOT_TOKEN (the "Legacy (Matching)" bot —
 * already has access to both destinations).
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

function buildReminderCaption(party) {
  const lines = [`🎉 ${party.title || party.name || 'מסיבה'}`];
  if (party.day || party.date) {
    const dateStr = party.date?.toDate ? party.date.toDate().toLocaleDateString('he-IL') : '';
    lines.push([party.day, dateStr].filter(Boolean).join(' · '));
  }
  if (party.dj) lines.push(`🎧 ${party.dj}`);
  if (party.description) lines.push('', party.description.slice(0, 900));
  if (party.partyType === 'external' && party.registrationLink) {
    lines.push('', `הרשמה: ${party.registrationLink}`);
  } else if (party.whatsappNumber) {
    const digits = String(party.whatsappNumber).replace(/\D/g, '');
    const waNumber = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
    lines.push('', `יצירת קשר בוואטסאפ: https://wa.me/${waNumber}`);
  } else {
    lines.push('', 'הרשמה: https://www.libralparty.net/register');
  }
  return lines.join('\n').slice(0, 1024); // Telegram caption limit
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
