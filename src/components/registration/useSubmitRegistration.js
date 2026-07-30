import { useState } from 'react';
import { isUserBlocked } from '../../firebase/users';
import { cleanPhone } from '../../utils/phone';
import {
  isCoupleRegType,
  REGISTRATION_TYPE_BACKEND_MAP,
  resolveGender,
} from './formTypes';

function normalizeTelegram(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/@/g, '');
}

/**
 * Returns true when any registration in `party.registrations` matches
 * `phoneNorm` by phoneNumber or userId (mirrors backend dedupe).
 */
function anyRegistrationMatches(party, phoneNorm) {
  if (!party?.registrations) return false;
  return party.registrations.some(
    (r) =>
      cleanPhone(r.phoneNumber) === phoneNorm ||
      (r.userId && cleanPhone(String(r.userId)) === phoneNorm)
  );
}

/**
 * Pre-flight party checks. For couples, throws a string error code if both
 * partners are already registered to the same party. For singles, throws
 * when the phone is already in any selected party.
 *
 * The returned strings are translation keys so the UI can `t(...)` them.
 */
function checkExistingRegistrations(formData, activeParties) {
  if (isCoupleRegType(formData.regType)) {
    const malePhoneNorm = cleanPhone(formData.malePhone);
    const femalePhoneNorm = cleanPhone(formData.femalePhone);
    for (const partyId of formData.selectedParties) {
      const party = activeParties.find((p) => p.id === partyId);
      if (!party?.registrations) continue;
      const maleExists = anyRegistrationMatches(party, malePhoneNorm);
      const femaleExists = anyRegistrationMatches(party, femalePhoneNorm);
      if (maleExists && femaleExists) {
        return { errorKey: 'registration.coupleBothAlreadyRegistered' };
      }
    }
    return null;
  }

  const phoneNorm = cleanPhone(formData.phone);
  for (const partyId of formData.selectedParties) {
    const party = activeParties.find((p) => p.id === partyId);
    if (anyRegistrationMatches(party, phoneNorm)) {
      return { errorKey: 'alreadyRegistered' };
    }
  }
  return null;
}

/**
 * Builds the Firestore registration sub-document used by
 * `registerToPartyNew` / `registerCoupleToParty`.
 */
function buildPartyRegistrations(formData, telegramUsername) {
  if (isCoupleRegType(formData.regType)) {
    const maleTelegram = normalizeTelegram(formData.maleTelegram);
    const femaleTelegram = normalizeTelegram(formData.femaleTelegram);

    return {
      kind: 'couple',
      male: {
        userId: formData.malePhone,
        fullName: formData.maleName,
        phoneNumber: formData.malePhone,
        telegramUsername: maleTelegram,
        registrationType: 'couple',
        partyDays: [],
        pickupAddress:
          formData.arrivalMethod === 'pickup' ? formData.pickupAddress : '',
        selfArrival: formData.arrivalMethod === 'independent',
        gender: 'male',
        partnerName: formData.femaleName,
        partnerPhone: formData.femalePhone,
      },
      female: {
        userId: formData.femalePhone,
        fullName: formData.femaleName,
        phoneNumber: formData.femalePhone,
        telegramUsername: femaleTelegram,
        registrationType: 'couple',
        partyDays: [],
        pickupAddress:
          formData.arrivalMethod === 'pickup' ? formData.pickupAddress : '',
        selfArrival: formData.arrivalMethod === 'independent',
        gender: 'female',
        partnerName: formData.maleName,
        partnerPhone: formData.malePhone,
      },
    };
  }

  const backendType =
    REGISTRATION_TYPE_BACKEND_MAP[formData.regType] || formData.regType;
  const gender = resolveGender(formData.regType);

  return {
    kind: 'single',
    single: {
      userId: formData.phone,
      fullName: formData.fullName,
      phoneNumber: formData.phone,
      telegramUsername: telegramUsername || '',
      registrationType: backendType,
      partyDays: [],
      pickupAddress:
        formData.arrivalMethod === 'pickup' ? formData.pickupAddress : '',
      selfArrival: formData.arrivalMethod === 'independent',
      gender,
    },
  };
}

/**
 * Snapshot of the data we persist into our own `registrations` collection
 * (the user-facing submission log, distinct from the per-party sub-docs).
 */
