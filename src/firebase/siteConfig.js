import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const SETTINGS_COLLECTION = 'settings';
const SITE_CONFIG_DOC_ID = 'siteConfig';

const ref = () => doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC_ID);

const DEFAULT_CONFIG = {
  logoUrl: '',
  heroImageUrl: '',
  banners: [],
  popup: { enabled: false, title: '', text: '', imageUrl: '', linkUrl: '', linkText: '' },
};

export const getSiteConfig = async () => {
  const snap = await getDoc(ref());
  if (!snap.exists()) return DEFAULT_CONFIG;
  const data = snap.data() || {};
  return {
    logoUrl: data.logoUrl || '',
    heroImageUrl: data.heroImageUrl || '',
    banners: Array.isArray(data.banners) ? data.banners : [],
    popup: { ...DEFAULT_CONFIG.popup, ...(data.popup || {}) },
  };
};

export const updateLogoUrl = async (logoUrl) => {
  await setDoc(ref(), { logoUrl }, { merge: true });
};

export const updateHeroImageUrl = async (heroImageUrl) => {
  await setDoc(ref(), { heroImageUrl }, { merge: true });
};

export const updateBanners = async (banners) => {
  await setDoc(ref(), { banners }, { merge: true });
};

export const updatePopup = async (popup) => {
  await setDoc(ref(), { popup }, { merge: true });
};
