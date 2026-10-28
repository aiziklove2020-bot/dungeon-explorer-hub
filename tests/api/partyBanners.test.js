import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_PARTY_BANNERS, normalizePartyBanners } from '../../shared/partyBanners.js';

// The home page's banner renderer, run as-is from public/index.html.
const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const grab = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
const code = [
  grab('  const INSTAGRAM_BANNER_HTML', '\n  function cardHtml'),
].join('\n');
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bannerHtml = new Function('escapeHtml', `${code}; return bannerHtml;`)(escapeHtml);

describe('banners between the parties', () => {
  it('shows the four current banners until the owner saves a list', () => {
    expect(normalizePartyBanners(undefined).map((b) => b.id)).toEqual(['whatsapp', 'instagram', 'facebook', 'app']);
    expect(normalizePartyBanners([])).toEqual([]);
  });

  it('keeps only safe links and drops picture banners without a picture', () => {
    const out = normalizePartyBanners([
      { id: 'x', kind: 'image', image: 'javascript:alert(1)', link: 'https://a.co' },
      { id: 'y', kind: 'image', image: 'https://res.cloudinary.com/p.jpg', link: 'javascript:alert(1)' },
    ]);
    expect(out).toEqual([{ id: 'y', kind: 'image', image: 'https://res.cloudinary.com/p.jpg', link: '', alt: '', enabled: true }]);
  });

  it('renders the unchanged defaults with their original markup and a changed one with the new picture and link', () => {
    const [wa, insta] = DEFAULT_PARTY_BANNERS;
    expect(bannerHtml(insta)).toContain('instagram-banner-v2.webp');
    expect(bannerHtml(wa)).toContain('chat.whatsapp.com/LHo4Spoy73b38mDI5XEcF7');
    expect(bannerHtml({ ...wa, link: 'https://chat.whatsapp.com/NEW' })).toContain('href="https://chat.whatsapp.com/NEW"');
    const changed = bannerHtml({ ...insta, image: 'https://res.cloudinary.com/new.jpg', link: 'https://t.me/libralparty' });
    expect(changed).toContain('src="https://res.cloudinary.com/new.jpg"');
    expect(changed).toContain('href="https://t.me/libralparty"');
  });
});
