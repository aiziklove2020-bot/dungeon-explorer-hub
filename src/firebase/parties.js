import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { sendBalanceMatchNotification } from './telegram';
import { isUserBlocked } from './users';
import { getActiveParties as getActivePartiesFromDataAccess, getBalanceMatches as getBalanceMatchesFromDataAccess, getPartyById as getPartyByIdFromDataAccess, getUserByPhone, invalidateCache } from './dataAccess';
import {
  DEFAULT_PARTY_RETENTION_HOURS,
  computePartyExpirationIso,
  isPartyExpiredByDate,
} from '../../shared/partyExpiry.js';
import { getPartySettings } from './partySettings';

/**
 * Resolve the current admin-configured retention window. Used internally
 * by createParty/updateParty/recomputeAllPartiesExpiration so each write
 * carries a fresh `expiration` Timestamp without needing the caller to
 * know about the setting.
 */
const resolveRetentionHours = async () => {
  try {
    const s = await getPartySettings();
    return s?.retentionHours || DEFAULT_PARTY_RETENTION_HOURS;
  } catch {
    return DEFAULT_PARTY_RETENTION_HOURS;
  }
};

/** Compute a Firestore `Timestamp` for the party's expiration instant. */
const buildExpirationTimestamp = (date, retentionHours) => {
  const iso = computePartyExpirationIso(date, retentionHours);
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Timestamp.fromMillis(ms);
};

const PARTIES_COLLECTION = 'parties';

export const createParty = async (partyData) => {
  try {
    
    let dateValue = partyData.date;
    if (typeof dateValue === 'string') {
      // Parse ISO date string (YYYY-MM-DD) as local midnight to avoid UTC offset shifting the date
      const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        dateValue = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0);
      } else {
        dateValue = new Date(dateValue);
      }
    } else if (dateValue && dateValue.toDate) {
      dateValue = dateValue.toDate();
    }

    // Bake an Israel-TZ-aware `expiration` Timestamp directly onto the doc so
    // every read path (homepage, JSON-LD, cleanup jobs, content.json) can use
    // a single comparison `now >= expiration` instead of recomputing the rule.
    const retentionHours = await resolveRetentionHours();
    const expirationTs = buildExpirationTimestamp(dateValue, retentionHours);

    const party = {
      ...partyData,
      date: Timestamp.fromDate(dateValue),
      createdAt: Timestamp.now(),
      registrations: partyData.registrations || [],
      status: partyData.status || 'active', 
      partyType: partyData.partyType || 'internal',
      needsPublish: true,
      ...(expirationTs ? { expiration: expirationTs } : {})
    };
    
    const partiesRef = collection(db, PARTIES_COLLECTION);
    const newPartyRef = doc(partiesRef);
    await setDoc(newPartyRef, party);

    // Clear cache
    await invalidateCache('activeParties');

    return { id: newPartyRef.id, ...party };
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for backward compatibility
export const getActiveParties = getActivePartiesFromDataAccess;


export const registerToParty = async (partyId, userId, userName, userGender) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);

    const existingRegistration = partyData.registrations?.find(
      reg => reg.userId === userId
    );
    
    if (existingRegistration) {
      throw new Error('Already registered to this party');
    }

    const genderRegistrations = partyData.registrations?.filter(
      reg => reg.gender === userGender
    ) || [];
    
    const genderLimit = userGender === 'male' 
      ? partyData.maleLimit 
      : partyData.femaleLimit;
    
    if (genderRegistrations.length >= genderLimit) {
      throw new Error(`${userGender === 'male' ? 'Male' : 'Female'} spots are full`);
    }

    const registration = {
      userId,
      userName,
      gender: userGender,
      registeredAt: Timestamp.now()
    };
    
    await updateDoc(partyRef, {
      registrations: arrayUnion(registration)
    });
    
    return registration;
  } catch (error) {
    throw error;
  }
};

