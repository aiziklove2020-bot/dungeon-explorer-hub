import { cleanPhone, isValidIsraeliPhone } from '../../utils/phone';
import { isCoupleRegType, needsPickupAddress } from './formTypes';

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
    if (!formData.telegram?.trim()) errors.telegram = true;
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
