import { cleanPhone, isValidIsraeliPhone } from '../../utils/phone';
import { isCoupleRegType, needsPickupAddress } from './formTypes';

/**
 * Telegram's own username rules: 5-32 chars, letters/digits/underscores,
 * must start with a letter. A real registration (see the "Dave Barez"
 * incident) had someone type their Telegram *display name* — which can
 * contain spaces and isn't a resolvable identifier — into this field
 * instead of their actual @username. The bot silently could never reach
 * them since a display name isn't looked up anywhere. Rejecting anything
 * that isn't shaped like a real username catches this at entry time
 * instead of after the admin finds a "phantom" registrant.
 */
export function isValidTelegramUsername(value) {
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(String(value || '').trim().replace(/^@+/, ''));
}

/**
 * Returns a map of field-name → true for every invalid field.
 * Pure — depends only on `formData`, safe to call from render.
 */
export function getValidationErrors(formData) {
  const errors = {};

  if (isCoupleRegType(formData.regType)) {
    if (!formData.maleName?.trim()) errors.maleName = true;
    if (!isValidIsraeliPhone(formData.malePhone)) errors.malePhone = true;
    if (!formData.femaleName?.trim()) errors.femaleName = true;
    if (!isValidIsraeliPhone(formData.femalePhone)) errors.femalePhone = true;

    if (
      isValidIsraeliPhone(formData.malePhone) &&
      isValidIsraeliPhone(formData.femalePhone) &&
      cleanPhone(formData.malePhone) === cleanPhone(formData.femalePhone)
    ) {
      errors.coupleSamePhone = true;
    }
  } else {
    if (!formData.fullName?.trim()) errors.fullName = true;
    if (!isValidIsraeliPhone(formData.phone)) errors.phone = true;
    if (!isValidTelegramUsername(formData.telegram)) errors.telegram = true;
  }

  if (!formData.selectedParties || formData.selectedParties.length === 0) {
    errors.parties = true;
  }

  if (needsPickupAddress(formData) && !formData.pickupAddress?.trim()) {
    errors.pickupAddress = true;
  }

  return errors;
}

export function isFormValid(formData) {
  return Object.keys(getValidationErrors(formData)).length === 0;
}
