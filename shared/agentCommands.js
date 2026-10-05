// Plain-Hebrew commands the owner can type to an agent in the admin team chat
// ("עומר, תפרסם רק בימי שני וחמישי", "ליאור, תעצור", "תמשיך"). Only a few
// things are controllable by the server itself; everything else is recorded as
// a request for the team manager (Claude).
import { agentById } from './agentsRoster.js';

export const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// What each server-run agent accepts.
export const CONTROLLABLE = {
  publisher: { days: true, pause: true, now: 'campaign' },
  recruiter: { days: true, pause: true, now: 'promo' },
  tiktok: { days: true, pause: true, now: 'tiktok' },
  secretary: { pause: true },
  cleaner: { now: 'cleanup' },
  doctor: { now: 'health' },
};

// Agents that run by themselves and have nothing to start by hand.
const AUTOMATIC = new Set(['support', 'matcher', 'notifier']);
const CLAUDE_AGENTS = new Set(['creator', 'fixer']);

const PAUSE_RE = /(עצור|תעצור|עצירה|תפסיק|הפסק|השהה|תשהה)/;
const RESUME_RE = /(המשך|תמשיך|תחזור|חזור|הפעל|תפעיל|תתחיל|התחל)/;
// What counts as "do it now" for each agent. The cleaner only starts on an
// explicit "now" (or a bare "תנקה"), so "תנקה גם הרשמות ישנות" stays a request.
const NOW_BY_AGENT = {
  publisher: /(עכשיו|מיד|תפרסם|תשלח|תריץ|תעבוד)/,
  recruiter: /(עכשיו|מיד|תשלח|תריץ|תעבוד)/,
  tiktok: /(עכשיו|מיד|תכין|תשלח|תריץ|תעבוד)/,
  doctor: /(עכשיו|מיד|תבדוק|בדוק|תריץ|תעבוד)/,
  cleaner: /(עכשיו|מיד|^\s*(תנקה|נקה)\s*$)/,
};

export function parseDays(text) {
  const tokens = String(text || '').split(/[\s,.;!?]+/);
  const found = new Set();
  for (const raw of tokens) {
    for (const t of [raw, raw.replace(/^[ובלה]/, ''), raw.replace(/^[ו][בלה]/, '')]) {
      const i = DAY_LABELS.indexOf(t);
      if (i >= 0) found.add(i);
    }
  }
  return [...found].sort((a, b) => a - b);
}

/** Returns { config, reply, handled } for one message to one agent. */
export function applyAgentCommand(agentId, text, current = {}) {
  const rules = CONTROLLABLE[agentId];
  const t = String(text || '');
  const days = parseDays(t);
  const wantsPause = PAUSE_RE.test(t);
  const wantsResume = RESUME_RE.test(t);

  if (rules) {
    if (rules.days && days.length) {
      const config = { ...current, days, paused: false };
      return { config, handled: true, reply: `בסדר. מעכשיו אני פועל רק בימי ${days.map((d) => DAY_LABELS[d]).join(' ו')}.` };
    }
    if (rules.pause && wantsPause && !wantsResume) {
      return { config: { ...current, paused: true }, handled: true, reply: 'בסדר, עצרתי. כדי שאחזור לעבוד תכתוב לי "תמשיך".' };
    }
    if (rules.pause && wantsResume) {
      return { config: { ...current, paused: false }, handled: true, reply: 'חזרתי לעבודה ✅' };
    }
  }
  if (rules?.now && NOW_BY_AGENT[agentId]?.test(t)) {
    const say = { campaign: 'מפרסם עכשיו קמפיין בערוץ, תראה את זה כאן בצ׳אט בעוד רגע.', tiktok: 'מכין עכשיו פוסט לטיקטוק ושולח לך אותו בטלגרם.', promo: 'שולח עכשיו לקבוצה את ההודעה למפרסמים.', health: 'בודק את האתר עכשיו, אכתוב כאן מה מצאתי בעוד רגע.', cleanup: 'מנקה עכשיו, אכתוב כאן מה עשיתי.' };
    return { config: current, handled: true, runNow: rules.now, reply: say[rules.now] };
  }
  const agent = agentById(agentId);
  if (CLAUDE_AGENTS.has(agentId)) {
    return { config: current, handled: false, reply: 'אני סוכן Claude ורץ בזמנים קבועים' + (agentId === 'fixer' ? ' (כל יום ב-13:37)' : ' (פעם בחודש)') + '. רשמתי את הבקשה, ואטפל בה בריצה הבאה. אם אתה רוצה שזה יקרה עכשיו, כתוב את זה למנהל הצוות בשיחה עם Claude.' };
  }
  if (AUTOMATIC.has(agentId)) {
    return { config: current, handled: false, reply: 'אני עובד אוטומטית ולא צריך להפעיל אותי ידנית. אם צריך לשנות איך אני עובד, רשמתי את הבקשה למנהל הצוות.' };
  }
  return {
    config: current,
    handled: false,
    reply: rules
      ? 'קיבלתי, אבל לא הבנתי מה לשנות. אפשר לכתוב לי "תעצור", "תמשיך"' + (rules.days ? ' או "תעבוד רק בימי שני וחמישי"' : '') + '. רשמתי את ההודעה גם למנהל הצוות.'
      : `קיבלתי. את זה אני לא יכול לשנות לבד${agent?.role?.includes('Claude') ? '' : ''}, אז רשמתי את זה כבקשה למנהל הצוות (Claude) והוא יטפל בזה.`,
  };
}
