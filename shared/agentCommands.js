// Plain-Hebrew commands the owner can type to an agent in the admin team chat
// ("עומר, תפרסם רק בימי שני וחמישי", "ליאור, תעצור", "תמשיך"). Only a few
// things are controllable by the server itself; everything else is recorded as
// a request for the team manager (Claude).
import { agentById } from './agentsRoster.js';

export const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// What each server-run agent accepts.
export const CONTROLLABLE = {
  publisher: { days: true, pause: true },
  recruiter: { days: true, pause: true },
  secretary: { pause: true },
};

const PAUSE_RE = /(עצור|תעצור|עצירה|תפסיק|הפסק|השהה|תשהה)/;
const RESUME_RE = /(המשך|תמשיך|תחזור|חזור|הפעל|תפעיל|תתחיל|התחל)/;

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
  const agent = agentById(agentId);
  return {
    config: current,
    handled: false,
    reply: rules
      ? 'קיבלתי, אבל לא הבנתי מה לשנות. אפשר לכתוב לי "תעצור", "תמשיך"' + (rules.days ? ' או "תעבוד רק בימי שני וחמישי"' : '') + '. רשמתי את ההודעה גם למנהל הצוות.'
      : `קיבלתי. את זה אני לא יכול לשנות לבד${agent?.role?.includes('Claude') ? '' : ''}, אז רשמתי את זה כבקשה למנהל הצוות (Claude) והוא יטפל בזה.`,
  };
}
