/**
 * Public Vercel API: relay support-bubble messages to Telegram (browser cannot call api.telegram.org).
 * POST JSON: { sessionId, text, displayName? }
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON (read settings/supportChat server-side).
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const SESSION_RE = /^sc_\d+_[a-z0-9]+$/i;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
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
      if (!admin.apps?.length) {
        const cred = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
        admin.initializeApp({ credential: cred, projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca' });
      }
    } catch (e) {
      console.error('support-chat-send Firebase init:', e.message);
      return res.status(503).json({ error: 'Server configuration error' });
    }

    const snap = await admin.firestore().collection('settings').doc('supportChat').get();
    const d = snap?.data?.() || {};
    const botToken = d.botToken;
    const chatId = d.chatId;

    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Support chat not configured' });
    }

    const namePart =
      displayName && typeof displayName === 'string' && displayName.trim()
        ? ` - ${displayName.trim()}`
        : '';
    const msg = `💬 Support${namePart} [${sessionId.trim()}]\n\n${trimmed}`;

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
