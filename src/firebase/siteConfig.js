import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { callAdminSettings } from '../utils/adminApi';

const SETTINGS_COLLECTION = 'settings';
const SITE_CONFIG_DOC_ID = 'siteConfig';

const ref = () => doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC_ID);

const DEFAULT_CONFIG = {
  logoUrl: '',
  heroImageUrl: '',
  banners: [],
  popup: { enabled: false, title: '', text: '', imageUrl: '', linkUrl: '', linkText: '' },
};

// The "/" route reads this in its SSR loader (so the hero image is correct on
// first paint, no flash), which means every single page request would
// otherwise pay a live Firestore round-trip before the HTML can start
// streaming. Module-scope cache with a short TTL: near-zero staleness for
// admin edits, but repeat requests hitting the same warm serverless instance
// reuse the value instead of re-querying Firestore every time.
const CACHE_TTL_MS = 30_000;
let cached = null;
let cachedAtMs = 0;

export const getSiteConfig = async () => {
  const now = Date.now();
  if (cached && now - cachedAtMs < CACHE_TTL_MS) return cached;

  const snap = await getDoc(ref());
  const data = snap.exists() ? snap.data() || {} : {};
  const result = {
    logoUrl: data.logoUrl || '',
    heroImageUrl: data.heroImageUrl || '',
    banners: Array.isArray(data.banners) ? data.banners : [],
    popup: { ...DEFAULT_CONFIG.popup, ...(data.popup || {}) },
  };
  cached = result;
  cachedAtMs = now;
  return result;
};

const invalidateCache = () => {
  cached = null;
};

export const updateLogoUrl = async (logoUrl) => {
  await callAdminSettings('set-settings', { docId: SITE_CONFIG_DOC_ID, data: { logoUrl } });
  invalidateCache();
};

export const updateHeroImageUrl = async (heroImageUrl) => {
  await callAdminSettings('set-settings', { docId: SITE_CONFIG_DOC_ID, data: { heroImageUrl } });
  invalidateCache();
};

export const updateBanners = async (banners) => {
  await callAdminSettings('set-settings', { docId: SITE_CONFIG_DOC_ID, data: { banners } });
  invalidateCache();
};

export const updatePopup = async (popup) => {
  await callAdminSettings('set-settings', { docId: SITE_CONFIG_DOC_ID, data: { popup } });
  invalidateCache();
};