export const registerToPartyNew = async (partyId, registrationData) => {
  try {
    
    const blockedCheck = await isUserBlocked(
      registrationData.phoneNumber,
      registrationData.telegramUsername
    );
    
    if (blockedCheck.blocked) {
      throw new Error('User is blocked and cannot register to parties');
    }

    // Reuse user data from blockedCheck if available to avoid duplicate getUserByPhone call
    let userId = registrationData.userId;
    let userData = null;
    if (blockedCheck.user && blockedCheck.user.level !== 'blocked') {
      // User was found in isUserBlocked check, reuse it
      userId = blockedCheck.user.id;
      userData = blockedCheck.user;
    } else if (registrationData.phoneNumber) {
      // Only call getUserByPhone if not already found in blockedCheck
      try {
        const existingUser = await getUserByPhone(registrationData.phoneNumber);
        if (existingUser && existingUser.level !== 'blocked') {
          userId = existingUser.id;
          userData = existingUser;
        }
      } catch (error) {
        
      }
    }
    
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);

    const existingRegistration = partyData.registrations?.find(
      reg => reg.phoneNumber === registrationData.phoneNumber || (userId && reg.userId === userId)
    );
    
    if (existingRegistration) {
      throw new Error('Already registered to this party');
    }

    if (registrationData.gender !== 'couple') {
      const genderRegistrations = partyData.registrations?.filter(
        reg => reg.gender === registrationData.gender
      ) || [];
      
      const genderLimit = registrationData.gender === 'male' 
        ? partyData.maleLimit 
        : partyData.femaleLimit;
      
      if (genderRegistrations.length >= genderLimit) {
        throw new Error(`${registrationData.gender === 'male' ? 'Male' : 'Female'} spots are full`);
      }
    }

    const finalGender = userData?.gender || registrationData.gender;
    const finalName = userData?.name || registrationData.fullName;
    const finalTelegram = userData?.telegramUsername || registrationData.telegramUsername || '';

    const registration = {
      userId: userId || null, 
      userName: finalName,
      fullName: finalName,
      phoneNumber: registrationData.phoneNumber,
      telegramUsername: finalTelegram,
      registrationType: registrationData.registrationType,
      partyDays: registrationData.partyDays || [],
      pickupAddress: registrationData.pickupAddress || '',
      selfArrival: registrationData.selfArrival || false,
      gender: finalGender,
      registeredAt: Timestamp.now(),
      
      coupleId: registrationData.coupleId || null, 
      partnerName: registrationData.partnerName || null,
      partnerPhone: registrationData.partnerPhone || null
    };
    
    await updateDoc(partyRef, {
      registrations: arrayUnion(registration)
    });

    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache('activeParties'); // Clear all parties cache

    // Registration notifications are sent only from RegistrationForm to the
    // registration channel (getRegistrationSettings). Matching channel is not used here.
    return registration;
  } catch (error) {
    throw error;
  }
};

/** Error code when both partners are already registered to the party (for i18n). */
export const COUPLE_BOTH_REGISTERED_ERROR = 'COUPLE_BOTH_REGISTERED';

/** Error code when man and woman use the same phone number (for i18n). */
export const COUPLE_SAME_PHONE_ERROR = 'COUPLE_SAME_PHONE';

/**
 * Register a couple to a party. If one partner is already registered, converts them to couple and adds the other.
 * - Both already registered → throws with message COUPLE_BOTH_REGISTERED (use for i18n).
 * - One already registered → updates existing to couple, adds the other.
 * - Neither registered → adds both as couple.
 */
