import { describe, it, expect, vi, beforeEach } from 'vitest';
process.env.SILENT_DAYS_OFF = '1'; // the mourning-day guard is tested in silentDay.test.js

let chat = null;
const ref = { };
const db = {
  collection: () => ({ doc: () => ref }),
  runTransaction: async (fn) => fn({ get: async () => ({ exists: chat !== null, data: () => chat }), set: (r, data) => { chat = data; } }),
};
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));

const { agentSay } = await import('../../api/telegram-webhook.js');
const { AGENTS, AGENT_CATEGORIES } = await import('../../shared/agentsRoster.js');

describe('team chat', () => {
  beforeEach(() => { chat = null; });

  it('adds a line with the agent\'s name and role', async () => {
    await agentSay('publisher', 'פרסמתי קמפיין');
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0]).toMatchObject({ agent: 'publisher', name: 'עומר', role: 'מפרסם', text: 'פרסמתי קמפיין' });
  });

  it('addresses another agent by name', async () => {
    await agentSay('doctor', 'יש בעיה', 'fixer');
    expect(chat.messages[0].text).toBe('@שון יש בעיה');
    expect(chat.messages[0].name).toBe('דין');
  });

  it('keeps only the last 150 lines', async () => {
    chat = { messages: Array.from({ length: 150 }, (_, i) => ({ text: String(i) })) };
    await agentSay('cleaner', 'חדש');
    expect(chat.messages).toHaveLength(150);
    expect(chat.messages[149].text).toBe('חדש');
    expect(chat.messages[0].text).toBe('1');
  });

  it('ignores an unknown agent', async () => {
    await agentSay('nobody', 'x');
    expect(chat).toBeNull();
  });

  it('the roster has 11 named agents, each in a known category', () => {
    expect(AGENTS).toHaveLength(11);
    const cats = AGENT_CATEGORIES.map((c) => c.id);
    for (const a of AGENTS) expect(cats).toContain(a.category);
    expect(new Set(AGENTS.map((a) => a.name)).size).toBe(11);
  });
});
