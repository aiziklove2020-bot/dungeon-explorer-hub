/**
 * Public Vercel API: relay support-bubble messages to Telegram (browser cannot call api.telegram.org).
 * POST JSON: { sessionId, text, displayName? }
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON (read settings/supportChat server-side).
 *
 * GET: Diagnostic check (merged in from the former standalone
 * /api/support-chat-diagnostic.js to stay under the Vercel Hobby plan's
 * serverless-function limit). Requires `Authorization: Bearer ${ADMIN_API_SECRET}`.
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import { getRequestIp, isRateLimited } from '../lib/forumAuthApi.js';

// Per-IP throttle for the unauthenticated relay jobs below (advertiser-signup/
// membership-lead/subscription-request/plain chat relay) — these have no
// secret and no CAPTCHA by design (they're fired right after a real public
// form submission), so without this an attacker could hit them directly in a
// loop and flood the site owner's personal Telegram with unlimited forged
// alerts, or drown out real ones badly enough that Telegram rate-limits the
// bot and legitimate notifications stop arriving too.
const RELAY_RATE_WINDOW_MS = 15 * 60 * 1000;
const RELAY_RATE_PER_IP = 10;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const SESSION_RE = /^sc_\d+_[a-z0-9]+$/i;

async function handleDiagnostic(req, res) {
  if (!requireAdminApiSecret(req, res)) return;

  const result = { ok: false, checks: {} };

  result.checks.envSet = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!result.checks.envSet) {
    return res.status(200).json({
      ...result,
      message: 'GOOGLE_APPLICATION_CREDENTIALS_JSON not set in Vercel. Add it and redeploy.',
      fix: 'Vercel → Project → Settings → Environment Variables → Add GOOGLE_APPLICATION_CREDENTIALS_JSON'
    });
  }

  let credValid = false;
  try {
    JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    credValid = true;
  } catch (e) {
    result.checks.jsonParse = false;
    return res.status(200).json({
      ...result,
      message: 'GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON.',
      fix: 'Copy the full service account JSON from Firebase (Generate new private key). Ensure no extra characters.'
    });
  }
  result.checks.jsonParse = credValid;

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
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
      admin.initializeApp({
        credential: admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)),
        projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
      });
    }
    result.checks.firebaseInit = true;
  } catch (e) {
    result.checks.firebaseInit = false;
    return res.status(200).json({
      ...result,
      message: 'Firebase init failed: ' + (e.message || String(e)),
      fix: 'Check that the service account has access to the Firebase project (tbdsm-5acca).'
    });
  }

  let firestoreRead = false;
  try {
    const snap = await admin.firestore().collection('supportChatTelegramMap').limit(1).get();
    firestoreRead = true;
    result.checks.firestoreRead = true;
    result.checks.mapDocCount = snap.size;
  } catch (e) {
    result.checks.firestoreRead = false;
    return res.status(200).json({
      ...result,
      message: 'Firestore read failed: ' + (e.message || String(e)),
      fix: 'Check Firebase project ID and service account permissions.'
    });
  }

  // Check webhook URL (optional - need bot token from settings)
  try {
    const settingsSnap = await admin.firestore().collection('settings').doc('supportChat').get();
    const botToken = settingsSnap?.data?.()?.botToken;
    if (botToken) {
      const whRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const whData = await whRes.json();
      result.checks.webhookUrl = whData.result?.url || null;
      result.checks.webhookOk = !!whData.result?.url;
      if (!whData.result?.url) {
        result.webhookHint = 'Webhook not set. Click "Get Chat ID" or "Set Webhook" in Admin → Support Chat.';
      }
    } else {
      result.checks.webhookUrl = null;
      result.checks.webhookOk = null;
      result.webhookHint = 'No bot token in settings - cannot check webhook. Save Support Chat settings first.';
    }
  } catch (e) {
    result.checks.webhookUrl = null;
    result.checks.webhookError = e.message || String(e);
  }

  return res.status(200).json({
    ok: true,
    ...result,
    message: 'All checks passed. Replies should work. If not, ensure you reply to the support message (use Reply in Telegram).'
  });
}

async function handleAdvertiserSignupAlert(req, res, body) {
  const businessName = (body.businessName || '').trim().slice(0, 200);
  const contactName = (body.contactName || '').trim().slice(0, 200);
  const phoneNumber = (body.phoneNumber || '').trim().slice(0, 40);

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return res.status(503).json({ error: 'Not configured' });
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.firestore) {
      const [{ getApps }, { getFirestore }] = await Promise.all([
        import('firebase-admin/app'),
        import('firebase-admin/firestore')
      ]);
      Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
      admin.firestore = () => getFirestore();
    }
    if (!admin.apps?.length) {
      const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
    }
  } catch (e) {
    console.error('advertiser-signup alert Firebase init:', e.message);
    return res.status(503).json({ error: 'Server configuration error' });
  }

  try {
    if (await isRateLimited(admin.firestore(), 'support-chat-advertiser-signup', getRequestIp(req), RELAY_RATE_WINDOW_MS, RELAY_RATE_PER_IP)) {
      return res.status(200).json({ ok: true });
    }

    const privateSnap = await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').get();
    let d = privateSnap.exists ? privateSnap.data() : null;
    if (!d) {
      const legacySnap = await admin.firestore().collection('settings').doc('supportChat').get();
      d = legacySnap?.data?.() || {};
    }
    const botToken = d.botToken;
    const chatId = d.chatId;
    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Telegram not configured' });
    }

    const msg = `📋 מפרסם/ת חדש/ה נרשם/ה — ממתין/ה לאישור\n\nעסק: ${businessName || '—'}\nאיש קשר: ${contactName || '—'}\nטלפון: ${phoneNumber || '—'}`;
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg })
    });
    const result = await tgRes.json();
    if (!result.ok) {
      return res.status(502).json({ error: result.description || 'Telegram error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('advertiser-signup alert:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

const TRACK_LABELS = {
  parties: 'מסיבות בדסם',
  exchange: 'חילופי זוגות',
  combo: 'מסלול משולב'
};

async function handleMembershipLeadAlert(req, res, body) {
  const name = (body.name || '').trim().slice(0, 200);
  const phone = (body.phone || '').trim().slice(0, 40);
  const track = (body.track || '').trim().slice(0, 100);
  const message = (body.message || '').trim().slice(0, 2000);

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return res.status(503).json({ error: 'Not configured' });
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.firestore) {
      const [{ getApps }, { getFirestore }] = await Promise.all([
        import('firebase-admin/app'),
        import('firebase-admin/firestore')
      ]);
      Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
      admin.firestore = () => getFirestore();
    }
    if (!admin.apps?.length) {
      const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
    }
  } catch (e) {
    console.error('membership-lead alert Firebase init:', e.message);
    return res.status(503).json({ error: 'Server configuration error' });
  }

  try {
    if (await isRateLimited(admin.firestore(), 'support-chat-membership-lead', getRequestIp(req), RELAY_RATE_WINDOW_MS, RELAY_RATE_PER_IP)) {
      return res.status(200).json({ ok: true });
    }

    const privateSnap = await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').get();
    let d = privateSnap.exists ? privateSnap.data() : null;
    if (!d) {
      const legacySnap = await admin.firestore().collection('settings').doc('supportChat').get();
      d = legacySnap?.data?.() || {};
    }
    let botToken = d.botToken;
    let chatId = d.chatId;

    // Same fallback as the plain support-chat send path below: no dedicated
    // support bot configured yet, use the party-announcements bot instead.
    if (!botToken || !chatId) {
      const tgSnap = await admin.firestore().collection('settings').doc('telegram').get();
      const tg = tgSnap.exists ? tgSnap.data() : null;
      if (tg) {
        if (Array.isArray(tg.bots) && tg.bots.length > 0) {
          botToken = botToken || tg.bots[0]?.token;
        } else {
          botToken = botToken || tg.botToken;
        }
        if (Array.isArray(tg.channels) && tg.channels.length > 0) {
          chatId = chatId || tg.channels[0]?.chatId;
        } else {
          chatId = chatId || tg.chatId;
        }
      }
    }

    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Telegram not configured' });
    }

    const trackLabel = TRACK_LABELS[track] || track || '—';
    const msg = `⚖️ בקשת מנוי חדשה — איזון מגדרי\n\nשם: ${name || '—'}\nטלפון: ${phone || '—'}\nמסלול: ${trackLabel}${message ? `\nהודעה: ${message}` : ''}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg })
    });
    const result = await tgRes.json();
    if (!result.ok) {
      return res.status(502).json({ error: result.description || 'Telegram error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('membership-lead alert:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function handleSubscriptionRequestAlert(req, res, body) {
  const name = (body.name || '').trim().slice(0, 200);
  const phone = (body.phone || '').trim().slice(0, 40);
  const note = (body.note || '').trim().slice(0, 1000);

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return res.status(503).json({ error: 'Not configured' });
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.firestore) {
      const [{ getApps }, { getFirestore }] = await Promise.all([
        import('firebase-admin/app'),
        import('firebase-admin/firestore')
      ]);
      Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
      admin.firestore = () => getFirestore();
    }
    if (!admin.apps?.length) {
      const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
    }
  } catch (e) {
    console.error('subscription-request alert Firebase init:', e.message);
    return res.status(503).json({ error: 'Server configuration error' });
  }

  try {
    if (await isRateLimited(admin.firestore(), 'support-chat-subscription-request', getRequestIp(req), RELAY_RATE_WINDOW_MS, RELAY_RATE_PER_IP)) {
      return res.status(200).json({ ok: true });
    }

    const privateSnap = await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').get();
    let d = privateSnap.exists ? privateSnap.data() : null;
    if (!d) {
      const legacySnap = await admin.firestore().collection('settings').doc('supportChat').get();
      d = legacySnap?.data?.() || {};
    }
    let botToken = d.botToken;
    let chatId = d.chatId;

    // Same fallback as the membership-lead alert: no dedicated support bot
    // configured yet, use the party-announcements bot instead.
    if (!botToken || !chatId) {
      const tgSnap = await admin.firestore().collection('settings').doc('telegram').get();
      const tg = tgSnap.exists ? tgSnap.data() : null;
      if (tg) {
        if (Array.isArray(tg.bots) && tg.bots.length > 0) {
          botToken = botToken || tg.bots[0]?.token;
        } else {
          botToken = botToken || tg.botToken;
        }
        if (Array.isArray(tg.channels) && tg.channels.length > 0) {
          chatId = chatId || tg.channels[0]?.chatId;
        } else {
          chatId = chatId || tg.chatId;
        }
      }
    }

    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Telegram not configured' });
    }

    const msg = `⚖️ בקשה להצטרפות כמנוי\n\nשם: ${name || '—'}\nטלפון: ${phone || '—'}${note ? `\nהערה: ${note}` : ''}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg })
    });
    const result = await tgRes.json();
    if (!result.ok) {
      return res.status(502).json({ error: result.description || 'Telegram error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscription-request alert:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function handleAgentAlert(req, res, body) {
  // Unlike the three alert jobs above (which mirror a real public form
  // submission), nothing on the public site ever legitimately calls this —
  // only a scheduled cloud-agent routine (see the dispatch comment below).
  // Without a gate here, anyone could post arbitrary "🤖 המלצת סוכן"-branded
  // text into the admin's Telegram, which reads as an automated recommendation
  // and is exactly the kind of message a non-technical owner could be
  // social-engineered by.
  if (!requireAdminApiSecret(req, res)) return;

  const message = (body.message || '').trim().slice(0, 2000);
  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return res.status(503).json({ error: 'Not configured' });
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.firestore) {
      const [{ getApps }, { getFirestore }] = await Promise.all([
        import('firebase-admin/app'),
        import('firebase-admin/firestore')
      ]);
      Object.defineProperty(admin, 'apps', { get: () => getApps(), configurable: true });
      admin.firestore = () => getFirestore();
    }
    if (!admin.apps?.length) {
      const cred = admin.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
    }
  } catch (e) {
    console.error('agent-alert Firebase init:', e.message);
    return res.status(503).json({ error: 'Server configuration error' });
  }

  try {
    const privateSnap = await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').get();
    let d = privateSnap.exists ? privateSnap.data() : null;
    if (!d) {
      const legacySnap = await admin.firestore().collection('settings').doc('supportChat').get();
      d = legacySnap?.data?.() || {};
    }
    const botToken = d.botToken;
    const chatId = d.chatId;
    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Telegram not configured' });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `🤖 המלצת סוכן\n\n${message}` })
    });
    const result = await tgRes.json();
    if (!result.ok) {
      return res.status(502).json({ error: result.description || 'Telegram error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('agent-alert:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  // GET is the former /api/support-chat-diagnostic behavior (see header comment).
  if (req.method === 'GET') {
    return handleDiagnostic(req, res);
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // POST { job: "advertiser-signup", businessName, contactName, phoneNumber }:
    // fired best-effort (fire-and-forget, never blocks registration) right
    // after a new advertiser signs up on /advertiser/register, so the admin
    // actually finds out — previously nothing notified them at all, and a
    // pending advertiser only surfaced by someone remembering to check the
    // Advertisers admin tab. Reuses the same Telegram bot/chat already wired
    // for support-chat messages (proven to reach the admin), rather than a
    // new serverless function (Vercel Hobby's 12-function limit).
    if (body.job === 'advertiser-signup') {
      return handleAdvertiserSignupAlert(req, res, body);
    }

    // POST { job: "membership-lead", name, phone, track, message }: fired
    // best-effort right after a "רוצה להיות מנוי?" lead is written to
    // Firestore (membership.html → leads.js), so the admin is notified the
    // same way as a new advertiser signup instead of only surfacing in the
    // leads collection.
    if (body.job === 'membership-lead') {
      return handleMembershipLeadAlert(req, res, body);
    }

    // POST { job: "subscription-request", name, phone, note }: fired
    // best-effort right after a general "בקשה להצטרפות כמנוי" request is
    // written to Firestore (register.html → requestSubscription_ in
    // site-data.js). Reuses the same reliable relay as membership-lead and
    // advertiser-signup instead of the never-configured admin Telegram
    // "subscriptionRequest" message type, which has no settings UI.
    if (body.job === 'subscription-request') {
      return handleSubscriptionRequestAlert(req, res, body);
    }

    // POST { job: "agent-alert", message }: a scheduled cloud-agent routine
    // (see claude.ai/code/routines) posts here with a plain-text
    // recommendation — "party X is coming up and hasn't been promoted yet" —
    // so it reaches the admin as a Telegram message, same recommend-only
    // pattern as the advertiser-signup alert above. The agent never
    // publishes anything itself; this is purely advisory.
    if (body.job === 'agent-alert') {
      return handleAgentAlert(req, res, body);
    }

    const { sessionId, text, displayName } = body;

    if (!sessionId || typeof sessionId !== 'string' || !SESSION_RE.test(sessionId.trim())) {
      return res.status(400).json({ error: 'Invalid session' });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text required' });
    }
    const trimmed = text.trim();
    if (trimmed.length > 4000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return res.status(503).json({ error: 'Support chat relay is not configured on the server.' });
    }

    let admin;
    try {
      admin = (await import('firebase-admin')).default;
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
    } catch (e) {
      console.error('support-chat-send Firebase init:', e.message);
      return res.status(503).json({ error: 'Server configuration error' });
    }

    if (await isRateLimited(admin.firestore(), 'support-chat-message', getRequestIp(req), RELAY_RATE_WINDOW_MS, RELAY_RATE_PER_IP)) {
      return res.status(200).json({ ok: true });
    }

    // settings/supportChat was publicly readable (Firestore rules allow read:
    // true on the whole `settings` collection), which meant this bot's token
    // could be read by anyone with no auth at all. settings/private/{doc} is
    // already locked to admin-SDK-only access in the rules — moving the
    // secret fields there is the actual fix; falls back to the old public
    // doc only until the one-off migration (?job=migrate-support-chat-secret)
    // has run.
    const privateSnap = await admin.firestore().collection('settings').doc('private').collection('supportChat').doc('config').get();
    let d = privateSnap.exists ? privateSnap.data() : null;
    if (!d) {
      const legacySnap = await admin.firestore().collection('settings').doc('supportChat').get();
      d = legacySnap?.data?.() || {};
    }
    let botToken = d.botToken;
    let chatId = d.chatId;

    // No dedicated support-chat bot configured — fall back to the same bot
    // already set up in Admin → טלגרם (the party-announcements bot), so the
    // support widget works without requiring a separate, never-exposed
    // config document to be filled in first.
    if (!botToken || !chatId) {
      const tgSnap = await admin.firestore().collection('settings').doc('telegram').get();
      const tg = tgSnap.exists ? tgSnap.data() : null;
      if (tg) {
        if (Array.isArray(tg.bots) && tg.bots.length > 0) {
          botToken = botToken || tg.bots[0]?.token;
        } else {
          botToken = botToken || tg.botToken;
        }
        if (Array.isArray(tg.channels) && tg.channels.length > 0) {
          chatId = chatId || tg.channels[0]?.chatId;
        } else {
          chatId = chatId || tg.chatId;
        }
      }
    }

    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Support chat not configured' });
    }

    const namePart =
      displayName && typeof displayName === 'string' && displayName.trim()
        ? ` - ${displayName.trim()}`
        : '';
    const msg = `💬 תמיכה${namePart}\n\n${trimmed}`;

    const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg })
    });

    const result = await tgResp.json();
    if (!result.ok) {
      return res.status(502).json({ error: result.description || 'Telegram error' });
    }

    const telegramMessageId = result.result?.message_id;
    if (telegramMessageId) {
      try {
        await admin.firestore().collection('supportChatTelegramMap').doc(String(telegramMessageId)).set({
          sessionId: sessionId.trim(),
          createdAt: new Date()
        });
      } catch (err) {
        console.error('support-chat-send: telegram-map write failed:', err);
      }
    }

    return res.status(200).json({ ok: true, telegramMessageId: telegramMessageId || null });
  } catch (err) {
    console.error('support-chat-send:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
