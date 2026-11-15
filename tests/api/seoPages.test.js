import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler, { buildPartyHtml, buildSitemap, isLive } from '../../api/seo.js';

const TEMPLATE = '<!doctype html><html><head><title>פרטי אירוע | LIBRAL PARTY</title></head><body><main><div id="eventDetail"></div></main></body></html>';
const party = {
  id: 'abc123', title: 'הליין של אבי סווינגרס <b>x</b>', day: 'יום שלישי', date: '2026-11-16T22:00:00Z', time: '22:00',
  description: 'ערב ליברלי עם בר חופשי', whatsappNumber: '0559364370', imageURL: 'https://img.example/a.png', status: 'active', expiration: '2999-01-01T00:00:00Z',
};

describe('party pages for search engines', () => {
  it('builds a crawlable page: title, description, canonical, Event data, base href, escaped text', () => {
    const html = buildPartyHtml(TEMPLATE, party);
    expect(html).toContain('<title>הליין של אבי סווינגרס &lt;b&gt;x&lt;/b&gt; | אבי סווינגרס');
    expect(html).toContain('<link rel="canonical" href="https://www.libralparty.net/party/abc123">');
    expect(html).toContain('<base href="/">');
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain('"startDate":"2026-11-17"'); // Israel date of 22:00Z on the 16th
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('window.__LP_PARTY_ID="abc123"');
    expect(html).toContain('wa.me/972559364370');
  });

  it('only live parties count: active and not expired', () => {
    expect(isLive(party)).toBe(true);
    expect(isLive({ ...party, status: 'inactive' })).toBe(false);
    expect(isLive({ ...party, expiration: '2020-01-01T00:00:00Z' })).toBe(false);
  });

  it('the sitemap lists the site pages and every live party, and skips the expired ones', () => {
    const xml = buildSitemap([party, { ...party, id: 'old', expiration: '2020-01-01T00:00:00Z' }]);
    expect(xml).toContain('<loc>https://www.libralparty.net/party/abc123</loc>');
    expect(xml).not.toContain('/party/old');
    expect(xml).toContain('<loc>https://www.libralparty.net/events</loc>');
  });
});

describe('seo handler', () => {
  const doc = (p) => ({ name: `projects/x/documents/parties/${p.id}`, fields: Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'id').map(([k, v]) => [k, /Z$/.test(String(v)) && k !== 'description' ? { timestampValue: v } : { stringValue: v }])) });
  const run = async (query) => {
    const out = { headers: {} };
    const res = { setHeader: (k, v) => { out.headers[k] = v; }, status: (s) => { out.status = s; return res; }, send: (b) => { out.body = b; return res; }, end: () => res };
    await handler({ query }, res);
    return out;
  };
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.endsWith('/event.html')) return { ok: true, text: async () => TEMPLATE };
      if (u.includes('/parties/abc123')) return { ok: true, json: async () => doc(party) };
      if (u.includes('/parties/gone')) return { ok: false, json: async () => ({}) };
      if (u.includes('/parties?')) return { ok: true, json: async () => ({ documents: [doc(party)] }) };
      return { ok: false, json: async () => ({}), text: async () => '' };
    });
  });

  it('serves a live party page', async () => {
    const r = await run({ type: 'party', id: 'abc123' });
    expect(r.status).toBe(200);
    expect(r.body).toContain('"@type":"Event"');
  });
  it('sends an unknown or finished party back to the events list', async () => {
    const r = await run({ type: 'party', id: 'gone' });
    expect(r.status).toBe(302);
    expect(r.headers.Location).toBe('/events');
  });
  it('serves the sitemap as XML', async () => {
    const r = await run({ type: 'sitemap' });
    expect(r.headers['Content-Type']).toContain('application/xml');
    expect(r.body).toContain('/party/abc123');
  });
});
