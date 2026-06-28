import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from './config';
import { getUserByPhone as getUserByPhoneFromDataAccess, getAllUsers as getAllUsersFromDataAccess, getUserById as getUserByIdFromDataAccess, invalidateCache } from './dataAccess';
import {
  addOrExtendSubscription,
  setSubscriptionExpiry,
  removeSubscription,
  getSubscription,
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
 * callers (UsersSection legacy buttons, balance tables, party flows) keep
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
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, { level: 'admin' });
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

export const createUserFromRegistration = async (registration, level = 'regular') => {
  try {
    
    if (!registration.phoneNumber || registration.phoneNumber.length !== 10 || !registration.phoneNumber.startsWith('05')) {
      throw new Error('מספר טלפון חייב להתחיל ב-05 ולהיות 10 ספרות');
    }

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
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        const nowIso = new Date().toISOString();
        const expiryIso = oneYearFromNow.toISOString();
        updateData.registrationExpiry = expiryIso;
        updateData.registrationStartDate = nowIso;
        // Mirror onto the new subscriptions map so the new UI shows the user
        // as a parties subscriber the moment they're promoted. Existing
        // `exchangeParties` (if any) is preserved by reading from `existingUser`.
        const prevSubs = existingUser.subscriptions || {};
        updateData.subscriptions = {
          parties: {
            tier: 'year',
            expiry: expiryIso,
            startDate: prevSubs.parties?.startDate || nowIso,
            lastRenewedAt: nowIso,
            lastRenewalTier: 'year',
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
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      const nowIso = new Date().toISOString();
      const expiryIso = oneYearFromNow.toISOString();
      userData.registrationExpiry = expiryIso;
      userData.registrationStartDate = nowIso;
      userData.subscriptions = {
        parties: {
          tier: 'year',
          expiry: expiryIso,
          startDate: nowIso,
          lastRenewedAt: nowIso,
          lastRenewalTier: 'year',
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

export const getAdminByUsername = async (username) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('adminUsername', '==', username));
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

export const authenticateAdmin = async (username, password) => {
  try {
    
    await activateDefaultAdminIfNeeded();

    let admin = await getAdminByUsername(username);

    if (!admin) {
      admin = await getDefaultAdmin();
      
      if (!admin) {
        admin = await createDefaultAdmin();
      }
    }
    
    if (!admin) {
      return { authenticated: false, error: 'Admin not found' };
    }

    // First-login bootstrap: default admin with no password set yet must be
    // forced through the password-set flow. We no longer accept a hardcoded
    // `admin/admin` credential pair (see docs/SECURITY_MIGRATION.md).
    if (admin.isDefaultAdmin && username === 'admin' && !admin.password) {
      return { admin, isFirstLogin: true };
    }

    if (!admin.isActive && !admin.isDefaultAdmin) {
      return { authenticated: false, error: 'Admin account is disabled' };
    }

    if (admin.isDefaultAdmin) {
      const hasActiveAdmins = await checkActiveAdmins();
      if (!hasActiveAdmins) {
        
        await setAdminActive(admin.id, true);
        admin.isActive = true;
      } else if (!admin.isActive) {
        return { authenticated: false, error: 'Default admin is disabled' };
      }
    }

    if (!admin.password) {
      return { admin, isFirstLogin: true };
    }

    // Verify password. Stored value may be either a bcrypt hash ($2*) for new
    // accounts, or a legacy plaintext value for accounts created before the
    // migration. Legacy accounts are auto-upgraded on a successful login.
    const looksHashed = typeof admin.password === 'string'
      && admin.password.startsWith('$2');
    let ok = false;
    if (looksHashed) {
      ok = await bcrypt.compare(password, admin.password);
    } else {
      ok = admin.password === password;
      if (ok) {
        try {
          const upgraded = await bcrypt.hash(password, 10);
          await updateDoc(doc(db, USERS_COLLECTION, admin.id), { password: upgraded });
          admin.password = upgraded;
        } catch (err) {
          console.error('admin password auto-upgrade failed:', err);
        }
      }
    }
    if (!ok) {
      return { authenticated: false, error: 'Invalid password' };
    }

    return { authenticated: true, admin };
  } catch (error) {
    throw error;
  }
};

export const getDefaultAdmin = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('isDefaultAdmin', '==', true));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }

    return await createDefaultAdmin();
  } catch (error) {
    throw error;
  }
};

export const checkActiveAdmins = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('isAdmin', '==', true));
    const querySnapshot = await getDocs(q);
    
    for (const docSnap of querySnapshot.docs) {
      const userData = docSnap.data();
      
      if (userData.isActive && !userData.isDefaultAdmin) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

export const activateDefaultAdminIfNeeded = async () => {
  try {
    const hasActiveAdmins = await checkActiveAdmins();
    if (!hasActiveAdmins) {
      const defaultAdmin = await getDefaultAdmin();
      if (defaultAdmin && !defaultAdmin.isActive) {
        // Directly update without calling setAdminActive to avoid recursion
        const userRef = doc(db, USERS_COLLECTION, defaultAdmin.id);
        await updateDoc(userRef, { isActive: true });
      }
    }
  } catch (error) {
  }
};

export const createDefaultAdmin = async () => {
  try {
    
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('isDefaultAdmin', '==', true));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }

    // Bootstrap account with no password. The first login flow forces the
    // operator to set a password (which is then stored as a bcrypt hash).
    const userData = {
      adminUsername: 'admin',
      password: null,
      isAdmin: true,
      isDefaultAdmin: true,
      isActive: true,
      name: 'Default Admin',
      createdAt: new Date().toISOString()
    };
    
    const newUserRef = doc(usersRef);
    await setDoc(newUserRef, userData);
    
    return { id: newUserRef.id, ...userData };
  } catch (error) {
    throw error;
  }
};

