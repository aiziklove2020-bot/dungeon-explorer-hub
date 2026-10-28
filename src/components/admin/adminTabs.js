/**
 * Tab configuration for the Admin panel.
 * Each entry defines the tab id and its display label.
 * Imported by Admin.jsx to drive both the tab buttons and section rendering.
 */
export const adminTabs = [
  // The site has no member accounts: parties come first, then the agents team.
  { id: 'parties',  label: 'מסיבות' },
  { id: 'agents',   label: 'צוות הסוכנים' },
  { id: 'siteDesign', label: 'עיצוב האתר (לוגו/באנרים/פופאפ)' },
  { id: 'about',    label: 'אודות' },
  { id: 'contact',  label: 'צור קשר' },
  { id: 'links',    label: 'קישורים וקבוצות' },
  { id: 'admins',   label: 'ניהול אדמינים' },
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
