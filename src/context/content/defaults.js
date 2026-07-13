/**
 * Default content tree + merge helpers for ContentContext.
 *
 * Extracted from ContentContext.jsx (Phase 3.1 god-file split) so the provider
 * itself focuses on React state, Firestore plumbing, and autosave; the shape
 * of "content" lives here and can be edited without touching the provider.
 */

import { getCachedPublicSync } from '../../services/contentCache';
import { isEditMode, isViewingAsVisitor, isApp } from '../../services/contentService';
import { DEFAULT_PARTY_RETENTION_HOURS } from '../../../shared/partyExpiry.js';

export const defaultContent = {
  hero: {
    titleHebrew: 'מדברים',
    titleEnglish: 'בדסמ',
    subtitle: 'Talking BDSM',
    tagline: 'Safe · Sane · Consensual'
  },
  events: [],
  externalEvents: [],
  about: {
    roleTitle: 'התפקיד שלנו',
    roleText: '"מדברים בדסמ" מתמקד בניהול ה**איזון המגדרי** עבור קהילת הקינק המבקשת להגיע למועדון הדאנג\'ן. אנחנו פועלים כגוף מקשר שדואג למרחב בטוח, מאוזן ומכבד.',
    roleSubtext: 'השירות שלנו מאפשר לכם להירשם לאירועים בצורה פשוטה ומבוקרת, תוך עמידה בסטנדרטים של הקהילה ונהלי המקום.',
    infoCards: [
      { title: 'מטרת האיזון', text: 'הרישום נועד למטרה אחת: מתן אפשרות כניסה למועדון. אנחנו אחראים על ניהול הרשימות והאיזון המגדרי בערב האירוע בלבד.', accent: 'border-r-red-600' },
      { title: 'הכניסה למבוך', text: 'הכניסה למתחם המבוך היא בנהלי המועדון (זוגות בלבד). הרישום לאיזון המגדרי אינו מקנה זכות כניסה למבוך.', accent: 'border-r-zinc-600' },
      { title: 'פניות ובירורים', text: 'אנא הימנעו מפניות בנושאים שאינם נוגעים ישירות לכניסה. צוות האיזון מתרכז בניהול הרישום באופן טכני ומקצועי.', accent: 'border-r-zinc-600' },
      { title: 'קוד לבוש', text: 'הכניסה מותנית בעמידה מלאה בקוד הלבוש הנהוג במקום. הרישום לאיזון אינו פוטר מלבוש קינקי או שחור הולם.', accent: 'border-r-red-600' }
    ],
    steps: [
      { n: 1, t: 'בוחרים אירוע', d: 'בוחרים את התאריך המבוקש מתוך לוח האירועים המופיע בדף הבית.' },
      { n: 2, t: 'נרשמים לאיזון', d: 'ממלאים את טופס הרישום הדיגיטלי וממתינים לקבלת אישור מהמאזנים.' },
      { n: 3, t: 'הגעה למועדון', d: 'מזדהים בכניסה ומציינים שאתם רשומים דרך הקהילה.' }
    ],
    entryNote: '"אני ברשימה של איציק"'
  },
  contact: {
    whatsappLink: 'https://wa.me/972526196765',
    alertText: 'שימו לב: הרישום מתבצע באתר בלבד',
    description: 'יש לכם שאלות בנושא האיזון המגדרי? צריכים עזרה טכנית בתהליך הרישום? הדרך הישירה ביותר ליצור איתנו קשר היא ב-WhatsApp.',
    importantNote: 'המענה מיועד לעזרה ובירורים בלבד. לא ניתן להירשם דרך הודעה אישית. נא לשמור על שפה מכבדת ועל נהלי הקהילה.'
  },
  registration: {
    availableDates: [],
    formTitle: 'TALKING',
    formSubtitle: 'Registration & Balance',
    question: 'איך תרצי/ה להירשם?',
    cancelText: 'ביטול וחזרה',
    types: [
      { id: 'single_male', title: 'סינגל מחפש איזון', sub: 'בקשת הצטרפות לרשימת המאוזנים' },
      { id: 'single_female', title: 'סינגלית מחפשת איזון', sub: 'כולל אופציה לבקשת איסוף' },
      { id: 'female_discount', title: 'סינגלית - רישום בהנחה', sub: 'רישום מהיר ומוזל' },
      { id: 'couple', title: 'זוג המעוניין להירשם', sub: 'רישום זוגי מאוזן' }
    ]
  },
  socialLinks: [
    { type: 'instagram', label: 'אינסטגרם', url: '#' },
    { type: 'channel', label: 'ערוץ טלגרם', url: '#' },
    { type: 'discussion', label: 'קבוצת טלגרם', url: '#' },
    { type: 'whatsapp', label: 'מדברים בדסמ', url: '#' },
    { type: 'facebook', label: 'פייסבוק', url: '#' }
  ],
  whatsappGroups: {
    men: '',
    women: ''
  },
  labels: {},
  store: {},
  storeEnabled: false,
  activeWorkshopsCount: 0,
  rssFeeds: [],
  // How long a party stays visible on the public site after its labeled date.
  // Configurable on the admin Parties tab; baked into content.json at publish.
  partyRetentionHours: DEFAULT_PARTY_RETENTION_HOURS
};

