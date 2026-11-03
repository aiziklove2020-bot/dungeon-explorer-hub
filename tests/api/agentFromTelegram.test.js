import { describe, it, expect, vi, beforeEach } from 'vitest';
process.env.SILENT_DAYS_OFF = '1';
process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{}';
process.env.TELEGRAM_PROMO_SECRET = 'S';

const docs = {};
const key = (path) => path.join('/');
const docRef = (path) => ({
  get: async () => ({ exists: key(path) in docs, data: () => docs[key(path)] }),
  set: async (d, o) => { docs[key(path)] = o?.merge ? { ...(docs[key(path)] || {}), ...d } : d; },
  collection: (c) => ({ doc: (id) => docRef([...path, c, id]) }),
});
const db = {
  collection: (c) => ({ doc: (id) => docRef([c, id]) }),
  runTransaction: async (fn) => fn({ get: (ref) => ref.get(), set: (ref, d, o) => ref.set(d, o) }),
};
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));

const calls = [];
globalThis.fetch = vi.fn(async (url, init) => {
  const u = String(url);
  calls.push({ url: u, body: init?.body ? JSON.parse(init.body) : null });
  return { json: async () => ({ ok: true }), status: 200 };
});

const { default: handler, parseAgentMessage } = await import('../../api/telegram-webhook.js');

const send = async (text, from = { id: 5508757120 }) => {
  let status;
  const res = { setHeader: () => {}, status: (s) => ({ json: () => { status = s; }, end: () => { status = s; } }) };
  await handler({ method: 'POST', headers: {}, query: {}, url: '/api/telegram-webhook', body: { message: { message_id: 5, text, from, chat: { id: -100, type: 'supergroup' } } } }, res);
  return status;
};

describe('writing to the agents from the support group', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of Object.keys(docs)) delete docs[k];
    docs['settings/private/supportChat/config'] = { botToken: 'T', chatId: '-100' };
  });

  it('parses only explicit addressing', () => {
    expect(parseAgentMessage('@עומר תפרסם עכשיו')).toMatchObject({ text: 'תפרסם עכשיו' });
    expect(parseAgentMessage('עומר, תעצור').agent.id).toBe('publisher');
    expect(parseAgentMessage('אדם וחוה ישראל')).toBeNull();
    expect(parseAgentMessage('@מישהו תעצור')).toBeNull();
  });

  it('the owner can pause the publisher, gets a reply, and the chat log is kept', async () => {
    await send('@עומר תעצור');
    expect(docs['settings/agentConfig'].publisher.paused).toBe(true);
    const reply = calls.find((c) => c.url.includes('sendMessage'));
    expect(reply.body.text).toContain('עומר:');
    expect(reply.body.chat_id).toBe('-100');
    expect(docs['settings/agentChat'].messages.length).toBeGreaterThan(0);
  });

  it('"do it now" starts the job on the server', async () => {
    await send('@עומר תפרסם עכשיו');
    expect(calls.some((c) => c.url.includes('job=campaign&force=1'))).toBe(true);
  });

  it('anyone else (even a group admin) is ignored without any reply or change', async () => {
    await send('@עומר תעצור', { id: 123 });
    expect(docs['settings/agentConfig']).toBeUndefined();
    expect(calls.some((c) => c.url.includes('sendMessage'))).toBe(false);
  });

  it('with an allow-list only those user ids are obeyed', async () => {
    docs['settings/agentChatAccess'] = { userIds: [99] };
    await send('@עומר תעצור', { id: 5508757120 });
    expect(docs['settings/agentConfig']).toBeUndefined();
    await send('@עומר תעצור', { id: 99 });
    expect(docs['settings/agentConfig'].publisher.paused).toBe(true);
  });

  it('messages from other chats are not commands', async () => {
    docs['settings/private/supportChat/config'] = { botToken: 'T', chatId: '-999' };
    await send('@עומר תעצור');
    expect(docs['settings/agentConfig']).toBeUndefined();
  });
});
