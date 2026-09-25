import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './config';
import { normalizeIsraeliPhone } from '../utils/phone';
import { callAdminSettings } from '../utils/adminApi';
import { getUserByPhone as getUserByPhoneFromDataAccess, getAllUsers as getAllUsersFromDataAccess, getUserById as getUserByIdFromDataAccess, invalidateCache } from './dataAccess';
import {
  addOrExtendSubscription,
  setSubscriptionExpiry,
  removeSubscription,
  getSubscription,
  hasAnyActiveSubscription,
  hasAnyPrivilegedSubscription,
} from './subscriptions';

const USERS_COLLECTION = 'users';

// Re-export from dataAccess for backward compatibility
export const getUserByPhone = getUserByPhoneFromDataAccess;

export const getUserByTelegram = async (telegramUsername) => {
  try {
    if (!telegramUsername || !telegramUsername.trim()) {
      return null;
    }

    let cleanUsername = telegramUsername.trim();
    cleanUsername = cleanUsername.replace(/^@+/g, ''); 
    
    if (!cleanUsername) {
      return null;
    }
    
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('telegramUsername', '==', cleanUsername));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Read-only profile summary for the unified personal area, keyed by the
 * phone number the visitor typed in (no separate login). Returns null when
 * the phone has no `users` doc yet (nobody has registered with it).
 */
export const getMyPersonalAreaProfile = async (phoneNumber) => {
  const user = await getUserByPhone(normalizeIsraeliPhone(phoneNumber) || phoneNumber);
  if (!user) return null;

  const partiesSub = getSubscription(user, 'parties');
  const exchangeSub = getSubscription(user, 'exchangeParties');
  const active = hasAnyActiveSubscription(user);
  const privileged = hasAnyPrivilegedSubscription(user);

  return {
    userId: user.id,
    name: user.name || '',
    photoUrl: user.photoUrl || '',
    hasActiveSubscription: active,
    isPrivilegedSubscriber: privileged,
    subscriptionMessage: partiesSub.isActive
      ? partiesSub.message
      : exchangeSub.isActive
        ? exchangeSub.message
        : partiesSub.message,
  };
};

/**
 * Saves a profile photo URL (already uploaded to storage) onto the phone
 * number's `users` doc. No-ops silently if the phone has no doc yet — we
 * never create a bare user doc just from a photo upload; a real doc is only
 * ever created by an actual party registration (see createUserFromRegistration).
 */
export const updateMyProfilePhoto = async (phoneNumber, photoUrl) => {
  const user = await getUserByPhone(normalizeIsraeliPhone(phoneNumber) || phoneNumber);
  if (!user) return false;
  await updateDoc(doc(db, USERS_COLLECTION, user.id), { photoUrl });
  await invalidateCache(`userByPhone_${normalizeIsraeliPhone(phoneNumber) || phoneNumber}`);
  await invalidateCache(`userById_${user.id}`);
  return true;
};

export const isUserBlocked = async (phoneNumber, telegramUsername = null) => {
  try {
    
    if (phoneNumber) {
      const userByPhone = await getUserByPhone(phoneNumber);
      if (userByPhone && userByPhone.level === 'blocked') {
        return { blocked: true, reason: 'phone', user: userByPhone };
      }
    }

    if (telegramUsername) {
      const userByTelegram = await getUserByTelegram(telegramUsername);
      if (userByTelegram && userByTelegram.level === 'blocked') {
        return { blocked: true, reason: 'telegram', user: userByTelegram };
      }
    }
    
    return { blocked: false };
  } catch (error) {
    
    return { blocked: false };
  }
};

export const createUser = async (phoneNumber, name, gender) => {
  try {
    
    if (!phoneNumber || phoneNumber.length !== 10 || !phoneNumber.startsWith('05')) {
      throw new Error('מספר טלפון חייב להתחיל ב-05 ולהיות 10 ספרות');
    }

    const existingUser = await getUserByPhone(phoneNumber);
    if (existingUser) {
      
      const userRef = doc(db, USERS_COLLECTION, existingUser.id);
      await updateDoc(userRef, {
        name: name || existingUser.name,
        gender: gender || existingUser.gender
      });
      return { id: existingUser.id, ...existingUser, name: name || existingUser.name, gender: gender || existingUser.gender };
    }

    const userData = {
      phoneNumber,
      name,
      gender,
      level: 'regular', 
      createdAt: new Date().toISOString()
    };
    
    const usersRef = collection(db, USERS_COLLECTION);
    const newUserRef = doc(usersRef);
    await setDoc(newUserRef, userData);
    
    return { id: newUserRef.id, ...userData };
  } catch (error) {
    throw error;
  }
};

/**
 * Legacy entrypoint for changing a user's "level". Preserved so existing
 * callers (SubscriptionsSection legacy buttons, balance tables, party flows) keep
 * working unchanged. Internally this now operates on `subscriptions.parties`
 * and lets the subscriptions module recompute the derived `level`.
 *
 * Behavior parity with the pre-subscriptions implementation:
 *   - 'registered': add/extend a year on the parties subscription
 *   - 'gold':       promote parties subscription to gold (unlimited)
 *   - 'regular':    remove the parties subscription
 *   - 'blocked':    remove parties subscription and explicitly set level=blocked
 *   - 'admin':      mark the user as admin (subscription untouched)
 */
export const updateUserLevel = async (userId, level, expiryDate = null) => {
  try {
    const userData = await getUserByIdFromDataAccess(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    if (level === 'registered') {
      if (expiryDate) {
        await setSubscriptionExpiry(userId, 'parties', expiryDate);
      } else {
        await addOrExtendSubscription(userId, 'parties', 'year');
      }
      return;
    }

    if (level === 'gold') {
      await addOrExtendSubscription(userId, 'parties', 'gold');
      return;
    }

    if (level === 'regular') {
      await removeSubscription(userId, 'parties');
      return;
    }

    if (level === 'blocked') {
      // Blocked is independent of subscriptions. We explicitly stamp the
      // level so it survives any future subscription-driven recompute.
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        level: 'blocked',
        registrationExpiry: null,
        registrationStartDate: null,
        subscriptions: { parties: null, exchangeParties: null },
      });
      await invalidateCache('allUsers');
      await invalidateCache(`userById_${userId}`);
      if (userData.phoneNumber) {
        await invalidateCache(`userByPhone_${userData.phoneNumber}`);
      }
      return;
    }

    if (level === 'admin') {
      // firestore.rules blocks a plain client write from ever setting
      // level:'admin' (see safeLevelUpdate() there) — before that fix,
      // anyone could updateDoc their own user doc to level:'admin'. Goes
      // through api/admin-settings.js's admin-set-level action instead.
      await callAdminSettings('admin-set-level', { userId, level: 'admin' });
      await invalidateCache('allUsers');
      await invalidateCache(`userById_${userId}`);
      if (userData.phoneNumber) {
        await invalidateCache(`userByPhone_${userData.phoneNumber}`);
      }
      return;
    }

    throw new Error(`Unknown level: ${level}`);
  } catch (error) {
    throw error;
  }
};

