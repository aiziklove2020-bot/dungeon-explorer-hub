import { doc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { getPartySettings as getPartySettingsFromDataAccess, invalidateCache } from './dataAccess';
import { normalizeRetentionHours } from '../../shared/partyExpiry.js';

const PARTY_SETTINGS_COLLECTION = 'settings';
const PARTY_SETTINGS_DOC_ID = 'partySettings';

/** Read the current party settings (cached). Always resolves with `{ retentionHours }`. */
export const getPartySettings = getPartySettingsFromDataAccess;

/**
 * Persist party-retention settings to Firestore. The value is sanitised through
 * `normalizeRetentionHours` so a typo in the admin UI can't write a poison
 * value (e.g. negative / NaN / 10-year retention).
 *
 * The new value takes effect immediately for client-side cleanup
 * (`deleteExpiredParties`), but the public site keeps using the value baked
 * into `content.json` until the admin clicks "פרסם ל-Git" — same publish flow
 * as every other site setting.
 */
export const updatePartySettings = async (settings) => {
  const sanitized = {
    retentionHours: normalizeRetentionHours(settings?.retentionHours),
  };
  const settingsRef = doc(db, PARTY_SETTINGS_COLLECTION, PARTY_SETTINGS_DOC_ID);
  await setDoc(settingsRef, sanitized, { merge: true });
  await invalidateCache('partySettings');
  return sanitized;
};
