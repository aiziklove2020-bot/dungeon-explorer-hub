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
  { id: 'publisher', name: 'עומר', role: 'מפרסם', category: 'marketing', schedule: 'ראשון, שלישי וחמישי ב-12:00', desc: 'מפרסם בערוץ קמפיין (תמונה מעוצבת וכיתוב), אחד אחרי השני בסבב.', color: '#ff5596', skills: [{ id: 'post-campaign', label: 'לפרסם קמפיין בערוץ', tags: ['פרסם בערוץ', 'פרסום בערוץ', 'קמפיין בערוץ', 'בערוץ'], examples: ['תפרסם עכשיו קמפיין בערוץ'] }] },
  { id: 'recruiter', name: 'ליאור', role: 'מגייס', category: 'marketing', schedule: 'שני וחמישי ב-12:00', desc: 'שולח לקבוצה "מסיבות בישראל" את ההודעה "מעוניינים לפרסם את המסיבה שלכם?".', color: '#f6c887', skills: [{ id: 'recruit-advertisers', label: 'לגייס מפרסמים ולשלוח הודעה לקבוצה', tags: ['מפרסמים', 'גיוס', 'הודעה לקבוצה', 'בקבוצה'], examples: ['תשלח לקבוצה את ההודעה למפרסמים'] }] },
  { id: 'creator', name: 'שחר', role: 'יוצר (סוכן Claude)', category: 'marketing', schedule: '1 לכל חודש', desc: 'מכין מאגר קמפיינים חדש בכל חודש, בודק עברית ותמונות, ממזג.', color: '#c084fc', skills: [{ id: 'create-campaigns', label: 'להכין קמפיינים: נושאים, כיתובים ותמונות', tags: ['קמפיין חדש', 'קמפיינים חדשים', 'עיצוב קמפיין', 'עיצוב תמונה', 'תמונה', 'כיתוב', 'ניסוח', 'מאגר', 'תכתוב', 'יותר על', 'פחות על', 'נושא'], examples: ['תכתוב יותר קמפיינים על איזון'] }] },
  { id: 'tiktok', name: 'נועם', role: 'מכין טיקטוק', category: 'marketing', schedule: 'ראשון וחמישי ב-12:00', desc: 'שולח לך בטלגרם את תמונות הפוסט הבא לטיקטוק עם כיתוב מוכן, ואתה מעלה בלחיצה.', color: '#2dd4bf', skills: [{ id: 'prepare-tiktok', label: 'להכין פוסט לטיקטוק ולשלוח אותו לבעלים', tags: ['טיקטוק', 'tiktok'], examples: ['תכין לי פוסט לטיקטוק עכשיו'] }] },
  { id: 'secretary', name: 'אדם', role: 'מזכיר', category: 'ops', schedule: 'ראשון עד חמישי ב-12:00', desc: 'שולח תזכורות על המסיבות לערוצים ולקבוצות בטלגרם.', color: '#60a5fa', skills: [{ id: 'reminders', label: 'תזכורות על מסיבות', tags: ['תזכורת', 'תזכורות'], examples: ['תשלח תזכורת על המסיבה'] }] },
  { id: 'cleaner', name: 'ניק', role: 'מנקה', category: 'ops', schedule: 'כל לילה ב-03:00', desc: 'מוחק מסיבות שעבר זמנן ומנויי יום שפג תוקפם, דואג למנוי לכל החיים ולחשבון כניסה לנשים.', color: '#34d399', skills: [{ id: 'cleanup', label: 'ניקיון נתונים', tags: ['ניקיון', 'לנקות', 'מחיקה', 'מסיבות ישנות', 'מנוי יום', 'חשבון כניסה', 'סיסמה'], examples: ['תנקה מסיבות ישנות'] }] },
  { id: 'doctor', name: 'דין', role: 'רופא', category: 'health', schedule: 'כל יום ב-12:00', desc: 'בודק דפים, קבצים, בסיס נתונים, בוט טלגרם וקמפיינים, ומתריע על בעיה.', color: '#f87171', skills: [{ id: 'health', label: 'בדיקת בריאות האתר', tags: ['תקין', 'בעיה', 'בעיות', 'בדיקה', 'נפל', 'לא עובד', 'איטי'], examples: ['תבדוק שהאתר תקין'] }] },
  { id: 'fixer', name: 'שון', role: 'מתקן (סוכן Claude)', category: 'health', schedule: 'כל יום ב-13:37', desc: 'קורא את תוצאת הבדיקה, מתקן בעיות בקוד וממזג.', color: '#fb923c', skills: [{ id: 'fix-code', label: 'תיקון ושינוי קוד באתר', tags: ['תקן', 'תיקון', 'באג', 'קוד', 'שינוי באתר', 'דף', 'כפתור', 'באתר', 'פאנל', 'עיצוב האתר'], examples: ['תתקן את הכפתור בדף ההרשמה'] }] },
  { id: 'support', name: 'רוי', role: 'עוזר (צ׳אט תמיכה)', category: 'systems', schedule: 'כל הזמן', desc: 'עונה לבד לשאלות נפוצות בצ׳אט התמיכה.', color: '#22d3ee', skills: [{ id: 'support-chat', label: 'מענה אוטומטי בצ׳אט תמיכה', tags: ['צ׳אט תמיכה', 'שאלות נפוצות', 'תמיכה'], examples: ['תענה לשאלות על מנויים'] }] },
  { id: 'matcher', name: 'דור', role: 'מתאים (איזון אוטומטי)', category: 'systems', schedule: 'בכל הרשמה', desc: 'מוצא התאמות איזון מגדרי אוטומטית בהרשמה.', color: '#a3e635', skills: [{ id: 'balance', label: 'איזון מגדרי אוטומטי', tags: ['איזון', 'התאמה'], examples: ['תמצא התאמות לאיזון'] }] },
  { id: 'notifier', name: 'איתי', role: 'מתריע (התראות לנייד)', category: 'systems', schedule: 'כשיש איזון או מסיבה חדשה, ובהוראה ידנית', desc: 'שולח התראות לנייד על איזון ועל מסיבות חדשות. אפשר לכתוב לו "תשלח התראות על מסיבות חדשות" והוא שולח עכשיו לכל מי שאישר התראות.', color: '#e879f9', skills: [{ id: 'push', label: 'התראות לנייד', tags: ['התראות', 'התראה', 'התראות על מסיבות חדשות'], examples: ['תשלח התראה על מסיבה חדשה'] }] },
];

export const agentById = (id) => AGENTS.find((a) => a.id === id);