/** Add a year to the parties subscription. Kept for legacy callers. */
export const extendUserRegistration = async (userId /* , extendFromNow = false */) => {
  // `extendFromNow` is no longer needed: `addOrExtendSubscription` already
  // stacks from `max(now, currentExpiry)`, which gives the same result the
  // legacy code achieved by branching on `extendFromNow`.
  const next = await addOrExtendSubscription(userId, 'parties', 'year');
  return new Date(next.expiry);
};

/** Set an explicit expiry on the parties subscription. Legacy entrypoint. */
export const setUserExpiryDate = async (userId, expiryDate) => {
  await setSubscriptionExpiry(userId, 'parties', expiryDate);
};

/**
 * Legacy public-form helper. Returns the parties-subscription status in the
 * same shape callers expected before subscriptions were split. Returns null
 * for users without any parties subscription so the existing "no banner"
 * code paths still work.
 */
export const getUserRegistrationInfo = (user, kind = 'parties') => {
  if (!user) return null;
  const info = getSubscription(user, kind);
  if (!info.exists) return null;

  if (info.isGold) {
    return {
      level: 'gold',
      isGold: true,
      neverExpires: true,
      message: info.message,
    };
  }

  if (!info.expiryDate) return null;

  return {
    level: 'registered',
    expiryDate: info.expiryDate,
    daysRemaining: info.daysRemaining,
    isExpired: info.isExpired,
    isExpiringSoon: info.isExpiringSoon,
    message: info.message,
  };
};

// Re-export from dataAccess for backward compatibility
export const getAllUsers = getAllUsersFromDataAccess;

export const updateUserDetails = async (userId, updates) => {
  try {
    // Get current user data to check for phone number changes
    const currentUser = await getUserByIdFromDataAccess(userId);
    const oldPhoneNumber = currentUser?.phoneNumber;
    const newPhoneNumber = updates.phoneNumber;

    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, updates);

    // Clear cache - CRITICAL: Must clear cache after update
    await invalidateCache(`userById_${userId}`);
    await invalidateCache('allUsers');
    
    // If phone number changed, clear both old and new phone number caches
    if (oldPhoneNumber && oldPhoneNumber !== newPhoneNumber) {
      await invalidateCache(`userByPhone_${oldPhoneNumber}`);
    }
    if (newPhoneNumber) {
      await invalidateCache(`userByPhone_${newPhoneNumber}`);
    }

    const { updateUserRegistrationsInParties } = await import('./parties');
    await updateUserRegistrationsInParties(userId, updates);
  } catch (error) {
    throw error;
  }
};

