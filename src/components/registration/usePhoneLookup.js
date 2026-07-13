import { useEffect, useRef, useState } from 'react';
import { getUserByPhone, getUserRegistrationInfo } from '../../firebase/users';
import { isValidIsraeliPhone } from '../../utils/phone';

const DEBOUNCE_MS = 500;

/**
 * Watches `phone`. When it matches a valid IL mobile format, debounces by
 * `DEBOUNCE_MS` and looks the user up in Firestore, returning the user's
 * registration info block (expiry, gold flag, etc.) — or `null` when the
 * phone is incomplete, unknown, or the lookup errored.
 *
 * @param {string} phone
 * @param {string} partyType
 * @returns {object|null}
 */
export function usePhoneLookup(phone, partyType = 'internal') {
  const [registrationInfo, setRegistrationInfo] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!isValidIsraeliPhone(phone)) {
      setRegistrationInfo(null);
      return undefined;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const user = await getUserByPhone(phone);
        const subKind = partyType === 'exchange' ? 'exchangeParties' : 'parties';
        setRegistrationInfo(user ? getUserRegistrationInfo(user, subKind) : null);
      } catch {
        setRegistrationInfo(null);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phone, partyType]);

  return registrationInfo;
}