export const setAdminPassword = async (adminId, newPassword) => {
  try {
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    const userRef = doc(db, USERS_COLLECTION, adminId);
    await updateDoc(userRef, { password: hashed });
    return true;
  } catch (error) {
    throw error;
  }
};

export const getAllAdmins = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('isAdmin', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw error;
  }
};

export const setAdminActive = async (adminId, isActive) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, adminId);
    // Use dataAccess to get user data (with caching)
    const userData = await getUserByIdFromDataAccess(adminId);
    
    if (!userData) {
      throw new Error('User not found');
    }
    
    // Don't allow disabling default admin if it's the only active admin
    if (!isActive && userData.isDefaultAdmin) {
      const hasActiveAdmins = await checkActiveAdmins();
      if (!hasActiveAdmins) {
        // Can't disable default admin if no other active admins exist
        throw new Error('Cannot disable default admin when no other active admins exist');
      }
    }
    
    await updateDoc(userRef, { isActive });

    // If disabling an admin, check if default admin should be activated automatically
    if (!isActive) {
      await activateDefaultAdminIfNeeded();
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

export const makeUserAdmin = async (userId, username, password) => {
  try {
    
    const existingAdmin = await getAdminByUsername(username);
    if (existingAdmin && existingAdmin.id !== userId) {
      throw new Error('Username already exists');
    }
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    // Always set isActive: true when making user admin - admin stays active
    await updateDoc(userRef, {
      isAdmin: true,
      adminUsername: username,
      password: password,
      isActive: true
    });

    // If there are other active admins, disable default admin
    const hasActiveAdmins = await checkActiveAdmins();
    if (hasActiveAdmins) {
      const defaultAdmin = await getDefaultAdmin();
      if (defaultAdmin && defaultAdmin.isActive) {
        await setAdminActive(defaultAdmin.id, false);
      }
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

export const removeAdmin = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    // Use dataAccess to get user data (with caching)
    const userData = await getUserByIdFromDataAccess(userId);
    
    if (!userData) {
      throw new Error('User not found');
    }

    if (userData.isDefaultAdmin) {
      throw new Error('Cannot remove default admin');
    }
    
    await updateDoc(userRef, {
      isAdmin: false,
      adminUsername: null,
      password: null,
      isActive: false
    });

    await activateDefaultAdminIfNeeded();
    
    return true;
  } catch (error) {
    throw error;
  }
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