/**
 * Merge persisted content back into defaults so missing fields don't
 * render undefined in the UI. Used both on initial load and when the
 * user re-imports content from Git/disk.
 */
export function mergeWithDefaults(saved) {
  return {
    hero: { ...defaultContent.hero, ...saved.hero },
    events: saved.events || defaultContent.events,
    externalEvents: saved.externalEvents || defaultContent.externalEvents,
    about: {
      ...defaultContent.about,
      ...saved.about,
      infoCards: saved.about?.infoCards || defaultContent.about.infoCards,
      steps: saved.about?.steps || defaultContent.about.steps
    },
    contact: { ...defaultContent.contact, ...saved.contact },
    registration: {
      ...defaultContent.registration,
      ...saved.registration,
      types: saved.registration?.types || defaultContent.registration.types,
      formTitle: saved.registration?.formTitle || defaultContent.registration.formTitle,
      formSubtitle: saved.registration?.formSubtitle || defaultContent.registration.formSubtitle,
      question: saved.registration?.question || defaultContent.registration.question,
      cancelText: saved.registration?.cancelText || defaultContent.registration.cancelText,
      availableDates: saved.registration?.availableDates || defaultContent.registration.availableDates
    },
    socialLinks: saved.socialLinks || defaultContent.socialLinks,
    whatsappGroups: saved.whatsappGroups || defaultContent.whatsappGroups,
    labels: saved.labels || defaultContent.labels,
    store: saved.store || defaultContent.store,
    storeEnabled: saved.storeEnabled ?? defaultContent.storeEnabled,
    activeWorkshopsCount: saved.activeWorkshopsCount ?? defaultContent.activeWorkshopsCount,
    rssFeeds: saved.rssFeeds || defaultContent.rssFeeds,
    partyRetentionHours: saved.partyRetentionHours ?? defaultContent.partyRetentionHours
  };
}

/**
 * Return the hydrated initial content to render on first paint:
 * - Use the public cache when available (fastest first paint).
 * - Force defaults when running in edit mode or the native app (those
 *   flows must always fetch fresh).
 */
export function getInitialContentState() {
  const cached = getCachedPublicSync();
  if (!cached || typeof cached !== 'object') return defaultContent;
  if (typeof window === 'undefined') return defaultContent;
  if (isEditMode() && !isViewingAsVisitor()) return defaultContent;
  if (isApp()) return defaultContent;
  return mergeWithDefaults(cached);
}

/** True when we were able to hydrate from the public cache synchronously. */
export function getInitializedFromCache() {
  const cached = getCachedPublicSync();
  if (!cached || typeof cached !== 'object') return false;
  if (typeof window === 'undefined') return false;
  if (isEditMode() && !isViewingAsVisitor()) return false;
  if (isApp()) return false;
  return true;
}

/** Set a nested value by dot path (e.g. "infoCards.0.title"). Returns new object without mutating. */
export function setByPath(obj, path, value) {
  const parts = path.split('.');
  if (parts.length === 1) {
    return { ...obj, [path]: value };
  }
  const [head, ...rest] = parts;
  if (Array.isArray(obj[head])) {
    const arr = [...obj[head]];
    const index = parseInt(rest[0], 10);
    if (rest.length === 1) {
      arr[index] = value;
    } else {
      arr[index] = setByPath(arr[index] != null ? arr[index] : {}, rest.slice(1).join('.'), value);
    }
    return { ...obj, [head]: arr };
  }
  return {
    ...obj,
    [head]: setByPath(obj[head] || {}, rest.join('.'), value)
  };
}
