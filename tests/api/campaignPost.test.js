import { describe, it, expect, vi, beforeEach } from 'vitest';

let stored = null;
const sent = [];
const ref = { set: async (data, opts) => { stored = { ...(stored || {}), ...data }; } };
const db = {
  collection: () => ({ doc: () => ref }),
  runTransaction: async (fn) => fn({ get: async () => ({ exists: stored !== null, data: () => stored }), set: (r, data) => { stored = { ...(stored || {}), ...data }; } }),
};
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));

process.env.TELEGRAM_BOT_TOKEN = 'T';
process.env.TELEGRAM_PROMO_SECRET = 'S';
let telegramOk = true;
globalThis.fetch = vi.fn(async (url, init) => {
  sent.push({ url, body: JSON.parse(init.body) });
  return { status: 200, json: async () => (telegramOk ? { ok: true } : { ok: false, description: 'bad' }) };
});

const { default: handler } = await import('../../api/telegram-webhook.js');
const { TELEGRAM_CAMPAIGNS, TELEGRAM_CAMPAIGNS_VERSION } = await import('../../shared/telegramCampaigns.js');

const run = async (query) => {
  let body, status;
  const res = { setHeader: () => {}, status: (s) => ({ json: (b) => { status = s; body = b; } }) };
  await handler({ method: 'GET', query: { job: 'campaign', key: 'S', ...query }, headers: {} }, res);
  return { status, body };
};

describe('campaign posts to the channel', () => {
  beforeEach(() => { stored = null; sent.length = 0; telegramOk = true; });

  it('rejects a wrong key', async () => {
    expect((await run({ key: 'x', force: '1' })).status).toBe(401);
  });

  it('posts a photo with caption and rotates through the pool', async () => {
    const first = await run({ force: '1' });
    expect(first.body).toEqual({ ok: true, id: TELEGRAM_CAMPAIGNS[0].id });
    expect(sent[0].url).toContain('/sendPhoto');
    expect(sent[0].body).toMatchObject({ photo: TELEGRAM_CAMPAIGNS[0].image, caption: TELEGRAM_CAMPAIGNS[0].caption });
    const second = await run({ force: '1' });
    expect(second.body.id).toBe(TELEGRAM_CAMPAIGNS[1].id);
  });

  it('does not post twice within the gap unless forced', async () => {
    await run({ force: '1' });
    stored.lastSentAt = Date.now();
    const again = await run({ force: undefined });
    expect(again.body.ok).toBe(true);
    expect(sent).toHaveLength(1);
  });

  it('gives the slot back when Telegram refuses', async () => {
    telegramOk = false;
    const r = await run({ force: '1' });
    expect(r.body.ok).toBe(false);
    telegramOk = true;
    const retry = await run({ force: '1' });
    expect(retry.body.id).toBe(TELEGRAM_CAMPAIGNS[0].id);
  });

  it('a refreshed pool (new version) starts again from its first campaign', async () => {
    stored = { nextIndex: 5, lastSentAt: 0, version: 'older-month' };
    const r = await run({ force: '1' });
    expect(r.body.id).toBe(TELEGRAM_CAMPAIGNS[0].id);
    expect(stored.version).toBe(TELEGRAM_CAMPAIGNS_VERSION);
  });

  it('every campaign has an image URL under the site and a caption with a plain site link', () => {
    for (const c of TELEGRAM_CAMPAIGNS) {
      expect(c.image).toMatch(/^https:\/\/www\.libralparty\.net\/assets\/campaigns\/c\d+\.jpg$/);
      expect(c.caption).toMatch(/https:\/\/www\.libralparty\.net\/[a-z-]*(\n|$)/);
      expect(c.caption).not.toContain('utm_');
      expect(c.caption.length).toBeLessThanOrEqual(1024);
    }
  });
});