export const registerCoupleToParty = async (partyId, maleRegistrationData, femaleRegistrationData) => {
  const normalizePhone = (p) => (p || '').replace(/\D/g, '').trim();
  const malePhone = normalizePhone(maleRegistrationData.phoneNumber);
  const femalePhone = normalizePhone(femaleRegistrationData.phoneNumber);

  if (malePhone === femalePhone) {
    const err = new Error('Couple must use two different phone numbers');
    err.code = COUPLE_SAME_PHONE_ERROR;
    throw err;
  }

  const partyData = await getPartyByIdFromDataAccess(partyId);
  if (!partyData) {
    throw new Error('Party not found');
  }
  const partyRef = doc(db, PARTIES_COLLECTION, partyId);
  const registrations = [...(partyData.registrations || [])];

  const findByPhone = (phone) =>
    registrations.find(
      (r) => normalizePhone(r.phoneNumber) === phone || (r.userId && String(r.userId) === phone)
    );
  const maleExisting = findByPhone(malePhone);
  const femaleExisting = findByPhone(femalePhone);

  if (maleExisting && femaleExisting) {
    const err = new Error('Both partners are already registered to this party');
    err.code = COUPLE_BOTH_REGISTERED_ERROR;
    throw err;
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 11);
  const phonesHash = `${malePhone}_${femalePhone}`.replace(/\D/g, '').substring(0, 10);
  const coupleId = `couple_${timestamp}_${randomStr}_${phonesHash}`;

  const buildRegistration = async (data, gender, partnerName, partnerPhone) => {
    const blockedCheck = await isUserBlocked(data.phoneNumber, data.telegramUsername);
    if (blockedCheck.blocked) {
      throw new Error('User is blocked and cannot register to parties');
    }
    let userId = data.userId;
    let userData = null;
    if (blockedCheck.user && blockedCheck.user.level !== 'blocked') {
      userId = blockedCheck.user.id;
      userData = blockedCheck.user;
    } else if (data.phoneNumber) {
      try {
        const existingUser = await getUserByPhone(data.phoneNumber);
        if (existingUser && existingUser.level !== 'blocked') {
          userId = existingUser.id;
          userData = existingUser;
        }
      } catch (err) {
        // Lookup is best-effort; we can still proceed with the form data.
        console.warn('parties: getUserByPhone lookup failed:', err);
      }
    }
    const finalName = userData?.name || data.fullName;
    const finalTelegram = userData?.telegramUsername || data.telegramUsername || '';
    return {
      userId: userId || null,
      userName: finalName,
      fullName: finalName,
      phoneNumber: data.phoneNumber,
      telegramUsername: finalTelegram,
      registrationType: 'couple',
      partyDays: data.partyDays || [],
      pickupAddress: data.pickupAddress || '',
      selfArrival: data.selfArrival || false,
      gender: gender === 'male' ? 'male' : 'female',
      registeredAt: Timestamp.now(),
      coupleId,
      partnerName: partnerName || null,
      partnerPhone: partnerPhone || null
    };
  };

  if (maleExisting && !femaleExisting) {
    const updatedMale = {
      ...maleExisting,
      registrationType: 'couple',
      coupleId,
      partnerName: femaleRegistrationData.fullName,
      partnerPhone: femaleRegistrationData.phoneNumber
    };
    const femaleReg = await buildRegistration(
      femaleRegistrationData,
      'female',
      maleRegistrationData.fullName,
      maleRegistrationData.phoneNumber
    );
    const maleMatch = (r) =>
      normalizePhone(r.phoneNumber) === malePhone || (r.userId && String(r.userId) === malePhone);
    const updated = registrations.map((r) => (maleMatch(r) ? updatedMale : r));
    await updateDoc(partyRef, { registrations: [...updated, femaleReg] });
    await invalidateCache(`party_${partyId}`);
    await invalidateCache('activeParties');
    return { male: updatedMale, female: femaleReg };
  }

  if (femaleExisting && !maleExisting) {
    const updatedFemale = {
      ...femaleExisting,
      registrationType: 'couple',
      coupleId,
      partnerName: maleRegistrationData.fullName,
      partnerPhone: maleRegistrationData.phoneNumber
    };
    const maleReg = await buildRegistration(
      maleRegistrationData,
      'male',
      femaleRegistrationData.fullName,
      femaleRegistrationData.phoneNumber
    );
    const femaleMatch = (r) =>
      normalizePhone(r.phoneNumber) === femalePhone || (r.userId && String(r.userId) === femalePhone);
    const updated = registrations.map((r) => (femaleMatch(r) ? updatedFemale : r));
    await updateDoc(partyRef, { registrations: [...updated, maleReg] });
    await invalidateCache(`party_${partyId}`);
    await invalidateCache('activeParties');
    return { male: maleReg, female: updatedFemale };
  }

  const maleReg = await buildRegistration(
    maleRegistrationData,
    'male',
    femaleRegistrationData.fullName,
    femaleRegistrationData.phoneNumber
  );
  const femaleReg = await buildRegistration(
    femaleRegistrationData,
    'female',
    maleRegistrationData.fullName,
    maleRegistrationData.phoneNumber
  );
  await updateDoc(partyRef, {
    registrations: arrayUnion(maleReg, femaleReg)
  });
  await invalidateCache(`party_${partyId}`);
  await invalidateCache('activeParties');
  return { male: maleReg, female: femaleReg };
};

