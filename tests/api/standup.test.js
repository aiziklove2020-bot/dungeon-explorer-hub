import { describe, it, expect, vi } from 'vitest';
process.env.SILENT_DAYS_OFF = '1'; // the mourning-day guard is tested in silentDay.test.js

const lines = [];
const docs = {
  parties: [
    { id: 'a', data: () => ({ title: 'מסיבה קרובה', partyType: 'internal', date: new Date(Date.now() + 20 * 3600 * 1000).toISOString(), registrations: [{ registrationType: 'single-female-balance', phoneNumber: '1' }], balanceMatches: [] }) },
    { id: 'b', data: () => ({ title: 'ריקה', partyType: 'internal', date: new Date(Date.now() + 40 * 3600 * 1000).toISOString(), registrations: [] }) },
  ],
  subscriptionRequests: [{ id: 'r', data: () => ({ status: 'pending' }) }],
  pushSubscriptions: [{ id: 'p', data: () => ({}) }],
};
const db = {
  collection: (name) => ({
    get: async () => ({ docs: (docs[name] || []).map((d) => ({ id: d.id, data: d.data })), size: (docs[name] || []).length }),
    where: () => ({ get: async () => ({ docs: docs[name] || [], size: (docs[name] || []).length }) }),
    doc: () => ({ get: async () => ({ data: () => ({}) }) }),
  }),
  runTransaction: async (fn) => fn({
    get: async () => ({ exists: lines.length > 0, data: () => ({ messages: [...lines] }) }),
    set: (_r, data) => { lines.length = 0; lines.push(...data.messages); },
  }),
};
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));

const { runDailyStandup } = await import('../../api/telegram-webhook.js');

describe('daily team meeting', () => {
  it('has the agents report real numbers and hand work to each other', async () => {
    const out = await runDailyStandup({ health: { ok: true, problems: [] } });
    expect(out).toMatchObject({ ok: true, parties: 2, registrations: 1, pending: 1 });
    const texts = lines.map((l) => l.text).join('\n');
    expect(texts).toContain('2 מסיבות פעילות');
    expect(texts).toContain('בקשות הצטרפות כמנוי');
    expect(lines.some((l) => l.agent === 'matcher' && l.to === 'notifier')).toBe(true);
    expect(lines.at(-1).agent).toBe('fixer');
    expect(new Set(lines.map((l) => l.agent)).size).toBeGreaterThanOrEqual(8);
  });
});
