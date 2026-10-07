import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
process.env.SILENT_DAYS_OFF = '1'; // the mourning-day guard is tested in silentDay.test.js

let stored = null;
const sent = [];
const ref = { set: async (data) => { stored = { ...(stored || {}), ...data }; } };
const db = {
  collection: () => ({ doc: () => ref }),
  runTransaction: async (fn) => fn({ get: async () => ({ exists: stored !== null, data: () => stored }), set: (r, data) => { stored = { ...(stored || {}), ...data }; } }),
};
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));
process.env.TELEGRAM_BOT_TOKEN = 'T';
let telegramOk = true;
globalThis.fetch = vi.fn(async (url, init) => {
  sent.push({ url, body: JSON.parse(init.body) });
  return { status: 200, json: async () => (telegramOk ? { ok: true } : { ok: false, description: 'bad' }) };
});

const { sendGroupPromoIfDue } = await import('../../api/telegram-webhook.js');

// 2026-10-05 is a Monday, 2026-10-06 a Tuesday (noon in Israel = 09:00 UTC)
const at = (iso) => vi.setSystemTime(new Date(iso));

describe('weekly group promo message', () => {
  beforeEach(() => { stored = null; sent.length = 0; telegramOk = true; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('sends on a Monday, with the working advertiser-register link', async () => {
    at('2026-10-05T09:00:00Z');
    expect(await sendGroupPromoIfDue()).toEqual({ ok: true });
    expect(sent[0].url).toContain('/sendMessage');
    expect(sent[0].body.text).toContain('https://www.libralparty.net/advertiser-register');
    expect(sent[0].body.text).not.toContain('/advertiser/register');
  });

  it('does not send on other days', async () => {
    at('2026-10-06T09:00:00Z');
    expect((await sendGroupPromoIfDue()).skipped).toBe('not a promo day');
    expect(sent).toHaveLength(0);
  });

  it('does not send twice on the same day', async () => {
    at('2026-10-05T09:00:00Z');
    await sendGroupPromoIfDue();
    at('2026-10-05T09:05:00Z');
    expect((await sendGroupPromoIfDue()).skipped).toBe('already sent recently');
    expect(sent).toHaveLength(1);
  });

  it('gives the slot back when Telegram refuses', async () => {
    at('2026-10-05T09:00:00Z');
    telegramOk = false;
    expect((await sendGroupPromoIfDue()).ok).toBe(false);
    telegramOk = true;
    expect((await sendGroupPromoIfDue()).ok).toBe(true);
  });
});
