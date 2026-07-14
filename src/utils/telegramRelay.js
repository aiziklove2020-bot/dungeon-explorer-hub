/**
 * Same-origin proxy for Telegram Bot API (api.telegram.org blocks browser CORS).
 * Server: api/telegram-relay.js
 */
export function getTelegramRelayUrl() {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? String(import.meta.env.BASE_URL).replace(/\/+$/, '')
      : '';
  return `${base}/api/telegram-relay`;
}

/**
 * @param {'sendMessage'|'sendPhoto'|'getMe'|'getUpdates'|'deleteWebhook'|'setWebhook'} telegramMethod
 * @param {string} botToken
 * @param {Record<string, unknown>} [payload] - method-specific body or query fields
 * @returns {Promise<{ data: object, status: number }>} — check `data.ok` (Telegram-shaped JSON).
 */
export async function relayTelegramApi(telegramMethod, botToken, payload = {}) {
  const res = await fetch(getTelegramRelayUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramMethod, botToken, payload })
  });
  const status = res.status;
  const data = await res.json().catch(() => ({ ok: false, description: 'Invalid relay response' }));
  return { data, status };
}
