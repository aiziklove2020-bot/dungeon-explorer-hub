/**
 * Shared auth helpers for Vercel Serverless API routes.
 *
 * NOTE: Lives OUTSIDE /api so Vercel never exposes it as an HTTP route.
 *       Static imports from /api/*.js are bundled automatically.
 *
 * Two checks are provided:
 *
 *   1. requireAdminApiSecret(req, res)
 *      Verifies `Authorization: Bearer <secret>` against `ADMIN_API_SECRET`
 *      (env var). Use on every admin-only mutating endpoint (publish, import,
 *      git-history, support-send, diagnostic).
 *
 *      The browser admin panel must send the same secret as
 *      `import.meta.env.VITE_ADMIN_API_SECRET`. This is "shared secret"
 *      auth — anyone who downloads the admin JS bundle can read it. It
 *      blocks unauthenticated direct API hits (script kiddies, scanners,
 *      misconfigured cron). The real fix is Firebase Auth + ID-token
 *      verification (Phase 1.2 of the code-review plan).
 *
 *   2. requireTelegramWebhookSecret(req, res)
 *      Verifies `X-Telegram-Bot-Api-Secret-Token` against
 *      `TELEGRAM_WEBHOOK_SECRET`. Telegram sends this header when you
 *      register the webhook with the `secret_token` parameter:
 *        POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *             ?url=<URL>&secret_token=<SAME_VALUE_AS_ENV>
 *
 *      Lenient when the env var is unset so existing deployments don't
 *      drop replies the moment this code ships; logs a warning instead.
 *      Set the env var + re-call setWebhook to enforce.
 *
 * Both helpers RETURN a boolean and write the error response themselves;
 * callers should `if (!requireAdminApiSecret(req, res)) return;`.
 */

import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

const MIN_SECRET_LEN = 16;

function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function requireAdminApiSecret(req, res) {
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected || expected.length < MIN_SECRET_LEN) {
    res.status(503).json({
      error: 'Server configuration error',
      message: `ADMIN_API_SECRET is not set (or shorter than ${MIN_SECRET_LEN} chars). Set it in Vercel env, and expose the same value to the admin client as VITE_ADMIN_API_SECRET.`
    });
    return false;
  }
  const header = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const match = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i) : null;
  const provided = match ? match[1].trim() : '';
  if (!safeEq(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function requireTelegramWebhookSecret(req, res) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    console.warn('telegram-webhook: TELEGRAM_WEBHOOK_SECRET is not set; accepting request without verification. Set the env var and re-call Telegram setWebhook with secret_token=<same-value> to enforce.');
    return true;
  }
  const header = req.headers && (req.headers['x-telegram-bot-api-secret-token'] || req.headers['X-Telegram-Bot-Api-Secret-Token']);
  const provided = typeof header === 'string' ? header : '';
  if (!safeEq(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
