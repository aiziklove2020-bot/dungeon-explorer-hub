// The banners shown between the parties on the home page (one after every 2
// parties on phones, every 3 on desktop, taking turns). Managed from the admin
// panel ("באנרים באתר"), stored in settings/siteConfig.partyBanners. Until the
// owner saves a list there, the site shows these defaults.
//
// kind "whatsapp" is the built-in WhatsApp group banner (only its link changes);
// kind "image" is a picture with a link.
export const DEFAULT_PARTY_BANNERS = [
  { id: 'whatsapp', kind: 'whatsapp', link: 'https://chat.whatsapp.com/LHo4Spoy73b38mDI5XEcF7', alt: 'קבוצת פרסומי המסיבות בוואטסאפ', enabled: true },
  { id: 'instagram', kind: 'image', image: '/assets/design/instagram-banner-v2.jpg', link: 'https://www.instagram.com/liberl_party/', alt: 'הצטרפו אלינו באינסטגרם', enabled: true },
  { id: 'facebook', kind: 'image', image: '/assets/design/facebook-banner.jpg', link: 'https://www.facebook.com/share/g/1D7ng47o28/', alt: 'הצטרפו לקבוצת הפייסבוק שלנו', enabled: true },
  { id: 'app', kind: 'image', image: '/assets/design/app-banner.jpg', link: '/downloads/libral-party.apk', alt: 'האפליקציה של LIBRAL-PARTY לאנדרואיד', enabled: true },
];

const safeLink = (v) => {
  const s = String(v || '').trim();
  return /^(https:\/\/|\/)/.test(s) ? s : '';
};

/** Cleans a stored list (or falls back to the defaults when nothing was saved yet). */
export function normalizePartyBanners(stored) {
  if (!Array.isArray(stored)) return DEFAULT_PARTY_BANNERS.map((b) => ({ ...b }));
  return stored
    .filter((b) => b && typeof b === 'object')
    .map((b, i) => ({
      id: String(b.id || `b${i}`),
      kind: b.kind === 'whatsapp' ? 'whatsapp' : 'image',
      image: safeLink(b.image),
      link: safeLink(b.link),
      alt: String(b.alt || '').slice(0, 200),
      enabled: b.enabled !== false,
    }))
    .filter((b) => b.kind === 'whatsapp' || b.image);
}