function buildSubmissionLog(formData, telegramUsername) {
  if (isCoupleRegType(formData.regType)) {
    return {
      regType: formData.regType,
      maleName: formData.maleName,
      femaleName: formData.femaleName,
      malePhone: formData.malePhone,
      femalePhone: formData.femalePhone,
      maleTelegram: formData.maleTelegram,
      femaleTelegram: formData.femaleTelegram,
      arrivalMethod: formData.arrivalMethod,
      pickupAddress: formData.pickupAddress || '',
      selectedParties: formData.selectedParties,
      submittedAt: new Date().toISOString(),
    };
  }
  return {
    regType: formData.regType,
    fullName: formData.fullName,
    partnerName: formData.partnerName || '',
    phone: formData.phone,
    telegram: telegramUsername,
    arrivalMethod: formData.arrivalMethod,
    pickupAddress: formData.pickupAddress || '',
    selectedParties: formData.selectedParties,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Fire-and-forget: sends a Telegram message to the registration channel for
 * every selected party. Telegram delivery must never fail registration, so
 * errors here are swallowed (caller also wraps in try/catch).
 */
async function dispatchTelegramNotifications({
  formData,
  telegramUsername,
  backendType,
  gender,
}) {
  const { getRegistrationSettings } = await import('../../firebase/settings');
  const { getPartyById } = await import('../../firebase/parties');
  const {
    sendRegistrationTelegram,
    getPartyDaysFromParty,
    getTelegramConfigForMessage,
    MESSAGE_KEYS
  } = await import('../../firebase/telegram');

  const settings = await getRegistrationSettings();
  const token = settings.telegramBotToken || '';
  const chatId = settings.telegramChatId || '';
  /** Legacy: registrationSettings doc (telegramEnabled + token + chatId). */
  const legacyReady =
    settings.telegramEnabled === true && Boolean(token && chatId);
  /** Unified admin Telegram (settings/telegram): registration message + bot + channels. */
  const unifiedConfig = await getTelegramConfigForMessage(MESSAGE_KEYS.REGISTRATION);
  const unifiedReady =
    Boolean(unifiedConfig?.botToken) &&
    Array.isArray(unifiedConfig?.chatIds) &&
    unifiedConfig.chatIds.length > 0;
  if (!legacyReady && !unifiedReady) return;

  const lang = 'he';
  for (const partyId of formData.selectedParties) {
    // eslint-disable-next-line no-await-in-loop
    const party = await getPartyById(partyId);
    if (!party) continue;
    const pickupAddress =
      formData.arrivalMethod === 'pickup' ? formData.pickupAddress || '' : '';

    const base =
      formData.regType === 'couple'
        ? {
            fullName: formData.maleName,
            userName: formData.maleName,
            phoneNumber: formData.malePhone,
            telegramUsername: normalizeTelegram(formData.maleTelegram) || undefined,
            partnerName: formData.femaleName,
            partnerPhone: formData.femalePhone,
            womanFullName: formData.femaleName,
            womanPhoneNumber: formData.femalePhone,
            womanTelegramUsername:
              normalizeTelegram(formData.femaleTelegram) || undefined,
            registrationType: 'couple',
            partyDays: getPartyDaysFromParty(party),
            pickupAddress,
            gender: 'male',
          }
        : {
            fullName: formData.fullName,
            userName: formData.fullName,
            phoneNumber: formData.phone,
            telegramUsername: (telegramUsername || '').replace(/@/g, '') || undefined,
            registrationType: backendType,
            partyDays: getPartyDaysFromParty(party),
            pickupAddress,
            gender,
          };

    // eslint-disable-next-line no-await-in-loop
    await sendRegistrationTelegram(base, party, token, chatId, lang);
  }
}

/**
 * Checks (and, the moment it succeeds, also sends the "waiting for
 * balance" DM) whether this registrant has pressed Start on the bot yet.
 * Singles only — a second DM (sendBalanceMatchNotification) follows once
 * the admin runs the balance. Requires a real telegramUsername, which the
 * form now enforces.
 *
 * Goes straight to a dedicated server job (?job=send-waiting-balance)
 * rather than through firebase/telegram.js's resolveTelegramChatId: that
 * helper needs an admin-secret header to look up an arbitrary username
 * (see MatchesSection.jsx), which this anonymous public flow doesn't have
 * and shouldn't get — exposing it here would let anyone probe whether a
 * given Telegram handle has messaged our bot. This endpoint instead
 * verifies server-side that phone+telegramUsername+partyId actually match
 * a registration that was just created before it resolves/sends anything,
 * so it's safe to call from an anonymous client and safe to poll — an
 * attacker would need a real phone+party+username combination matching an
 * actual just-created registration, not just a guessed username.
 *
 * Returns true once at least one selected party confirms delivery
 * (chat_id resolution isn't party-specific — a single confirmed party is
 * enough to know the person has started the bot).
 */
export async function checkTelegramStarted({ formData, telegramUsername }) {
  if (!telegramUsername) return true; // nothing to verify — shouldn't happen, form requires it for singles
  const cleanUsername = telegramUsername.replace(/^@+/, '');
  const phone = cleanPhone(formData.phone);

  for (const partyId of formData.selectedParties) {
    const qs = new URLSearchParams({ phone, telegramUsername: cleanUsername, partyId });
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`/api/telegram-webhook?job=send-waiting-balance&${qs.toString()}`);
      // eslint-disable-next-line no-await-in-loop
      const data = await res.json();
      if (data?.ok) return true;
    } catch {
      // try the next party
    }
  }
  return false;
}

