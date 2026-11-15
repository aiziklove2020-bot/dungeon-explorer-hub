/**
 * Search-engine pages for the parties, served by one function (Hobby plan: few functions, no extra crons).
 *   /party/<id>   -> /api/seo?type=party&id=<id>   a crawlable page per party (title, description, Event data)
 *   /sitemap.xml  -> /api/seo?type=sitemap          the site's pages plus every active party
 * Data comes from the public Firestore REST API (parties are public); nothing here needs a secret.
 */
const SITE = 'https://www.libralparty.net';
const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/tbdsm-5acca/databases/(default)/documents';
const STATIC_PAGES = [
  ['/', 'daily', '1.0'], ['/events', 'daily', '0.9'], ['/calendar', 'daily', '0.8'], ['/about', 'monthly', '0.7'],
  ['/liberal-suite', 'monthly', '0.7'], ['/faq', 'monthly', '0.6'], ['/community', 'monthly', '0.6'], ['/gallery', 'monthly', '0.5'],
  ['/contact', 'monthly', '0.5'], ['/swingers-parties', 'weekly', '0.9'], ['/bdsm-parties', 'weekly', '0.9'],
  ['/privacy', 'yearly', '0.2'], ['/terms', 'yearly', '0.2'],
];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

function fromFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    const [type, val] = Object.entries(v)[0] || [];
    out[k] = type === 'integerValue' ? Number(val) : val;
  }
  return out;
}
const toParty = (doc) => ({ id: doc.name.split('/').pop(), ...fromFields(doc.fields) });

// A party is shown while it is active and its expiration has not passed.
export function isLive(p, now = Date.now()) {
  if (!p || p.status === 'inactive') return false;
  const exp = p.expiration ? Date.parse(p.expiration) : NaN;
  return !(Number.isFinite(exp) && exp < now);
}

const dateParts = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); // YYYY-MM-DD
  const he = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long' }).format(d);
  return { iso: f, he };
};

const waHref = (p) => {
  const digits = String(p.whatsappNumber || '0559364370').replace(/\D/g, '').replace(/^0/, '972');
  return `https://wa.me/${digits}?text=${encodeURIComponent(`היי, אני רוצה להירשם למסיבה: ${p.title || ''}`)}`;
};

export function buildPartyHtml(template, p) {
  const title = String(p.title || p.name || 'מסיבה').trim();
  const dp = dateParts(p.date);
  const when = [p.day, dp?.he].filter(Boolean).join(', ');
  const url = `${SITE}/party/${encodeURIComponent(p.id)}`;
  const plain = String(p.description || '').replace(/\s+/g, ' ').trim();
  const desc = `${title} – המועדון של אבי סווינגרס${when ? `, ${when}` : ''}. ${plain.slice(0, 110)}${plain.length > 110 ? '…' : ''} ההרשמה בוואטסאפ מול אבי.`.replace(/\s+/g, ' ');
  const pageTitle = `${title} | אבי סווינגרס${dp ? ` – ${dp.he}` : ''} - LIBRAL PARTY`;
  const event = {
    '@context': 'https://schema.org', '@type': 'Event', name: title, description: plain.slice(0, 500) || desc,
    ...(dp ? { startDate: dp.iso } : {}), eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: 'המועדון של אבי סווינגרס', address: { '@type': 'PostalAddress', addressCountry: 'IL' } },
    organizer: { '@type': 'Organization', name: 'אבי סווינגרס – LIBRAL PARTY', url: SITE },
    ...(p.imageURL ? { image: [p.imageURL] } : {}), url,
  };
  const head = `<base href="/"><link rel="canonical" href="${esc(url)}"><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">${p.imageURL ? `<meta property="og:image" content="${esc(p.imageURL)}">` : ''}
<script type="application/ld+json">${jsonLd(event)}</script>`;
  const body = `<h1>${esc(title)}</h1><p>${esc(when)}${p.time ? ` · ${esc(p.time)}` : ''}</p><p>${esc(plain)}</p><p><a class="btn gold" href="${esc(waHref(p))}">הרשמה בוואטסאפ</a></p>`;
  let html = String(template);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(pageTitle)}</title>`);
  html = html.replace('</head>', `${head}\n</head>`);
  // The page's own script fills #eventDetail again once it loads; this copy is for crawlers.
  html = html.replace(/(<div[^>]*id="eventDetail"[^>]*>)(<p class="meta">[^<]*<\/p>)?/, `$1${body}`);
  html = html.replace('<body>', `<body><script>window.__LP_PARTY_ID=${JSON.stringify(String(p.id))};</script>`);
  return html;
}

export function buildSitemap(parties, now = Date.now()) {
  const urls = STATIC_PAGES.map(([path, freq, prio]) => `  <url><loc>${SITE}${path === '/' ? '/' : path}</loc><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`);
  for (const p of parties.filter((x) => isLive(x, now))) {
    const last = p.createdAt ? `<lastmod>${esc(String(p.createdAt).slice(0, 10))}</lastmod>` : '';
    urls.push(`  <url><loc>${SITE}/party/${encodeURIComponent(p.id)}</loc>${last}<changefreq>daily</changefreq><priority>0.8</priority></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export default async function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  try {
    if (q.type === 'sitemap') {
      const r = await fetch(`${FIRESTORE}/parties?pageSize=100`);
      const data = await r.json();
      const parties = r.ok ? (data.documents || []).map(toParty) : [];
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(buildSitemap(parties));
    }
    const id = String(q.id || '').replace(/[^\w-]/g, '');
    const r = id ? await fetch(`${FIRESTORE}/parties/${encodeURIComponent(id)}`) : null;
    const party = r?.ok ? toParty(await r.json()) : null;
    if (!party || !isLive(party)) {
      res.setHeader('Cache-Control', 'public, s-maxage=600');
      res.setHeader('Location', '/events');
      return res.status(302).end();
    }
    const tpl = await (await fetch(`${SITE}/event.html`)).text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).send(buildPartyHtml(tpl, party));
  } catch (err) {
    console.error('seo:', err?.message || err);
    res.setHeader('Location', '/events');
    return res.status(302).end();
  }
}
