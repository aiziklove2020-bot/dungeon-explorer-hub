import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { callAdminSettings } from '../utils/adminApi';
import { normalizePartyBanners } from '../../shared/partyBanners.js';

const SITE_CONFIG_DOC_ID = 'siteConfig';

const ref = () => doc(db, 'settings', SITE_CONFIG_DOC_ID);

// Site closure switch, read by public/assets/memorial-block.js on every public page.
// Always read live (no cache): the admin must see the real state before flipping it.
export const getSiteClosure = async () => {
  const snap = await getDoc(ref());
  const data = snap.exists() ? snap.data() || {} : {};
  return { closed: data.siteClosed === true, text: typeof data.siteClosedText === 'string' ? data.siteClosedText : '' };
};

export const setSiteClosure = async (closed, text = '') => {
  await callAdminSettings('set-settings', {
    docId: SITE_CONFIG_DOC_ID,
    data: { siteClosed: !!closed, siteClosedText: String(text || '').slice(0, 500) },
  });
};

// The banners between the parties on the home page (shared/partyBanners.js).
export const getPartyBanners = async () => {
  const snap = await getDoc(ref());
  return normalizePartyBanners(snap.exists() ? snap.data()?.partyBanners : undefined);
};

export const savePartyBanners = async (banners) => {
  const clean = normalizePartyBanners(banners);
  await callAdminSettings('set-settings', { docId: SITE_CONFIG_DOC_ID, data: { partyBanners: clean } });
  return clean;
};