export const createBalance = async (partyId) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    const registrations = partyData.registrations || [];

    // Load all users once to avoid multiple getUserByPhone calls
    // This significantly reduces database reads
    const { getAllUsers } = await import('./users');
    const allUsers = await getAllUsers();
    const usersByPhone = new Map();
    allUsers.forEach(user => {
      if (user.phoneNumber) {
        usersByPhone.set(user.phoneNumber, user);
      }
    });

    const isUser = (reg) => {
      if (!reg.phoneNumber) return false;
      const user = usersByPhone.get(reg.phoneNumber);
      return user && user.level !== 'blocked';
    };

    const femalesWithUserCheck = registrations
      .filter(reg => 
        !reg.balancedWith && 
        (reg.registrationType === 'single-female-balance' || reg.registrationType === 'single-female-discount')
      )
      .map(reg => ({
        reg,
        isUserValue: isUser(reg)
      }));

    const females = femalesWithUserCheck
      .filter(item => item.isUserValue)
      .map(item => ({
        ...item.reg,
        registeredAtTimestamp: item.reg.registeredAt?.toDate ? item.reg.registeredAt.toDate().getTime() : 
                              (item.reg.registeredAt instanceof Date ? item.reg.registeredAt.getTime() : 
                              new Date(item.reg.registeredAt).getTime())
      }))
      .sort((a, b) => a.registeredAtTimestamp - b.registeredAtTimestamp); 

    const malesWithUserCheck = registrations
      .filter(reg => 
        !reg.balancedWith && 
        reg.registrationType === 'single-male-balance'
      )
      .map(reg => ({
        reg,
        isUserValue: isUser(reg)
      }));

    const males = malesWithUserCheck
      .filter(item => item.isUserValue)
      .map(item => ({
        ...item.reg,
        registeredAtTimestamp: item.reg.registeredAt?.toDate ? item.reg.registeredAt.toDate().getTime() : 
                              (item.reg.registeredAt instanceof Date ? item.reg.registeredAt.getTime() : 
                              new Date(item.reg.registeredAt).getTime())
      }))
      .sort((a, b) => a.registeredAtTimestamp - b.registeredAtTimestamp); 

    const balancePairs = [];
    const minLength = Math.min(females.length, males.length);
    
    for (let i = 0; i < minLength; i++) {
      balancePairs.push({
        femalePhone: females[i].phoneNumber,
        malePhone: males[i].phoneNumber
      });
    }
    
    if (balancePairs.length === 0) {
      return { balanced: 0, message: 'No available singles to balance' };
    }

    const removeUndefined = (obj) => {
      const cleaned = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      }
      return cleaned;
    };

    const updatedRegistrations = registrations.map(reg => {
      
      const balancePair = balancePairs.find(bp => 
        bp.femalePhone === reg.phoneNumber || 
        bp.malePhone === reg.phoneNumber
      );
      
      if (balancePair) {
        if (reg.phoneNumber === balancePair.femalePhone) {
          return removeUndefined({
            ...reg,
            originalRegistrationType: reg.registrationType, 
            balancedWith: balancePair.malePhone,
            balancedAt: Timestamp.now()
          });
        } else if (reg.phoneNumber === balancePair.malePhone) {
          return removeUndefined({
            ...reg,
            originalRegistrationType: reg.registrationType, 
            balancedWith: balancePair.femalePhone,
            balancedAt: Timestamp.now()
          });
        }
      }
      
      return removeUndefined(reg);
    });

    await updateDoc(partyRef, {
      registrations: updatedRegistrations
    });

    // Clear cache
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties');

    try {
      for (const balancePair of balancePairs) {
        const femaleReg = updatedRegistrations.find(reg => reg.phoneNumber === balancePair.femalePhone);
        const maleReg = updatedRegistrations.find(reg => reg.phoneNumber === balancePair.malePhone);

        if (femaleReg && maleReg) {
          if (femaleReg.telegramUsername) {
            await sendBalanceMatchNotification(
              femaleReg.telegramUsername,
              maleReg,
              { ...partyData, name: partyData.name || 'Party' },
              null,
              'he'
            ).catch(() => {});
          }
          if (maleReg.telegramUsername) {
            await sendBalanceMatchNotification(
              maleReg.telegramUsername,
              femaleReg,
              { ...partyData, name: partyData.name || 'Party' },
              null,
              'he'
            ).catch(() => {});
          }
        }
      }
    } catch (telegramError) {
      // ignore
    }
    
    return { balanced: balancePairs.length, message: `Balanced ${balancePairs.length} pairs` };
  } catch (error) {
    throw error;
  }
};

export const deleteExpiredParties = async () => {
  try {
    // Use dataAccess to get active parties (with caching)
    const activeParties = await getActiveParties();

    // Honour the admin-configured retention window. If the settings doc is
    // missing or unreachable we fall back to the shared default — never abort
    // cleanup, otherwise stale parties would accumulate.
    let retentionHours = DEFAULT_PARTY_RETENTION_HOURS;
    try {
      const settings = await getPartySettings();
      if (settings?.retentionHours) retentionHours = settings.retentionHours;
    } catch {
      // keep default
    }

    const nowMs = Date.now();
    const deletions = [];

    activeParties.forEach(party => {
      const partyDate = party.date instanceof Date ? party.date : new Date(party.date);
      // Expiry rule lives in shared/partyExpiry.js so the homepage filter,
      // this client-side cleanup, the publish-time deletion, and the import-skip
      // all agree (Israel-local 00:00 of labeled-day + retentionHours). Time
      // is intentionally ignored.
      if (isPartyExpiredByDate(partyDate, retentionHours, nowMs)) {
        const partyRef = doc(db, PARTIES_COLLECTION, party.id);
        deletions.push(deleteDoc(partyRef));
      }
    });
    
    if (deletions.length > 0) {
      await Promise.all(deletions);
      
      // Clear cache for active parties
      const { clearCache } = await import('../utils/cache');
      await invalidateCache('activeParties');
    }
    
    return deletions.length;
  } catch (error) {
    // Missing or insufficient permissions = Firestore rules block; fail silently
    if (error?.code !== 'permission-denied' && error?.code !== 'PERMISSION_DENIED') {
      console.error('Error deleting expired parties:', error);
    }
    return 0;
  }
};

