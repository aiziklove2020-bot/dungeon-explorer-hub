/**
 * Static shape + helpers for the registration form state.
 *
 * Kept as a plain JS module (no React) so it can be imported by both the
 * form shell and the validation / submit hooks, and tested in isolation.
 */

export const REG_TYPES = Object.freeze({
  SINGLE_MALE: 'single_male',
  SINGLE_FEMALE: 'single_female',
  FEMALE_DISCOUNT: 'female_discount',
  COUPLE: 'couple',
});

// Alternate IDs used by older content / matching channel payloads. Kept so
// the same form can render events that still ship these legacy type ids.
const FEMALE_TYPE_IDS = new Set([
  'single_female',
  'single-female-balance',
  'single-female-discount',
  'female_discount',
]);

export function isFemaleRegType(regType) {
  return FEMALE_TYPE_IDS.has(regType);
}

export function isCoupleRegType(regType) {
  return regType === REG_TYPES.COUPLE;
}

export function needsPickupAddress(formData) {
  return isFemaleRegType(formData.regType) && formData.arrivalMethod === 'pickup';
}

export const EMPTY_FORM_DATA = Object.freeze({
  regType: '',
  fullName: '',
  partnerName: '',
  phone: '',
  telegram: '',
  maleName: '',
  femaleName: '',
  malePhone: '',
  femalePhone: '',
  maleTelegram: '',
  femaleTelegram: '',
  arrivalMethod: 'independent',
  pickupAddress: '',
  selectedParties: [],
});

export function createInitialFormData(partyId) {
  return {
    ...EMPTY_FORM_DATA,
    selectedParties: partyId ? [partyId] : [],
  };
}

/**
 * Returns a fresh form-data object for when the user (re-)selects a
 * registration type. Keeps selectedParties if partyId was pre-bound.
 */
export function resetFormForType(type, partyId) {
  return {
    ...EMPTY_FORM_DATA,
    regType: type,
    selectedParties: partyId ? [partyId] : [],
  };
}

/**
 * Maps legacy / duplicate reg-type ids to the canonical ids the backend
 * expects when writing to Firestore party sub-collections.
 */
export const REGISTRATION_TYPE_BACKEND_MAP = Object.freeze({
  single_male: 'single-male-balance',
  'single-male-balance': 'single-male-balance',
  single_female: 'single-female-balance',
  'single-female-balance': 'single-female-balance',
  female_discount: 'single-female-discount',
  'single-female-discount': 'single-female-discount',
  couple: 'couple',
});

export const GENDER_MAP = Object.freeze({
  single_male: 'male',
  'single-male-balance': 'male',
  single_female: 'female',
  'single-female-balance': 'female',
  female_discount: 'female',
  'single-female-discount': 'female',
  couple: 'couple',
});

export function resolveGender(regType) {
  const mapped = GENDER_MAP[regType];
  if (mapped) return mapped;
  const lower = (regType || '').toLowerCase();
  if (lower.includes('female')) return 'female';
  if (lower.includes('male')) return 'male';
  return 'male';
}
