// The editable text of the About and Contact pages (admin panel tabs "אודות" and
// "צור קשר"), stored in settings/siteConfig.aboutText / contactText. Empty → these defaults.
export const DEFAULT_ABOUT_TEXT = 'בוחרים מסיבה באתר ולוחצים על "הרשמה בוואטסאפ". ההרשמה נעשית רק בוואטסאפ, מול אבי, והוא חוזר אליכם עם כל הפרטים.';
export const DEFAULT_CONTACT_TEXT = "הרשמה למסיבות, שאלות או כל דבר אחר: שולחים הודעה בוואטסאפ לאבי, והוא חוזר אליכם. אפשר גם לכתוב לנו בצ'אט באתר.";
export const SITE_TEXT_MAX = 2000;

export function siteTexts(config) {
  const pick = (v, d) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, SITE_TEXT_MAX) : d);
  return { aboutText: pick(config?.aboutText, DEFAULT_ABOUT_TEXT), contactText: pick(config?.contactText, DEFAULT_CONTACT_TEXT) };
}