/**
 * Recompute and persist the `expiration` Timestamp on every active party
 * using the supplied retention window. Returns the number of docs that were
 * actually written (i.e. whose expiration changed) so the admin UI can show
 * an accurate "X parties updated — git push needed" notice.
 *
 * Skips invalid dates and parties whose expiration already matches, to keep
 * `needsPublish` from flapping when nothing actually changed.
 */
export const recomputeAllPartiesExpiration = async (retentionHours) => {
  try {
    const partiesRef = collection(db, PARTIES_COLLECTION);
    const snapshot = await getDocs(partiesRef);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    let changedCount = 0;

    snapshot.forEach(d => {
      const data = d.data();
      if (!data?.date) return;
      const partyDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
      const newTs = buildExpirationTimestamp(partyDate, retentionHours);
      if (!newTs) return;
      const currentMs = data.expiration?.toMillis ? data.expiration.toMillis() : null;
      if (currentMs === newTs.toMillis()) return;
      batch.update(d.ref, { expiration: newTs, needsPublish: true });
      changedCount++;
    });

    if (changedCount > 0) {
      await batch.commit();
      await invalidateCache('activeParties');
    }
    return changedCount;
  } catch (error) {
    console.error('Error recomputing party expirations:', error);
    return 0;
  }
};

export const unregisterFromParty = async (partyId, userId) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);

    const userRegistration = partyData.registrations?.find(
      reg => reg.userId === userId
    );
    
    if (!userRegistration) {
      throw new Error('Not registered to this party');
    }

    await updateDoc(partyRef, {
      registrations: arrayRemove(userRegistration)
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

export const adminRegisterUserToParty = async (partyId, userId, userName, userGender, registrationType = null, phoneNumber = null, telegramUsername = null) => {
  try {
    
    if (phoneNumber || telegramUsername) {
      const blockedCheck = await isUserBlocked(phoneNumber, telegramUsername);
      if (blockedCheck.blocked) {
        throw new Error('User is blocked and cannot register to parties');
      }
    }
    
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);

    const existingRegistration = partyData.registrations?.find(
      reg => reg.userId === userId || (phoneNumber && reg.phoneNumber === phoneNumber)
    );
    
    if (existingRegistration) {
      throw new Error('User already registered to this party');
    }

    const genderRegistrations = partyData.registrations?.filter(
      reg => reg.gender === userGender
    ) || [];
    
    const genderLimit = userGender === 'male' 
      ? partyData.maleLimit 
      : partyData.femaleLimit;

    let finalRegistrationType = registrationType;
    if (!finalRegistrationType) {
      if (userGender === 'male') {
        finalRegistrationType = 'single-male-balance';
      } else if (userGender === 'female') {
        finalRegistrationType = 'single-female-balance';
      } else {
        finalRegistrationType = 'couple';
      }
    }

    const registration = {
      userId,
      userName,
      fullName: userName,
      gender: userGender,
      registrationType: finalRegistrationType,
      registeredAt: Timestamp.now(),
      registeredByAdmin: true
    };

    if (phoneNumber) {
      registration.phoneNumber = phoneNumber;
    }
    if (telegramUsername) {
      registration.telegramUsername = telegramUsername;
    }
    
    await updateDoc(partyRef, {
      registrations: arrayUnion(registration)
    });
    
    return registration;
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a user's registration from a single party only.
 * Does not affect the same user's registration in any other party.
 */
export const adminRemoveUserFromParty = async (partyId, userIdOrPhone) => {
  try {
    if (!partyId) {
      throw new Error('Party ID is required');
    }
    // Use dataAccess to get party data (with caching) – only this party's document
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    let registrations = [...(partyData.registrations || [])];

    const userRegistrationIndex = registrations.findIndex(
      reg => reg.userId === userIdOrPhone || reg.phoneNumber === userIdOrPhone
    );
    
    if (userRegistrationIndex === -1) {
      throw new Error('User not registered to this party');
    }
    
    const userRegistration = registrations[userRegistrationIndex];

    const removeUndefined = (obj) => {
      const cleaned = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      }
      return cleaned;
    };

    // If user has a balanced pair, unmatch them first
    let updatedBalanceMatches = partyData.balanceMatches || [];
    if (userRegistration.balancedWith) {
      const partnerPhone = userRegistration.balancedWith;
      
      // Find the partner's registration
      const partnerIndex = registrations.findIndex(
        reg => (reg.phoneNumber === partnerPhone || reg.userId === partnerPhone) && 
               reg.phoneNumber !== userRegistration.phoneNumber &&
               reg.userId !== userRegistration.userId
      );
      
      if (partnerIndex !== -1) {
        const partnerRegistration = registrations[partnerIndex];
        
        // Remove balancedWith from partner
        if (partnerRegistration.originalRegistrationType) {
          const { balancedWith, balancedAt, originalRegistrationType, ...rest } = partnerRegistration;
          registrations[partnerIndex] = {
            ...rest,
            registrationType: partnerRegistration.originalRegistrationType
          };
        } else {
          const { balancedWith, balancedAt, ...rest } = partnerRegistration;
          registrations[partnerIndex] = rest;
        }
      }
      
      // Remove the match from balanceMatches if it exists
      const userPhone = userRegistration.phoneNumber || userRegistration.userId;
      updatedBalanceMatches = updatedBalanceMatches.filter(match => {
        return !(
          (match.malePhone === userPhone || match.femalePhone === userPhone) &&
          (match.malePhone === partnerPhone || match.femalePhone === partnerPhone)
        );
      });
    }

    // If user is part of a couple, convert partner to single registration
    if (userRegistration.registrationType === 'couple' && userRegistration.coupleId) {
      const coupleId = userRegistration.coupleId;
      
      // Find the partner's registration (same coupleId)
      const partnerIndex = registrations.findIndex(
        reg => reg.coupleId === coupleId && 
               reg.phoneNumber !== userRegistration.phoneNumber &&
               reg.userId !== userRegistration.userId
      );
      
      if (partnerIndex !== -1) {
        const partnerRegistration = registrations[partnerIndex];
        
        // Convert partner from couple to single
        const partnerGender = partnerRegistration.gender;
        const newRegistrationType = partnerGender === 'male' 
          ? 'single-male-balance' 
          : 'single-female-balance';
        
        // Remove couple-related fields and balancedWith if exists
        const { 
          coupleId: _, 
          partnerName: __, 
          partnerPhone: ___, 
          balancedWith, 
          balancedAt,
          ...rest 
        } = partnerRegistration;
        
        registrations[partnerIndex] = {
          ...rest,
          registrationType: newRegistrationType
        };
        
        // Remove any balance matches involving the partner
        const partnerPhoneForMatch = partnerRegistration.phoneNumber || partnerRegistration.userId;
        updatedBalanceMatches = updatedBalanceMatches.filter(match => {
          return !(
            match.malePhone === partnerPhoneForMatch || 
            match.femalePhone === partnerPhoneForMatch
          );
        });
      }
    }

    // Remove the user's registration
    registrations.splice(userRegistrationIndex, 1);

    const cleanedRegistrations = registrations.map(reg => removeUndefined(reg));

    // Update both registrations and balanceMatches in one operation
    const updateData = {
      registrations: cleanedRegistrations
    };
    
    // Only update balanceMatches if it changed
    if (updatedBalanceMatches.length !== (partyData.balanceMatches || []).length) {
      updateData.balanceMatches = updatedBalanceMatches;
      updateData.balanceUpdatedAt = Timestamp.now();
    }

    await updateDoc(partyRef, updateData);

    // Clear cache - must invalidate party_${partyId} so next delete doesn't use stale registrations
    await invalidateCache(`party_${partyId}`);
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties');

    return true;
  } catch (error) {
    throw error;
  }
};

export const updateRegistrationType = async (partyId, userIdOrPhone, newRegistrationType) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    let registrations = [...(partyData.registrations || [])];

    const regIndex = registrations.findIndex(
      reg => reg.userId === userIdOrPhone || reg.phoneNumber === userIdOrPhone
    );
    
    if (regIndex === -1) {
      throw new Error('User not registered to this party');
    }

    const removeUndefined = (obj) => {
      const cleaned = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      }
      return cleaned;
    };

    registrations[regIndex] = removeUndefined({
      ...registrations[regIndex],
      registrationType: newRegistrationType
    });

    const cleanedRegistrations = registrations.map(reg => removeUndefined(reg));

    await updateDoc(partyRef, {
      registrations: cleanedRegistrations
    });
    
    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache('activeParties'); // Clear all parties cache
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Convert a couple (both partners) to single registrations when unmatching.
 * Used when admin cancels a couple match - both become single and need new matching.
 */
export const convertCoupleToSingles = async (partyId, coupleId) => {
  try {
    const partyData = await getPartyByIdFromDataAccess(partyId);
    if (!partyData) throw new Error('Party not found');

    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    let registrations = [...(partyData.registrations || [])];
    const coupleRegs = registrations.filter(reg => reg.coupleId === coupleId);
    if (coupleRegs.length < 2) return;

    const newRegistrationType = (gender) =>
      gender === 'male' ? 'single-male-balance' : 'single-female-balance';

    registrations = registrations.map(reg => {
      if (reg.coupleId !== coupleId) return reg;
      const { coupleId: _, partnerName: __, partnerPhone: ___, ...rest } = reg;
      return { ...rest, registrationType: newRegistrationType(reg.gender) };
    });

    let updatedBalanceMatches = (partyData.balanceMatches || []).filter(
      m => !(m.isCouple && m.coupleId === coupleId)
    );

    await updateDoc(partyRef, {
      registrations,
      balanceMatches: updatedBalanceMatches,
      balanceUpdatedAt: Timestamp.now()
    });

    await invalidateCache(`party_${partyId}`);
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties');
  } catch (error) {
    throw error;
  }
};

export const unmatchBalance = async (partyId, phoneNumber1, phoneNumber2) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    let registrations = [...(partyData.registrations || [])];

    const reg1Index = registrations.findIndex(
      reg => reg.phoneNumber === phoneNumber1 || reg.userId === phoneNumber1
    );
    const reg2Index = registrations.findIndex(
      reg => reg.phoneNumber === phoneNumber2 || reg.userId === phoneNumber2
    );
    
    if (reg1Index === -1 || reg2Index === -1) {
      throw new Error('One or both registrations not found');
    }

    if (registrations[reg1Index].originalRegistrationType) {
      const { balancedWith, balancedAt, originalRegistrationType, ...rest1 } = registrations[reg1Index];
      registrations[reg1Index] = {
        ...rest1,
        registrationType: registrations[reg1Index].originalRegistrationType
      };
    } else {
      const { balancedWith, balancedAt, ...rest1 } = registrations[reg1Index];
      registrations[reg1Index] = rest1;
    }
    
    if (registrations[reg2Index].originalRegistrationType) {
      const { balancedWith, balancedAt, originalRegistrationType, ...rest2 } = registrations[reg2Index];
      registrations[reg2Index] = {
        ...rest2,
        registrationType: registrations[reg2Index].originalRegistrationType
      };
    } else {
      const { balancedWith, balancedAt, ...rest2 } = registrations[reg2Index];
      registrations[reg2Index] = rest2;
    }

    const removeUndefined = (obj) => {
      const cleaned = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      }
      return cleaned;
    };

    const cleanedRegistrations = registrations.map(reg => removeUndefined(reg));

    await updateDoc(partyRef, {
      registrations: cleanedRegistrations
    });
    
    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties'); // Clear all parties cache
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for backward compatibility
export const getPartyById = getPartyByIdFromDataAccess;

