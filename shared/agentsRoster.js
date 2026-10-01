// The site's agents: names given by the owner, grouped in categories.
// Used by the server jobs (api/telegram-webhook.js) to post to the team chat
// and by the admin tab "צוות הסוכנים".
export const AGENT_CATEGORIES = [
  { id: 'marketing', label: '📣 שיווק ופרסום' },
  { id: 'ops', label: '🛎 תפעול' },
  { id: 'health', label: '🩺 בריאות האתר' },
  { id: 'systems', label: '🤖 מערכות באתר' },
];

export const AGENTS = [
  { id: 'publisher', name: 'עומר', role: 'מפרסם', category: 'marketing', schedule: 'ראשון, שלישי וחמישי ב-12:00', desc: 'מפרסם בערוץ קמפיין (תמונה מעוצבת וכיתוב), אחד אחרי השני בסבב.', color: '#ff5596' },
  { id: 'recruiter', name: 'ליאור', role: 'מגייס', category: 'marketing', schedule: 'שני וחמישי ב-12:00', desc: 'שולח לקבוצה "מסיבות בישראל" את ההודעה "מעוניינים לפרסם את המסיבה שלכם?".', color: '#f6c887' },
  { id: 'creator', name: 'שחר', role: 'יוצר (סוכן Claude)', category: 'marketing', schedule: '1 לכל חודש', desc: 'מכין מאגר קמפיינים חדש בכל חודש, בודק עברית ותמונות, ממזג.', color: '#c084fc' },
  { id: 'secretary', name: 'אדם', role: 'מזכיר', category: 'ops', schedule: 'ראשון עד חמישי ב-12:00', desc: 'שולח תזכורות על המסיבות לערוצים ולקבוצות בטלגרם.', color: '#60a5fa' },
  { id: 'cleaner', name: 'ניק', role: 'מנקה', category: 'ops', schedule: 'כל לילה ב-03:00', desc: 'מוחק מסיבות שעבר זמנן ומנויי יום שפג תוקפם, דואג למנוי לכל החיים ולחשבון כניסה לנשים.', color: '#34d399' },
  { id: 'doctor', name: 'דין', role: 'רופא', category: 'health', schedule: 'כל יום ב-12:00', desc: 'בודק דפים, קבצים, בסיס נתונים, בוט טלגרם וקמפיינים, ומתריע על בעיה.', color: '#f87171' },
  { id: 'fixer', name: 'שון', role: 'מתקן (סוכן Claude)', category: 'health', schedule: 'כל יום ב-13:37', desc: 'קורא את תוצאת הבדיקה, מתקן בעיות בקוד וממזג.', color: '#fb923c' },
  { id: 'support', name: 'רוי', role: 'עוזר (צ׳אט תמיכה)', category: 'systems', schedule: 'כל הזמן', desc: 'עונה לבד לשאלות נפוצות בצ׳אט התמיכה.', color: '#22d3ee' },
  { id: 'matcher', name: 'דור', role: 'מתאים (איזון אוטומטי)', category: 'systems', schedule: 'בכל הרשמה', desc: 'מוצא התאמות איזון מגדרי אוטומטית בהרשמה.', color: '#a3e635' },
  { id: 'notifier', name: 'איתי', role: 'מתריע (התראות לנייד)', category: 'systems', schedule: 'כשיש איזון או מסיבה חדשה', desc: 'שולח התראות לנייד על איזון ועל מסיבות חדשות.', color: '#e879f9' },
];

export const agentById = (id) => AGENTS.find((a) => a.id === id);
