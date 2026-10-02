// Who can register for a party right now.
//
// Each party has `registrationMode`: 'auto' (default), 'open' or 'closed' (set
// by hand in the admin panel).
//  - closed: nobody can register, couples included.
//  - open:   no time cutoff for anyone.
//  - auto:   couples and single women can register at any time; only single men
//            (gender-balance registration) stop at 21:00 on the party's day.
export const COUPLE_TYPES = ['couple', 'single-male-couple', 'single-female-couple'];
export const FEMALE_SINGLE_TYPES = ['single-female-balance', 'single-female-discount'];

export const REGISTRATION_CLOSED_MESSAGE = 'ההרשמה למסיבה זו סגורה כרגע.';
export const MEN_CUTOFF_MESSAGE = 'ההרשמה לסינגלים נסגרה — איזונים לגברים ניתן לקבל עד השעה 21:00 בלבד';

export const normalizeRegistrationMode = (mode) => (mode === 'open' || mode === 'closed' ? mode : 'auto');

/** Returns an error message when this registration is not allowed, otherwise null. */
export function registrationBlockedReason(party, registrationType, cutoffClosed) {
  const mode = normalizeRegistrationMode(party?.registrationMode);
  if (mode === 'closed') return REGISTRATION_CLOSED_MESSAGE;
  if (mode === 'open') return null;
  if (COUPLE_TYPES.includes(registrationType) || FEMALE_SINGLE_TYPES.includes(registrationType)) return null;
  return cutoffClosed ? MEN_CUTOFF_MESSAGE : null;
}