export const updateParty = async (partyId, partyData) => {
  try {
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    let dateValue = partyData.date instanceof Date ? partyData.date : null;
    if (!dateValue) {
      const s = String(partyData.date);
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      dateValue = isoMatch
        ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0)
        : new Date(s);
    }
    
    const updateData = {
      name: partyData.name,
      description: partyData.description || '',
      date: Timestamp.fromDate(dateValue)
    };

    // The party's expiration depends on `date`; every update writes `date`,
    // so we always recompute and persist the matching expiration alongside it.
    const retentionHours = await resolveRetentionHours();
    const expirationTs = buildExpirationTimestamp(dateValue, retentionHours);
    if (expirationTs) updateData.expiration = expirationTs;

    if (partyData.maleLimit !== undefined) updateData.maleLimit = partyData.maleLimit;
    if (partyData.femaleLimit !== undefined) updateData.femaleLimit = partyData.femaleLimit;

    if (partyData.day !== undefined) updateData.day = partyData.day;
    if (partyData.time !== undefined) updateData.time = partyData.time;
    if (partyData.dj !== undefined) updateData.dj = partyData.dj;
    if (partyData.title !== undefined) updateData.title = partyData.title;
    if (partyData.registrationLink !== undefined) updateData.registrationLink = partyData.registrationLink;

    if (partyData.partyType !== undefined) {
      updateData.partyType = partyData.partyType;
    } else {
      
      updateData.partyType = 'internal';
    }

    if (partyData.imageURL !== undefined) {
      updateData.imageURL = partyData.imageURL;
      if (partyData.imageDeleteUrl) {
        updateData.imageDeleteUrl = partyData.imageDeleteUrl;
      }
    }

    updateData.needsPublish = true;
    
    await updateDoc(partyRef, updateData);
    
    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties'); // Clear all parties cache
    
    return true;
  } catch (error) {
    throw error;
  }
};

