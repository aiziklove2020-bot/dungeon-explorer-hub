import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { callAdminSettings } from '../utils/adminApi';
import { normalizePartyBanners } from '../../shared/partyBanners.js';
import { siteTexts, SITE_TEXT_MAX } from '../../shared/siteTexts.js';

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

// The About / Contact page text (shared/siteTexts.js).
export const getSiteTexts = async () => {
  const snap = await getDoc(ref());
  return siteTexts(snap.exists() ? snap.data() : {});
};

export const saveSiteText = async (field, text) => {
  if (!['aboutText', 'contactText'].includes(field)) throw new Error('Unknown text');
  await callAdminSettings('set-settings', { docId: SITE_CONFIG_DOC_ID, data: { [field]: String(text || '').trim().slice(0, SITE_TEXT_MAX) } });
};
