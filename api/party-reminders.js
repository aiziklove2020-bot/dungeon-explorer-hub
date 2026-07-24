/**
 * Cron job (see vercel.json "crons"): posts every currently-active party as
 * its own Telegram message (photo + caption) to the community channel and
 * group, a few times a week — a lightweight recurring reminder of what's
 * listed on the site, not tied to "new party created" notifications (which
 * already fire elsewhere).
 *
 * Auth: Vercel signs cron-triggered requests with `Authorization: Bearer
 * ${CRON_SECRET}` when that env var is set — verified below so this can't be
 * triggered by an arbitrary POST from outside Vercel.
 *
 * Env: CRON_SECRET, GOOGLE_APPLICATION_CREDENTIALS_JSON, TELEGRAM_BOT_TOKEN
 * (the "Legacy (Matching)" bot — already has access to both destinations).
 */
import { isPartyExpiredByDate } from '../shared/partyExpiry.js';

const CHANNEL_CHAT_ID = '-1002446012533'; // @libralparty channel
const GROUP_CHAT_ID = '-1001610769071'; // "מסיבות בישראל" group
const DEFAULT_RETENTION_HOURS = 48;

function isCronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // lenient if unset, matches requireAdminApiSecret's pattern
  const auth = req.headers?.authorization || '';
  return auth === `Bearer ${secret}`;
}

async function initAdmin() {
  const admin = (await import('firebase-admin')).default;
  if (!admin.firestore) {
    const [{ getApps }, { getFirestore }] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/firestore'),
    ]);
    Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
    admin.firestore = () => getFirestore();
  }
  if (!admin.apps?.length) {
    const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
    admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
  }
  return admin;
}

function buildCaption(party) {
  const lines = [`🎉 ${party.title || party.name || 'מסיבה'}`];
  if (party.day || party.date) {
    const dateStr = party.date?.toDate
      ? party.date.toDate().toLocaleDateString('he-IL')
      : '';
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

async function sendPartyToChat(botToken, chatId, party) {
  const caption = buildCaption(party);
  const endpoint = party.imageURL
    ? `https://api.telegram.org/bot${botToken}/sendPhoto`
    : `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = party.imageURL
    ? { chat_id: chatId, photo: party.imageURL, caption }
    : { chat_id: chatId, text: caption };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
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
      for (const chatId of [CHANNEL_CHAT_ID, GROUP_CHAT_ID]) {
        const data = await sendPartyToChat(botToken, chatId, party);
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
