/**
 * Tab configuration for the Admin panel.
 * Each entry defines the tab id and its display label.
 * Imported by Admin.jsx to drive both the tab buttons and section rendering.
 */
export const adminTabs = [
  // Order follows how the admin actually works day to day: balancing first,
  // then the parties being balanced, then the people.
  { id: 'matching', label: 'התאמות' },
  { id: 'parties',  label: 'מסיבות' },
  { id: 'siteDesign', label: 'עיצוב האתר (לוגו/באנרים/פופאפ)' },
  { id: 'forumUsers', label: 'מנויי האתר' },
  // Single unified place for everyone on the site — merged with the old
  // "ניהול משתמשים" tab, which was just a different filter over the exact
  // same `users` collection and confused the admin (two tabs, one dataset).
  { id: 'subscriptions', label: 'ניהול משתמשים ומנויים' },
  { id: 'about',    label: 'אודות' },
  { id: 'contact',  label: 'צור קשר' },
  { id: 'links',    label: 'קישורים וקבוצות' },
  { id: 'deleteRequests', label: 'בקשות מחיקה' },
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
