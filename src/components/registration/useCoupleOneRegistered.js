import { useEffect, useState } from 'react';
import { cleanPhone, isValidIsraeliPhone } from '../../utils/phone';
import { isCoupleRegType } from './formTypes';

/**
 * Compares `r.phoneNumber` (and `r.userId` when it looks like a phone) with
 * a pre-normalized needle. Mirrors the backend match-by-phone-or-userId
 * rule, so the UI info banner matches what the server actually records.
 */
function matchesPhone(registration, phoneNorm) {
  if (!registration) return false;
  if (cleanPhone(registration.phoneNumber) === phoneNorm) return true;
  return Boolean(
    registration.userId && cleanPhone(String(registration.userId)) === phoneNorm
  );
}

/**
 * When the user enters a couple where exactly one partner is already
 * registered to at least one of the selected parties, returns a localized
 * info string (so the UI can reassure them we'll just add the other
 * partner). Returns null in every other case.
 */
export function useCoupleOneRegistered({ formData, activeParties, t }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!isCoupleRegType(formData.regType)) {
      setInfo(null);
      return;
    }
    if (!activeParties.length || !formData.selectedParties.length) {
      setInfo(null);
      return;
    }
    if (
      !isValidIsraeliPhone(formData.malePhone) ||
      !isValidIsraeliPhone(formData.femalePhone)
    ) {
      setInfo(null);
      return;
    }

    const malePhoneNorm = cleanPhone(formData.malePhone);
    const femalePhoneNorm = cleanPhone(formData.femalePhone);

    let next = null;
    for (const partyId of formData.selectedParties) {
      const party = activeParties.find((p) => p.id === partyId);
      if (!party?.registrations) continue;

      const maleExists = party.registrations.some((r) => matchesPhone(r, malePhoneNorm));
      const femaleExists = party.registrations.some((r) => matchesPhone(r, femalePhoneNorm));

      if (maleExists && !femaleExists) {
        next = t('registration.coupleMaleAlreadyRegistered');
        break;
      }
      if (femaleExists && !maleExists) {
        next = t('registration.coupleFemaleAlreadyRegistered');
        break;
      }
    }
    setInfo(next);
  }, [
    formData.regType,
    formData.selectedParties,
    formData.malePhone,
    formData.femalePhone,
    activeParties,
    t,
  ]);

  return info;
}
