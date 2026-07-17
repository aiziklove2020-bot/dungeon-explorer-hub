/**
 * Standalone project for grop.libralparty.net (the intro-post funnel).
 * Kept fully separate from the main dungeon-explorer-hub Vercel project
 * so this small static page + one function isn't affected by anything
 * happening on the main app.
 *
 * POST JSON: { photoUrl, caption } -> forwards as a Telegram sendPhoto to
 * the vetting group, using the bot token from the TELEGRAM_BOT_TOKEN env var
 * (set in this project's Vercel settings, not the main project's).
 */
const TARGET_CHAT_ID = '-1001610769071';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Server not configured (missing TELEGRAM_BOT_TOKEN)' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { photoUrl, caption } = body;
  if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'photoUrl required' });
  }
  if (!caption || typeof caption !== 'string') {
    return res.status(400).json({ error: 'caption required' });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TARGET_CHAT_ID, photo: photoUrl, caption })
    });
    const data = await tgRes.json();
    if (!data.ok) {
      return res.status(502).json({ error: data.description || 'Telegram error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
