/**
 * Diagnostic endpoint: check if support chat replies (webhook) can work
 * GET /api/support-chat-diagnostic
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` header. Returns
 *       Firebase service-account / Telegram webhook info, so it MUST NOT be
 *       reachable anonymously.
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }
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
    if (!admin.apps?.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)),
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
