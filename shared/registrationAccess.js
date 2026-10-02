// Who can register for a party right now.
//
// Each party has `registrationMode`: 'auto' (default), 'open' or 'closed' (set
// by hand in the admin panel).
//  - closed: nobody can register, couples included.
//  - open / auto: registration stays open until the owner closes it by hand
//            (there is no automatic closing time anymore).
export const COUPLE_TYPES = ['couple', 'single-male-couple', 'single-female-couple'];
export const FEMALE_SINGLE_TYPES = ['single-female-balance', 'single-female-discount'];

export const REGISTRATION_CLOSED_MESSAGE = 'ההרשמה למסיבה זו סגורה כרגע.';

export const normalizeRegistrationMode = (mode) => (mode === 'open' || mode === 'closed' ? mode : 'auto');

/** Returns an error message when this registration is not allowed, otherwise null. */
export function registrationBlockedReason(party) {
  const mode = normalizeRegistrationMode(party?.registrationMode);
  return mode === 'closed' ? REGISTRATION_CLOSED_MESSAGE : null;
}
