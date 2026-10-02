// Agent-to-agent (A2A style) messaging for the team.
// Every agent publishes a card with its skills (id, label, tags, examples).
// A task is a conversation with an id and a state (submitted -> working ->
// completed | input-required); each message says who sent it and to whom.
// When an agent is asked for something outside its skills it finds the agent
// whose skills fit best and hands the task over, instead of just recording it.
import { AGENTS, agentById } from './agentsRoster.js';
import { applyAgentCommand } from './agentCommands.js';

export const agentCard = (a) => ({
  id: a.id,
  name: a.name,
  description: `${a.role}. ${a.desc}`,
  skills: (a.skills || []).map((s) => ({ id: s.id, name: s.label, tags: s.tags, examples: s.examples || [] })),
  schedule: a.schedule,
});

export const teamCard = () => ({
  name: 'צוות הסוכנים של LIBRAL PARTY',
  description: 'הסוכנים של האתר והכישורים שלהם. סוכן שמקבל בקשה מחוץ לכישורים שלו מעביר אותה לסוכן המתאים.',
  protocol: 'a2a-style',
  version: '1.0',
  agents: AGENTS.map(agentCard),
});

export function skillScore(agent, text) {
  const t = String(text || '');
  let score = 0;
  let best = null;
  for (const s of agent?.skills || []) {
    const hits = s.tags.filter((tag) => t.includes(tag)).length;
    if (hits) { score += hits; if (!best || hits > best.hits) best = { skill: s, hits }; }
  }
  return { score, skill: best?.skill || null };
}

/** The agent (other than `exceptIds`) whose skills fit the request best. */
export function findAgentForTask(text, exceptIds = []) {
  let best = null;
  for (const a of AGENTS) {
    if (exceptIds.includes(a.id)) continue;
    const { score, skill } = skillScore(a, text);
    if (score > (best?.score || 0)) best = { agent: a, score, skill };
  }
  return best;
}

let counter = 0;
const newTaskId = (now) => `t${now.toString(36)}${(counter++ % 36).toString(36)}`;

/**
 * Runs one owner message through the team. Returns the chat lines (with from,
 * to, taskId, state), config changes, and jobs to start now.
 */
export function runTask(agentId, text, configs = {}, now = Date.now()) {
  const taskId = newTaskId(now);
  const lines = [];
  const configUpdates = {};
  const runNow = [];
  let ts = now;
  const say = (from, to, msg, extra = {}) => {
    const a = from === 'owner' ? { name: 'אתה', role: 'מנהל' } : agentById(from);
    lines.push({ agent: from, name: a.name, role: a.role, text: msg, ts: ts++, to, taskId, ...extra });
  };

  const first = agentById(agentId);
  say('owner', agentId, `@${first.name} ${text}`);

  const visited = [agentId];
  let current = first;
  let handledBy = null;
  let kindRequest = false;
  for (let hop = 0; hop < 3; hop++) {
    const cfg = configs[current.id] || {};
    let out = applyAgentCommand(current.id, text, cfg);
    const own = skillScore(current, text).score;
    const other = findAgentForTask(text, visited);
    // An explicit "run now" is only taken literally when no other agent is clearly better at the request.
    const betterElsewhere = other && other.score >= 2 && other.score > own;
    if (out.handled && out.runNow && betterElsewhere) out = { ...out, handled: false };

    if (out.handled) {
      configUpdates[current.id] = out.config;
      if (out.runNow) runNow.push(out.runNow);
      say(current.id, hop === 0 ? 'owner' : visited[visited.length - 2], out.reply, { state: 'completed' });
      handledBy = current.id;
      break;
    }
    if (other && other.score > own && hop < 2) {
      const target = other.agent;
      say(current.id, hop === 0 ? 'owner' : visited[visited.length - 2], `זה יותר בתחום של ${target.name} (${target.role}), אני מעביר לו.`, { state: 'working' });
      say(current.id, target.id, `${target.name}, ביקשו ממני: "${text}". הכישור שלך: ${other.skill?.label || target.role}. אפשר לטפל?`, { state: 'working', delegation: true });
      visited.push(target.id);
      current = target;
      continue;
    }
    // Nobody fits: the last agent explains and the request is kept for the team manager (Claude).
    say(current.id, hop === 0 ? 'owner' : visited[visited.length - 2], out.reply, { state: 'input-required', kind: 'request' });
    kindRequest = true;
    break;
  }
  return { taskId, lines, configUpdates, runNow, handled: Boolean(handledBy), kindRequest, reply: lines[lines.length - 1]?.text || '' };
}
