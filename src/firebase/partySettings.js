import { getPartySettings as getPartySettingsFromDataAccess, invalidateCache } from './dataAccess';
import { normalizeRetentionHours } from '../../shared/partyExpiry.js';
import { callAdminSettings } from '../utils/adminApi';

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
  await callAdminSettings('set-settings', { docId: PARTY_SETTINGS_DOC_ID, data: sanitized });
  await invalidateCache('partySettings');
  return sanitized;
};