/**
 * Orchestrates the entire submit pipeline for the registration form.
 *
 * Returns state + a `submit` function that the shell wires to its form
 * `onSubmit`. The shell stays free of any Firestore / Telegram concerns.
 */
export function useSubmitRegistration({ saveRegistration, activeParties, t }) {
  const [loading, setLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');

  async function submit(formData) {
    setTelegramError('');

    let telegramUsername = formData.telegram?.trim() || '';
    if (!isCoupleRegType(formData.regType) && telegramUsername) {
      telegramUsername = `@${telegramUsername.replace(/@/g, '')}`;
    }

    setLoading(true);

    try {
      // 1. Blocked-user gate.
      if (isCoupleRegType(formData.regType)) {
        const maleBlocked = await isUserBlocked(formData.malePhone, formData.maleTelegram);
        if (maleBlocked.blocked) {
          setTelegramError(`${t('accountBlocked')} - ${t('registration.maleDetails')}`);
          return false;
        }
        const femaleBlocked = await isUserBlocked(
          formData.femalePhone,
          formData.femaleTelegram
        );
        if (femaleBlocked.blocked) {
          setTelegramError(`${t('accountBlocked')} - ${t('registration.femaleDetails')}`);
          return false;
        }
      } else {
        const blocked = await isUserBlocked(formData.phone, formData.telegram);
        if (blocked.blocked) {
          setTelegramError(t('accountBlocked'));
          return false;
        }
      }

      // 2. Pre-flight duplicate-registration check against cached parties.
      const preCheck = checkExistingRegistrations(formData, activeParties);
      if (preCheck?.errorKey) {
        setTelegramError(t(preCheck.errorKey));
        return false;
      }

      // 3. Write per-party registrations.
      const {
        registerToPartyNew,
        registerCoupleToParty,
        COUPLE_BOTH_REGISTERED_ERROR,
        COUPLE_SAME_PHONE_ERROR,
      } = await import('../../firebase/parties');

      const built = buildPartyRegistrations(formData, telegramUsername);

      try {
        await Promise.all(
          formData.selectedParties.map(async (partyId) => {
            if (built.kind === 'couple') {
              await registerCoupleToParty(partyId, built.male, built.female);
            } else {
              await registerToPartyNew(partyId, built.single);
            }
          })
        );
      } catch (error) {
        if (error?.code === COUPLE_BOTH_REGISTERED_ERROR) {
          setTelegramError(t('registration.coupleBothAlreadyRegistered'));
          return false;
        }
        if (error?.code === COUPLE_SAME_PHONE_ERROR) {
          setTelegramError(t('registration.coupleSamePhone'));
          return false;
        }
        throw error;
      }

      // 4. Record submission log + dispatch telegram (best effort).
      await saveRegistration(buildSubmissionLog(formData, telegramUsername));

      try {
        await dispatchTelegramNotifications({
          formData,
          telegramUsername,
          backendType:
            REGISTRATION_TYPE_BACKEND_MAP[formData.regType] || formData.regType,
          gender: resolveGender(formData.regType),
        });
      } catch {
        // Telegram is non-critical; registration already succeeded.
      }

      // Couples don't need Telegram verification (their confirmation DM is
      // optional, sent later by the admin on balance). Singles do — the
      // whole point of requiring a Telegram username is reaching them for
      // balance results, so the registration flow now blocks on confirming
      // they've actually pressed Start rather than just hoping they will.
      if (isCoupleRegType(formData.regType)) {
        return { success: true, telegramVerified: true };
      }
      const telegramVerified = await checkTelegramStarted({ formData, telegramUsername }).catch(() => false);
      return { success: true, telegramVerified, telegramUsername };
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(`${t('error')}: ${error.message || t('anErrorOccurred')}`);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    telegramError,
    setTelegramError,
    submit,
  };
}