export const deleteParty = async (partyId, imageDeleteUrl = null) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);

    if (!imageDeleteUrl) {
      imageDeleteUrl = partyData.imageDeleteUrl || null;
    }

    if (partyData.registrations && partyData.registrations.length > 0) {
      await updateDoc(partyRef, {
        registrations: []
      });
    }

    await deleteDoc(partyRef);

    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties'); // Clear all parties cache

    return { success: true, imageDeleteUrl };
  } catch (error) {
    throw error;
  }
};

export const updateUserRegistrationsInParties = async (userId, userUpdates) => {
  try {
    // Use dataAccess to get all active parties (with caching) instead of reading all parties
    const activeParties = await getActiveParties();
    
    // Convert to querySnapshot-like structure for compatibility
    const querySnapshot = {
      docs: activeParties.map(party => ({
        ref: doc(db, PARTIES_COLLECTION, party.id),
        data: () => party
      }))
    };
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    querySnapshot.docs.forEach(partyDoc => {
      const partyData = partyDoc.data();
      const registrations = partyData.registrations || [];

      let hasUpdates = false;
      const updatedRegistrations = registrations.map(reg => {
        if (reg.userId === userId || (userUpdates.phoneNumber && reg.phoneNumber === userUpdates.phoneNumber)) {
          hasUpdates = true;
          updateCount++;
          
          const updatedReg = { ...reg };
          if (userUpdates.name) {
            updatedReg.userName = userUpdates.name;
            updatedReg.fullName = userUpdates.name;
          }
          if (userUpdates.gender) {
            updatedReg.gender = userUpdates.gender;
          }
          if (userUpdates.telegramUsername !== undefined) {
            updatedReg.telegramUsername = userUpdates.telegramUsername;
          }
          if (userUpdates.phoneNumber) {
            updatedReg.phoneNumber = userUpdates.phoneNumber;
          }
          
          updatedReg.userId = userId;
          return updatedReg;
        }
        return reg;
      });

      if (hasUpdates) {
        batch.update(partyDoc.ref, { registrations: updatedRegistrations });
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      
      // Clear cache - CRITICAL: Must clear all related caches after updating registrations
      // Clear all party caches since we updated multiple parties
      await invalidateCache('activeParties');
      // Also clear individual party caches for all updated parties
      const updatedPartyIds = [];
      querySnapshot.docs.forEach(partyDoc => {
        const partyData = partyDoc.data();
        const hasUpdates = partyData.registrations?.some(reg => 
          reg.userId === userId || (userUpdates.phoneNumber && reg.phoneNumber === userUpdates.phoneNumber)
        );
        if (hasUpdates) {
          updatedPartyIds.push(partyData.id);
        }
      });
      // Clear individual party caches
      await Promise.all(updatedPartyIds.map(partyId => invalidateCache(`party_${partyId}`)));
    }
    
    return updateCount;
  } catch (error) {
    throw error;
  }
};

export const linkClientRegistrationsToUser = async (phoneNumber, userId, userData) => {
  try {
    // Use dataAccess to get all active parties (with caching) instead of reading all parties
    const activeParties = await getActiveParties();
    
    // Convert to querySnapshot-like structure for compatibility
    const querySnapshot = {
      docs: activeParties.map(party => ({
        ref: doc(db, PARTIES_COLLECTION, party.id),
        data: () => party
      }))
    };
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    querySnapshot.docs.forEach(partyDoc => {
      const partyData = partyDoc.data();
      const registrations = partyData.registrations || [];

      let hasUpdates = false;
      const updatedRegistrations = registrations.map(reg => {
        if (reg.phoneNumber === phoneNumber && !reg.userId) {
          hasUpdates = true;
          updateCount++;
          
          return {
            ...reg,
            userId: userId,
            userName: userData.name || reg.fullName || reg.userName,
            fullName: userData.name || reg.fullName || reg.userName,
            gender: userData.gender || reg.gender,
            telegramUsername: userData.telegramUsername || reg.telegramUsername || ''
          };
        }
        return reg;
      });

      if (hasUpdates) {
        batch.update(partyDoc.ref, { registrations: updatedRegistrations });
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
    }
    
    return updateCount;
  } catch (error) {
    throw error;
  }
};

export const saveBalanceMatches = async (partyId, balanceMatches) => {
  try {
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    await updateDoc(partyRef, {
      balanceMatches: balanceMatches,
      balanceUpdatedAt: Timestamp.now()
    });
    
    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache(`balanceMatches_${partyId}`);
    await invalidateCache('activeParties'); // Clear all parties cache
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for backward compatibility
export const getBalanceMatches = getBalanceMatchesFromDataAccess;

