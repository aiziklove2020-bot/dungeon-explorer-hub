/**
 * Proxy Telegram Bot API for the SPA (Telegram does not send CORS headers).
 * POST JSON: { telegramMethod, botToken, payload? }
 *
 * Whitelist only methods used by this app.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const TOKEN_RE = /^\d+:[A-Za-z0-9_-]+$/;
const ALLOWED = new Set(['sendMessage', 'sendPhoto', 'getMe', 'getUpdates', 'deleteWebhook', 'setWebhook']);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, description: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ ok: false, description: 'Invalid JSON' });
  }

  const { telegramMethod, botToken, payload = {} } = body;
  if (!telegramMethod || typeof telegramMethod !== 'string' || !ALLOWED.has(telegramMethod)) {
    return res.status(400).json({ ok: false, description: 'Unsupported or missing telegramMethod' });
  }
  if (!botToken || typeof botToken !== 'string' || !TOKEN_RE.test(botToken.trim())) {
    return res.status(400).json({ ok: false, description: 'Invalid bot token' });
  }

  const token = botToken.trim();
  const base = `https://api.telegram.org/bot${token}`;

  try {
    let tgRes;
    if (telegramMethod === 'sendMessage' || telegramMethod === 'sendPhoto') {
      tgRes = await fetch(`${base}/${telegramMethod}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload && typeof payload === 'object' ? payload : {})
      });
    } else if (telegramMethod === 'getMe' || telegramMethod === 'deleteWebhook') {
      tgRes = await fetch(`${base}/${telegramMethod}`);
    } else if (telegramMethod === 'getUpdates') {
      const qs = new URLSearchParams();
      const p = payload && typeof payload === 'object' ? payload : {};
      if (p.offset != null) qs.set('offset', String(p.offset));
      if (p.limit != null) qs.set('limit', String(p.limit));
      if (p.timeout != null) qs.set('timeout', String(p.timeout));
      if (p.allowed_updates != null) qs.set('allowed_updates', JSON.stringify(p.allowed_updates));
      const q = qs.toString();
      tgRes = await fetch(`${base}/getUpdates${q ? `?${q}` : ''}`);
    } else if (telegramMethod === 'setWebhook') {
      const p = payload && typeof payload === 'object' ? payload : {};
      const qs = new URLSearchParams();
      if (p.url) qs.set('url', String(p.url));
      if (p.secret_token) qs.set('secret_token', String(p.secret_token));
      if (p.drop_pending_updates) qs.set('drop_pending_updates', 'true');
      tgRes = await fetch(`${base}/setWebhook?${qs.toString()}`);
    }

    const json = await tgRes.json().catch(() => ({ ok: false, description: 'Invalid Telegram response' }));
    return res.status(200).json(json);
  } catch (e) {
    return res.status(200).json({ ok: false, description: e.message || 'Relay error' });
  }
}
