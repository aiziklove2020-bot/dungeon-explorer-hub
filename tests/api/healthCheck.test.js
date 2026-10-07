import { describe, it, expect, vi, beforeEach } from 'vitest';
process.env.SILENT_DAYS_OFF = '1'; // the mourning-day guard is tested in silentDay.test.js

const docs = {};
const writes = [];
const mkDoc = (path) => ({
  get: async () => ({ exists: path in docs, data: () => docs[path] }),
  set: async (data) => { docs[path] = { ...(docs[path] || {}), ...data }; writes.push([path, data]); },
  collection: (name) => ({ doc: (id) => mkDoc(`${path}/${name}/${id}`) }),
});
const db = { collection: (name) => ({ doc: (id) => mkDoc(`${name}/${id}`) }) };
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));
process.env.TELEGRAM_BOT_TOKEN = 'T';

let pageStatus = {};
let botOk = true;
const sentToAdmin = [];
globalThis.fetch = vi.fn(async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://www.libralparty.net')) {
    const path = u.replace('https://www.libralparty.net', '');
    return { status: pageStatus[path] ?? 200, text: async () => '<html></html>' };
  }
  if (u.includes('/getMe')) return { json: async () => ({ ok: botOk }) };
  if (u.includes('/sendMessage')) { sentToAdmin.push(JSON.parse(init.body)); return { json: async () => ({ ok: true }) }; }
  return { status: 404, json: async () => ({}) };
});

const { runHealthCheck } = await import('../../api/telegram-webhook.js');

describe('daily health check', () => {
  beforeEach(() => {
    for (const k of Object.keys(docs)) delete docs[k];
    docs['settings/private/supportChat/config'] = { botToken: 'ADMINBOT', chatId: '42' };
    docs['settings/telegramCampaigns'] = { lastSentAt: Date.now() };
    pageStatus = {}; botOk = true; sentToAdmin.length = 0; writes.length = 0;
  });

  it('is silent and stores ok when everything works', async () => {
    const r = await runHealthCheck();
    expect(r).toEqual({ ok: true, problems: [] });
    expect(sentToAdmin).toHaveLength(0);
    expect(docs['settings/healthCheck'].ok).toBe(true);
  });

  it('alerts the admin with a plain list when a page is broken', async () => {
    pageStatus['/membership'] = 500;
    const r = await runHealthCheck();
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain('/membership');
    expect(sentToAdmin[0].chat_id).toBe('42');
    expect(sentToAdmin[0].text).toContain('/membership');
  });

  it('reports a dead Telegram bot and a stale campaign feed', async () => {
    botOk = false;
    docs['settings/telegramCampaigns'] = { lastSentAt: Date.now() - 12 * 24 * 3600 * 1000 };
    const r = await runHealthCheck({ alert: false });
    expect(r.problems.join(' ')).toContain('בוט הטלגרם');
    expect(r.problems.join(' ')).toContain('קמפיין');
    expect(sentToAdmin).toHaveLength(0);
  });
});
