/**
 * Resend email helper for forum email verification + password reset flows.
 *
 * Lives outside /api/ so Vercel never exposes it as an HTTP route.
 *
 * Environment variables (Vercel):
 *   - RESEND_API_KEY        Resend API key (server-only).
 *   - RESEND_FROM_EMAIL     Sender address; e.g. "TBDSM <noreply@yourdomain>".
 *                           Domain must be verified in Resend first.
 *   - PUBLIC_SITE_URL       Public origin used to build magic-link URLs,
 *                           e.g. "https://tbdsm.com" (no trailing slash).
 *
 * The HTML templates are deliberately minimal RTL Hebrew snippets — they
 * mirror the existing in-app voice and avoid heavyweight HTML/CSS that
 * email clients tend to break.
 */

let _resendInstance = null;

async function getResend() {
  if (_resendInstance) return _resendInstance;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const err = new Error('RESEND_API_KEY missing');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  const { Resend } = await import('resend');
  _resendInstance = new Resend(apiKey);
  return _resendInstance;
}

function getFromAddress() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    const err = new Error('RESEND_FROM_EMAIL missing');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  return from;
}

export function getPublicSiteUrl() {
  const raw = String(process.env.PUBLIC_SITE_URL || '').trim();
  return raw.replace(/\/+$/, '');
}

const RTL_BODY = `font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#f4f4f5;padding:32px 16px;direction:rtl;text-align:right;`;
const CARD = `max-width:560px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:28px;`;
const BUTTON = `display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;margin-top:8px;`;
const SMALL = `color:#a1a1aa;font-size:12px;line-height:1.6;margin-top:24px;`;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailLayout({ title, intro, ctaLabel, ctaUrl, footer }) {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!doctype html>
<html lang="he" dir="rtl"><body style="${RTL_BODY}">
  <div style="${CARD}">
    <h2 style="margin:0 0 12px;font-size:20px;">${escapeHtml(title)}</h2>
    <p style="margin:0 0 18px;line-height:1.7;">${escapeHtml(intro)}</p>
    <a href="${safeUrl}" style="${BUTTON}">${escapeHtml(ctaLabel)}</a>
    <p style="${SMALL}">
      אם הקישור לא עובד, העתק את הכתובת הבאה לדפדפן:<br/>
      <span style="word-break:break-all;color:#e4e4e7;">${safeUrl}</span>
    </p>
    <p style="${SMALL}">${escapeHtml(footer)}</p>
  </div>
</body></html>`;
}

/** Low-level Resend send. Returns `{ id }` on success, throws on failure. */
export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject || !html) {
    throw new Error('sendEmail: to/subject/html required');
  }
  const resend = await getResend();
  const result = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
    text: text || ''
  });
  if (result?.error) {
    const err = new Error(result.error.message || 'Resend send failed');
    err.code = result.error.name || 'RESEND_ERROR';
    throw err;
  }
  return { id: result?.data?.id || null };
}

/** Magic-link verification email sent on registration / email change / resend. */
export async function sendForumEmailVerification({ to, nickname, verifyUrl }) {
  const subject = 'אימות כתובת אימייל — מדברים BDSM';
  const html = emailLayout({
    title: 'אימות כתובת אימייל',
    intro: `שלום ${nickname || ''}, לחץ על הכפתור כדי לאמת את כתובת האימייל שלך. הקישור תקף ל-24 שעות.`,
    ctaLabel: 'אימות אימייל',
    ctaUrl: verifyUrl,
    footer: 'אם לא ביקשת לאמת את הכתובת הזו, אפשר להתעלם מהמייל.'
  });
  const text = `אימות כתובת אימייל — מדברים BDSM\n\nכדי לאמת את הכתובת לחץ:\n${verifyUrl}\n\nהקישור תקף ל-24 שעות. אם לא ביקשת לאמת את הכתובת, אפשר להתעלם.`;
  return sendEmail({ to, subject, html, text });
}

/** Magic-link password reset email. */
export async function sendForumPasswordReset({ to, nickname, resetUrl }) {
  const subject = 'איפוס סיסמה — מדברים BDSM';
  const html = emailLayout({
    title: 'איפוס סיסמה',
    intro: `שלום ${nickname || ''}, ביקשת לאפס את סיסמת הפורום שלך. לחץ על הכפתור כדי להגדיר סיסמה חדשה. הקישור תקף ל-30 דקות וניתן לשימוש פעם אחת בלבד.`,
    ctaLabel: 'איפוס סיסמה',
    ctaUrl: resetUrl,
    footer: 'אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהמייל — סיסמתך לא תשונה.'
  });
  const text = `איפוס סיסמה — מדברים BDSM\n\nכדי להגדיר סיסמה חדשה לחץ:\n${resetUrl}\n\nהקישור תקף ל-30 דקות. אם לא ביקשת איפוס סיסמה, אפשר להתעלם.`;
  return sendEmail({ to, subject, html, text });
}
