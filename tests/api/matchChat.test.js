import { describe, it, expect, vi, beforeEach } from 'vitest';
process.env.SILENT_DAYS_OFF = '1'; // the mourning-day guard is tested in silentDay.test.js

// A tiny in-memory Firestore: parties/{id}, matchChats/{id} and matchChats/{id}/messages.
const store = { parties: {}, matchChats: {}, messages: {}, subs: [] };
const pushed = [];
let autoId = 0;
const snapOf = (data) => ({ exists: data !== undefined, data: () => data });
const chatRef = (id) => ({
  id,
  get: async () => snapOf(store.matchChats[id]),
  set: async (d) => { store.matchChats[id] = { ...(store.matchChats[id] || {}), ...d }; },
  delete: async () => { delete store.matchChats[id]; },
  collection: () => ({
    doc: () => ({ id: `m${++autoId}`, __chat: id }),
    where: (_f, _o, after) => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ docs: (store.messages[id] || []).filter((m) => m.at > after).sort((a, b) => a.at - b.at).map((m) => ({ id: m.id, data: () => m, ref: {} })) }),
        }),
      }),
    }),
    get: async () => ({ docs: (store.messages[id] || []).map((m) => ({ ref: { __del: () => { store.messages[id] = store.messages[id].filter((x) => x.id !== m.id); } } })) }),
  }),
});
const db = {
  collection: (name) => ({
    doc: (id) => (name === 'matchChats' ? chatRef(id) : { get: async () => snapOf(store.parties[id]) }),
    where: (f, _o, v) => ({ get: async () => ({ docs: (store.subs || []).filter((x) => x[f] === v).map((x) => ({ id: x.id, data: () => x })) }) }),
    get: async () => ({ docs: Object.keys(store.matchChats).map((id) => ({ id, data: () => store.matchChats[id], ref: chatRef(id) })) }),
  }),
  batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => ops.forEach((r) => r.__del?.()) }; },
  runTransaction: async (fn) => fn({
    get: async (r) => r.get(),
    set: (r, data) => {
      if (r.__chat) (store.messages[r.__chat] ||= []).push({ id: r.id, ...data });
      else r.set(data);
    },
  }),
};
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));
vi.mock('web-push', () => ({ default: { setVapidDetails() {}, sendNotification: async (sub, payload) => { pushed.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) }); } } }));
process.env.VAPID_PRIVATE_KEY = 'test-key';
process.env.TELEGRAM_BOT_TOKEN = 'T';
process.env.TELEGRAM_WEBHOOK_SECRET = 'S';

const handler = (await import('../../api/telegram-webhook.js')).default;
const call = async (body) => {
  const res = { headers: {}, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await handler({ method: 'POST', url: '/api/telegram-webhook?job=match-chat', query: { job: 'match-chat' }, headers: {}, body }, res);
  return res.body;
};

describe('anonymous match chat', () => {
  beforeEach(() => {
    store.parties = { P1: { balanceMatches: [{ isMatched: true, isCouple: false, malePhone: '0501111111', femalePhone: '0522222222' }] } };
    store.matchChats = {}; store.messages = {};
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T10:00:00Z'));
  });

  it('lets both sides talk, each seeing which messages are theirs, with no names or phones', async () => {
    const sent = await call({ action: 'send', phone: '0501111111', partyId: 'P1', text: 'שלום' });
    expect(sent.ok).toBe(true);
    expect(sent.messages[0]).toEqual({ id: expect.any(String), mine: true, text: 'שלום', at: expect.any(Number) });
    vi.setSystemTime(new Date('2026-10-06T10:00:05Z'));
    const other = await call({ action: 'list', phone: '052-2222222', partyId: 'P1' });
    expect(other.messages).toHaveLength(1);
    expect(other.messages[0].mine).toBe(false);
    expect(JSON.stringify(other)).not.toMatch(/0501111111|0522222222/);
  });

  it('refuses a phone that is not one side of a match', async () => {
    const r = await call({ action: 'list', phone: '0533333333', partyId: 'P1' });
    expect(r.ok).toBe(false);
  });

  it('refuses couples and unmatched pairs', async () => {
    store.parties.P1.balanceMatches[0].isCouple = true;
    expect((await call({ action: 'list', phone: '0501111111', partyId: 'P1' })).ok).toBe(false);
  });

  it('slows down rapid messages', async () => {
    await call({ action: 'send', phone: '0501111111', partyId: 'P1', text: 'א' });
    const fast = await call({ action: 'send', phone: '0501111111', partyId: 'P1', text: 'ב' });
    expect(fast.ok).toBe(false);
  });

  it('pushes a notification to the partner device only, and not again within 3 minutes', async () => {
    store.subs = [
      { id: 'a', phone: '0501111111', endpoint: 'https://push/sender', keys: {} },
      { id: 'b', phone: '0522222222', endpoint: 'https://push/partner', keys: {} },
    ];
    pushed.length = 0;
    await call({ action: 'send', phone: '0501111111', partyId: 'P1', text: 'שלום' });
    await vi.advanceTimersByTimeAsync(0);
    expect(pushed.map((x) => x.endpoint)).toEqual(['https://push/partner']);
    expect(pushed[0].payload.title).toContain('הודעה חדשה');
    expect(pushed[0].payload.body).not.toContain('שלום'); // anonymous: no message text in the notification
    vi.setSystemTime(new Date('2026-10-06T10:01:00Z'));
    await call({ action: 'send', phone: '0501111111', partyId: 'P1', text: 'עוד אחת' });
    await vi.advanceTimersByTimeAsync(0);
    expect(pushed).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-06T10:05:00Z'));
    await call({ action: 'send', phone: '0501111111', partyId: 'P1', text: 'ועוד' });
    await vi.advanceTimersByTimeAsync(0);
    expect(pushed).toHaveLength(2);
  });
});
