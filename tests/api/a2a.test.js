import { describe, it, expect } from 'vitest';
import { runTask, findAgentForTask, teamCard } from '../../shared/a2a.js';
import { AGENTS } from '../../shared/agentsRoster.js';

const who = (task) => task.lines.map((l) => `${l.agent}>${l.to}`);

describe('agent-to-agent tasks', () => {
  it('every agent publishes a card with at least one skill', () => {
    const card = teamCard();
    expect(card.agents).toHaveLength(AGENTS.length);
    for (const a of card.agents) expect(a.skills.length).toBeGreaterThan(0);
  });

  it('finds the agent whose skill fits', () => {
    expect(findAgentForTask('תכתוב יותר על איזון').agent.id).toBe('creator');
    expect(findAgentForTask('האתר לא עובד').agent.id).toBe('doctor');
    expect(findAgentForTask('שלום מה נשמע')).toBeNull();
  });

  it('the publisher hands a creative request to the creator, and it shows who spoke to whom', () => {
    const t = runTask('publisher', 'תכתוב יותר קמפיינים על איזון', {});
    expect(who(t)).toEqual(['owner>publisher', 'publisher>owner', 'publisher>creator', 'creator>publisher']);
    expect(t.lines[2].delegation).toBe(true);
    expect(t.lines.every((l) => l.taskId === t.taskId)).toBe(true);
  });

  it('a Claude agent that receives the delegation keeps it as a request', () => {
    const t = runTask('publisher', 'תכתוב יותר קמפיינים על איזון', {});
    const last = t.lines.at(-1);
    expect(last.agent).toBe('creator');
    expect(last.kind).toBe('request');
    expect(t.handled).toBe(false);
  });

  it('a server agent that can do the work takes the task and starts it', () => {
    const t = runTask('creator', 'תבדוק שהכל תקין באתר', {});
    expect(who(t)[0]).toBe('owner>creator');
    expect(t.lines.some((l) => l.to === 'doctor' && l.delegation)).toBe(true);
    expect(t.runNow).toEqual(['health']);
    expect(t.handled).toBe(true);
    expect(t.lines.at(-1).state).toBe('completed');
  });

  it('own commands are handled by the addressed agent without handing over', () => {
    const t = runTask('publisher', 'תעבוד רק בימי שני וחמישי', {});
    expect(who(t)).toEqual(['owner>publisher', 'publisher>owner']);
    expect(t.configUpdates.publisher.days).toEqual([1, 4]);
  });

  it('an explicit run-now goes to the agent addressed when nobody fits better', () => {
    const t = runTask('publisher', 'תפרסם עכשיו', {});
    expect(t.runNow).toEqual(['campaign']);
  });

  it('when nobody fits, the request is kept for the team manager', () => {
    const t = runTask('cleaner', 'שלום מה נשמע', {});
    expect(t.lines.at(-1).kind).toBe('request');
    expect(t.lines.at(-1).state).toBe('input-required');
  });
});

import { readFileSync } from 'node:fs';
describe('published agent card', () => {
  it('public/.well-known/agent-card.json matches the roster (regenerate it when skills change)', () => {
    const file = JSON.parse(readFileSync(new URL('../../public/.well-known/agent-card.json', import.meta.url), 'utf8'));
    expect(file).toEqual(JSON.parse(JSON.stringify(teamCard())));
  });
});