/**
 * @param {'day'|'year'} tier — how long the granted subscription lasts. The
 *   admin picks this per registration (a one-off gender-balance pass vs. a
 *   full year), so it can no longer be hardcoded to a year.
 */
export const createUserFromRegistration = async (registration, level = 'regular', tier = 'year') => {
  const subscriptionExpiry = () => {
    const d = new Date();
    if (tier === 'day') d.setDate(d.getDate() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  };

  try {

    // Registrations can arrive with an international prefix (e.g. from a
    // Telegram contact share, +972501234567) — normalize back to local
    // form before validating, instead of rejecting a perfectly real number.
    const normalizedPhone = normalizeIsraeliPhone(registration.phoneNumber);
    if (!normalizedPhone || normalizedPhone.length !== 10 || !normalizedPhone.startsWith('05')) {
      throw new Error('מספר טלפון חייב להתחיל ב-05 ולהיות 10 ספרות');
    }
    registration = { ...registration, phoneNumber: normalizedPhone };

    const existingUser = await getUserByPhone(registration.phoneNumber);
    if (existingUser) {
      
      const userRef = doc(db, USERS_COLLECTION, existingUser.id);
      const updateData = { level };

      if (registration.telegramUsername && registration.telegramUsername.trim() !== '') {
        let cleanTelegram = registration.telegramUsername.trim();
        cleanTelegram = cleanTelegram.replace(/^@+/g, ''); 
        updateData.telegramUsername = cleanTelegram;
      }

      if (level === 'registered') {
        const nowIso = new Date().toISOString();
        const expiryIso = subscriptionExpiry();
        updateData.registrationExpiry = expiryIso;
        updateData.registrationStartDate = nowIso;
        // Mirror onto the new subscriptions map so the new UI shows the user
        // as a parties subscriber the moment they're promoted. Existing
        // `exchangeParties` (if any) is preserved by reading from `existingUser`.
        const prevSubs = existingUser.subscriptions || {};
        updateData.subscriptions = {
          parties: {
            tier,
            expiry: expiryIso,
            startDate: prevSubs.parties?.startDate || nowIso,
            lastRenewedAt: nowIso,
            lastRenewalTier: tier,
          },
          exchangeParties: prevSubs.exchangeParties || null,
        };
      }
      
      await updateDoc(userRef, updateData);
      const updatedUser = { id: existingUser.id, ...existingUser, ...updateData };

      // Clear cache
      await invalidateCache(`userByPhone_${registration.phoneNumber}`);
      await invalidateCache('allUsers');

      if (level === 'registered') {
        const { linkClientRegistrationsToUser } = await import('./parties');
        await linkClientRegistrationsToUser(registration.phoneNumber, existingUser.id, updatedUser);
      }

      const { updateUserRegistrationsInParties } = await import('./parties');
      await updateUserRegistrationsInParties(existingUser.id, updateData);
      
      return updatedUser;
    }

    let cleanTelegramUsername = '';
    if (registration.telegramUsername && registration.telegramUsername.trim() !== '') {
      cleanTelegramUsername = registration.telegramUsername.trim();
      cleanTelegramUsername = cleanTelegramUsername.replace(/^@+/g, ''); 
    }
    
    const userData = {
      phoneNumber: registration.phoneNumber,
      name: registration.fullName || registration.userName,
      gender: registration.gender === 'couple' ? 'female' : registration.gender, 
      level: level,
      telegramUsername: cleanTelegramUsername,
      createdAt: new Date().toISOString(),
      subscriptions: { parties: null, exchangeParties: null },
    };

    if (level === 'registered') {
      const nowIso = new Date().toISOString();
      const expiryIso = subscriptionExpiry();
      userData.registrationExpiry = expiryIso;
      userData.registrationStartDate = nowIso;
      userData.subscriptions = {
        parties: {
          tier,
          expiry: expiryIso,
          startDate: nowIso,
          lastRenewedAt: nowIso,
          lastRenewalTier: tier,
        },
        exchangeParties: null,
      };
    }
    
    const usersRef = collection(db, USERS_COLLECTION);
    const newUserRef = doc(usersRef);
    await setDoc(newUserRef, userData);
    
    const newUser = { id: newUserRef.id, ...userData };

    // Clear cache
    await invalidateCache(`userByPhone_${registration.phoneNumber}`);
    await invalidateCache('allUsers');

    const { linkClientRegistrationsToUser } = await import('./parties');
    await linkClientRegistrationsToUser(registration.phoneNumber, newUser.id, userData);
    
    return newUser;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    // Get user data before deletion to clear phone number cache
    const userData = await getUserByIdFromDataAccess(userId);
    const phoneNumber = userData?.phoneNumber;

    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);

    // Clear cache - CRITICAL: Must clear cache after deletion
    await invalidateCache(`userById_${userId}`);
    await invalidateCache('allUsers');
    if (phoneNumber) {
      await invalidateCache(`userByPhone_${phoneNumber}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
};

// Every admin-account operation below (login, password set/reset, promote,
// demote, activate/deactivate) used to read/write isAdmin/password/
// adminUsername directly on the `users` doc via the client SDK. firestore.rules
// now denies client writes to those specific fields (see the comment on
// /users/{userId} in firestore.rules) — allow write: if true there used to
// mean any site visitor could open devtools and run
// updateDoc(doc(db,'users','<their own id>'), { isAdmin: true }) to grant
// themselves full admin-panel access with no password, and allow read: if
// true let anyone pull every admin's bcrypt hash for offline brute-forcing
// (this file used to bcrypt.compare in the browser). Every function here is
// now a thin wrapper around api/admin-settings.js's admin-account actions,
// which do the same work server-side via the Admin SDK.

export const authenticateAdmin = async (username, password) => {
  return callAdminSettings('admin-login', { username, password });
};

export const setAdminPassword = async (adminId, newPassword) => {
  await callAdminSettings('admin-set-password', { adminId, newPassword });
  return true;
};

export const getAllAdmins = async () => {
  const { admins } = await callAdminSettings('admin-list');
  return admins;
};

export const setAdminActive = async (adminId, isActive) => {
  await callAdminSettings('admin-set-active', { adminId, isActive });
  return true;
};

export const makeUserAdmin = async (userId, username, password) => {
  await callAdminSettings('admin-make-admin', { userId, username, password });
  return true;
};

export const removeAdmin = async (userId) => {
  await callAdminSettings('admin-remove-admin', { adminId: userId });
  return true;
};

export const importUsers = async (usersData) => {
  try {
    let imported = 0;
    let skipped = 0;
    
    // Load all users once to check which exist (batch optimization)
    const allUsers = await getAllUsers();
    const existingPhones = new Set(allUsers.map(u => u.phoneNumber).filter(Boolean));
    
    for (const userData of usersData) {
      if (!userData.phoneNumber || !userData.name) {
        skipped++;
        continue;
      }

      // Check in memory instead of individual DB read
      if (existingPhones.has(userData.phoneNumber)) {
        skipped++;
        continue;
      }

      let cleanTelegramUsername = '';
      if (userData.telegramUsername && userData.telegramUsername.trim() !== '') {
        cleanTelegramUsername = userData.telegramUsername.trim();
        cleanTelegramUsername = cleanTelegramUsername.replace(/^@+/g, '');
      }

      const newUserData = {
        phoneNumber: userData.phoneNumber,
        name: userData.name,
        gender: userData.gender || 'male',
        level: userData.level || 'regular',
        telegramUsername: cleanTelegramUsername,
        createdAt: userData.createdAt || new Date().toISOString()
      };

      if (userData.registrationExpiry) {
        newUserData.registrationExpiry = userData.registrationExpiry;
      }
      if (userData.registrationStartDate) {
        newUserData.registrationStartDate = userData.registrationStartDate;
      }

      // Carry over the new dual-subscription map when present in the import.
      // Older exports won't have it, so we derive it from the legacy fields
      // (level + registrationExpiry) using the shared migration helper.
      if (userData.subscriptions && typeof userData.subscriptions === 'object') {
        newUserData.subscriptions = {
          parties: userData.subscriptions.parties || null,
          exchangeParties: userData.subscriptions.exchangeParties || null,
        };
      } else {
        const { migrateLegacyPartiesSubscription } = await import('./subscriptions');
        newUserData.subscriptions = {
          parties: migrateLegacyPartiesSubscription(newUserData),
          exchangeParties: null,
        };
      }

      const usersRef = collection(db, USERS_COLLECTION);
      const newUserRef = doc(usersRef);
      await setDoc(newUserRef, newUserData);
      
      imported++;
    }
    
    return { imported, skipped };
  } catch (error) {
    throw error;
  }
};

