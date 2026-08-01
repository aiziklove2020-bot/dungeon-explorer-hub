/**
 * Tab configuration for the Admin panel.
 * Each entry defines the tab id and its display label.
 * Imported by Admin.jsx to drive both the tab buttons and section rendering.
 */
export const adminTabs = [
  { id: 'siteDesign', label: 'עיצוב האתר (לוגו/באנרים/פופאפ)' },
  { id: 'parties',  label: 'מסיבות' },
  { id: 'about',    label: 'אודות' },
  { id: 'contact',  label: 'צור קשר' },
  { id: 'matching', label: 'התאמות' },
  { id: 'links',    label: 'קישורים וקבוצות' },
  { id: 'store',    label: 'חנות' },
  { id: 'workshops',label: 'סדנאות' },
  { id: 'forum',    label: 'פורום' },
  { id: 'forumUsers', label: 'משתמשי פורום' },
  { id: 'liveChat', label: 'צ׳אט' },
  { id: 'chatReports', label: 'דיווחי צ׳אט' },
  { id: 'deleteRequests', label: 'בקשות מחיקה' },
  { id: 'blog',     label: 'בלוג' },
  { id: 'users',    label: 'ניהול משתמשים' },
  { id: 'subscriptions', label: 'ניהול מנויים' },
  { id: 'admins',   label: 'ניהול אדמינים' },
  { id: 'advertisers', label: 'מפרסמים' },
  { id: 'rss',      label: 'RSS Feeds' },
  { id: 'telegram', label: 'טלגרם' },
  // These three are real, working recovery/monitoring tools (backup+restore,
  // Firestore read-volume tracking, git publish audit log) — not dead code,
  // just rarely-clicked technical/ops tools that clutter the main tab row.
  // Grouped behind the "מתקדם" toggle in Admin.jsx instead of removed.
  { id: 'db',       label: 'DB', advanced: true },
  { id: 'dbLogger', label: 'לוג קריאות DB', advanced: true },
  { id: 'gitHistory', label: 'היסטוריית Git', advanced: true },
];
