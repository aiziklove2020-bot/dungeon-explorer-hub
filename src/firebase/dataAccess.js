/**
 * Central Data Access Layer
 * All database reads should go through this file to ensure:
 * - Caching
 * - Request deduplication
 * - Logging
 * - Error handling
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from './config';

const USERS_COLLECTION = 'users';
const PARTIES_COLLECTION = 'parties';
const REGISTRATIONS_COLLECTION = 'registrations';

/**
 * Lazy subscription normalization for user docs.
 *
 * The user-document schema gained a `subscriptions: { parties, exchangeParties }`
 * map. Documents written before that migration still only carry the legacy
 * `level` + `registrationExpiry` fields, so we synthesize a `subscriptions`
 * block from those on read. This keeps all downstream consumers (badges,
 * editor, filters, the SubscriptionsSection table) working against a single
 * shape without needing a forced batch migration to roll out the UI.
 *
 * Logic kept inline (instead of importing from `./subscriptions`) to avoid
 * a `dataAccess <-> subscriptions` import cycle.
 */
const deriveLegacyPartiesSubscription = (user) => {
  if (!user) return null;

  // Gold + no expiry = the legacy "unlimited" parties subscriber.
  if (user.level === 'gold' && !user.registrationExpiry) {
    const startIso =
      typeof user.registrationStartDate === 'string'
        ? user.registrationStartDate
        : new Date().toISOString();
    return {
      tier: 'gold',
      expiry: null,
      startDate: startIso,
      lastRenewedAt: startIso,
      lastRenewalTier: 'gold',
    };
  }

  if (user.level === 'registered' && user.registrationExpiry) {
    const expiryIso =
      typeof user.registrationExpiry === 'string'
        ? user.registrationExpiry
        : user.registrationExpiry?.seconds
        ? new Date(user.registrationExpiry.seconds * 1000).toISOString()
        : null;
    if (!expiryIso) return null;
    const startIso =
      typeof user.registrationStartDate === 'string'
        ? user.registrationStartDate
        : new Date().toISOString();
    return {
      tier: 'year',
      expiry: expiryIso,
      startDate: startIso,
      lastRenewedAt: startIso,
      lastRenewalTier: 'year',
    };
  }

  return null;
};

const normalizeUserDoc = (user) => {
  if (!user) return user;
  if (user.subscriptions && typeof user.subscriptions === 'object') {
    return {
      ...user,
      subscriptions: {
        parties: user.subscriptions.parties || null,
        exchangeParties: user.subscriptions.exchangeParties || null,
      },
    };
  }
  return {
    ...user,
    subscriptions: {
      parties: deriveLegacyPartiesSubscription(user),
      exchangeParties: null,
    },
  };
};

/**
 * Get active parties with caching and deduplication
 * 
 * OPTIMIZATION: Always fetches all parties and caches them under 'activeParties_all'.
 * When a partyType filter is requested, it first checks if 'activeParties_all' is cached.
 * If cached, it filters in memory (no DB read). This prevents redundant database reads
 * when the same data is requested with different filters.
 */
export const getActiveParties = async (partyType = null) => {
  try {
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');
    
    // Always use 'all' as the base cache key - we fetch all parties once
    const baseCacheKey = 'activeParties_all';
    
    // If a partyType filter is requested, first check if we have all parties cached
    if (partyType) {
      const allPartiesCached = getCached(baseCacheKey);
      if (allPartiesCached) {
        // Filter the cached data in memory - no DB read needed!
        const filteredParties = allPartiesCached.filter(party => 
          (party.partyType || 'internal') === partyType
        );
        const result = filteredParties.sort((a, b) => a.date - b.date);
        
        // Optionally cache the filtered result for faster subsequent calls
        const filteredCacheKey = `activeParties_${partyType}`;
        setCached(filteredCacheKey, result);
        
        return result;
      }
    }
    
    // Check if we have a cached result for this specific request
    const specificCacheKey = `activeParties_${partyType || 'all'}`;
    const cached = getCached(specificCacheKey);
    if (cached) {
      // Don't log cache hits to reduce log noise - they're 0 DB reads anyway
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    // Always fetch ALL parties and cache them under 'activeParties_all'
    return await withDeduplication(baseCacheKey, async () => {
      const partiesRef = collection(db, PARTIES_COLLECTION);
      const q = query(partiesRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      const allParties = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const partyTypeValue = data.partyType || 'internal'; 
        
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(data.date),
          partyType: partyTypeValue
        };
      });

      // Sort all parties
      const sortedAllParties = allParties.sort((a, b) => a.date - b.date);
      
      // Always cache ALL parties under 'activeParties_all'
      setCached(baseCacheKey, sortedAllParties);
      
      // If a filter was requested, also cache the filtered result
      let result = sortedAllParties;
      if (partyType) {
        result = sortedAllParties.filter(party => 
          (party.partyType || 'internal') === partyType
        );
        const filteredCacheKey = `activeParties_${partyType}`;
        setCached(filteredCacheKey, result);
      }
      
      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getActiveParties', { partyType }, result, null, { 
        caller: 'dataAccess.getActiveParties', 
        reason: 'Fetching active parties from DB' 
      });
      
      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getActiveParties', { partyType }, null, error, { 
      caller: 'dataAccess.getActiveParties', 
      reason: 'Error fetching active parties' 
    });
    throw error;
  }
};

/**
 * Get user by ID with caching and deduplication
 */
export const getUserById = async (userId) => {
  try {
    if (!userId) return null;

    const cacheKey = `userById_${userId}`;
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached !== null) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getUserById (cached)', { userId }, cached, null, {
        caller: 'dataAccess.getUserById',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userRef);

      let result = null;
      if (userDoc.exists()) {
        result = normalizeUserDoc({ id: userDoc.id, ...userDoc.data() });
      }

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getUserById', { userId }, result, null, {
        caller: 'dataAccess.getUserById',
        reason: 'Fetching user by ID from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getUserById', { userId }, null, error, {
      caller: 'dataAccess.getUserById',
      reason: 'Error fetching user by ID'
    });
    throw error;
  }
};

/**
 * Get user by phone number with caching and deduplication
 */
export const getUserByPhone = async (phoneNumber) => {
  try {
    if (!phoneNumber) return null;
    
    const cacheKey = `userByPhone_${phoneNumber}`;
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');
    
    // Check cache first
    const cached = getCached(cacheKey);
    if (cached !== null) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getUserByPhone (cached)', { phoneNumber }, cached, null, { 
        caller: 'dataAccess.getUserByPhone', 
        reason: 'Cache hit' 
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);
      
      let result = null;
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        result = normalizeUserDoc({ id: userDoc.id, ...userDoc.data() });
      }
      
      // Cache the result
      setCached(cacheKey, result);
      
      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getUserByPhone', { phoneNumber }, result, null, { 
        caller: 'dataAccess.getUserByPhone', 
        reason: 'Fetching user by phone from DB' 
      });
      
      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getUserByPhone', { phoneNumber }, null, error, { 
      caller: 'dataAccess.getUserByPhone', 
      reason: 'Error fetching user by phone' 
    });
    throw error;
  }
};

/**
 * Get all users with caching and deduplication
 */
export const getAllUsers = async () => {
  try {
    const cacheKey = 'allUsers';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');
    
    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      // Don't log cache hits to reduce log noise - they're 0 DB reads anyway
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const usersRef = collection(db, USERS_COLLECTION);
      const querySnapshot = await getDocs(usersRef);
      const result = querySnapshot.docs.map(doc => normalizeUserDoc({ id: doc.id, ...doc.data() }));
      
      // Cache the result
      setCached(cacheKey, result);
      
      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getAllUsers', {}, result, null, { 
        caller: 'dataAccess.getAllUsers', 
        reason: 'Fetching all users from DB' 
      });
      
      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getAllUsers', {}, null, error, { 
      caller: 'dataAccess.getAllUsers', 
      reason: 'Error fetching all users' 
    });
    throw error;
  }
};

/**
 * Get balance matches for a party with caching and deduplication
 */
export const getBalanceMatches = async (partyId) => {
  try {
    const cacheKey = `balanceMatches_${partyId}`;
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');
    
    // Check cache first
    const cached = getCached(cacheKey);
    if (cached !== null) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getBalanceMatches (cached)', { partyId }, cached, null, { 
        caller: 'dataAccess.getBalanceMatches', 
        reason: 'Cache hit' 
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const partyRef = doc(db, PARTIES_COLLECTION, partyId);
      const partyDoc = await getDoc(partyRef);
      
      if (!partyDoc.exists()) {
        const result = [];
        const { dbLogger } = await import('../utils/dbLogger');
        dbLogger.log('getBalanceMatches', { partyId }, result, null, { 
          caller: 'dataAccess.getBalanceMatches', 
          reason: 'Party not found, returning empty array' 
        });
        return result;
      }
      
      const partyData = partyDoc.data();
      const result = partyData.balanceMatches || [];
      
      // Cache the result
      setCached(cacheKey, result);
      
      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getBalanceMatches', { partyId }, result, null, { 
        caller: 'dataAccess.getBalanceMatches', 
        reason: 'Fetching balance matches from DB' 
      });
      
      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getBalanceMatches', { partyId }, null, error, { 
      caller: 'dataAccess.getBalanceMatches', 
      reason: 'Error fetching balance matches' 
    });
    return [];
  }
};

/**
 * Get registrations with caching and deduplication
 */
export const fetchRegistrations = async (forceRefresh = false) => {
  try {
    const cacheKey = 'registrations';
    const { getCached, withDeduplication, setCached, clearCache } = await import('../utils/cache');
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCached(cacheKey);
      if (cached) {
        // Don't log cache hits to reduce log noise - they're 0 DB reads anyway
        return cached;
      }
    } else {
      // Force refresh: clear cache
      clearCache(cacheKey);
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const registrationsRef = collection(db, REGISTRATIONS_COLLECTION);
      const querySnapshot = await getDocs(registrationsRef);
      
      const registrations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt
      }));
      
      // Cache the result
      setCached(cacheKey, registrations);
      
      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('fetchRegistrations', {}, registrations, null, { 
        caller: 'dataAccess.fetchRegistrations', 
        reason: forceRefresh ? 'Force refresh - Fetching registrations from DB' : 'Fetching registrations from DB' 
      });
      
      return registrations;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('fetchRegistrations', {}, null, error, { 
      caller: 'dataAccess.fetchRegistrations', 
      reason: 'Error fetching registrations' 
    });
    throw error;
  }
};

/**
 * Get party by ID with caching
 */
export const getPartyById = async (partyId) => {
  try {
    if (!partyId) return null;
    
    const cacheKey = `party_${partyId}`;
    const { getCached, setCached } = await import('../utils/cache');
    
    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getPartyById (cached)', { partyId }, cached, null, { 
        caller: 'dataAccess.getPartyById', 
        reason: 'Cache hit' 
      });
      return cached;
    }

    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    const partyDoc = await getDoc(partyRef);
    
    if (!partyDoc.exists()) {
      return null;
    }
    
    const data = partyDoc.data();
    const result = {
      id: partyDoc.id,
      ...data,
      date: data.date?.toDate() || new Date(data.date)
    };
    
    // Cache the result
    setCached(cacheKey, result);
    
    // Log database read
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getPartyById', { partyId }, result, null, { 
      caller: 'dataAccess.getPartyById', 
      reason: 'Fetching party by ID from DB' 
    });
    
    return result;
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getPartyById', { partyId }, null, error, { 
      caller: 'dataAccess.getPartyById', 
      reason: 'Error fetching party by ID' 
    });
    throw error;
  }
};

/**
 * Get party settings (currently just the retention-hours window) with caching.
 * Returns `{ retentionHours }` — falls back to the shared default on any error
 * or missing doc, so callers never need to handle null.
 */
export const getPartySettings = async () => {
  try {
    const cacheKey = 'partySettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');
    const { DEFAULT_PARTY_RETENTION_HOURS, normalizeRetentionHours } = await import('../../shared/partyExpiry.js');

    const cached = getCached(cacheKey);
    if (cached) return cached;

    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');

      const settingsRef = doc(db, 'settings', 'partySettings');
      const settingsDoc = await getDoc(settingsRef);

      const raw = settingsDoc.exists() ? settingsDoc.data() : {};
      const result = {
        retentionHours: normalizeRetentionHours(
          raw?.retentionHours ?? DEFAULT_PARTY_RETENTION_HOURS
        ),
      };
      setCached(cacheKey, result);

      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getPartySettings', {}, result, null, {
        caller: 'dataAccess.getPartySettings',
        reason: 'Fetching party settings from DB',
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getPartySettings', {}, null, error, {
      caller: 'dataAccess.getPartySettings',
      reason: 'Error fetching party settings',
    });
    const { DEFAULT_PARTY_RETENTION_HOURS } = await import('../../shared/partyExpiry.js');
    return { retentionHours: DEFAULT_PARTY_RETENTION_HOURS };
  }
};

/**
 * Get store settings with caching and deduplication
 */
export const getStoreSettings = async () => {
  try {
    const cacheKey = 'storeSettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getStoreSettings (cached)', {}, cached, null, {
        caller: 'dataAccess.getStoreSettings',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const settingsRef = doc(db, 'settings', 'storeSettings');
      const settingsDoc = await getDoc(settingsRef);
      
      let result;
      if (settingsDoc.exists()) {
        result = settingsDoc.data();
      } else {
        result = {
          enabled: false,
          storeName: 'חנות',
          storeDescription: ''
        };
      }

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getStoreSettings', {}, result, null, {
        caller: 'dataAccess.getStoreSettings',
        reason: 'Fetching store settings from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getStoreSettings', {}, null, error, {
      caller: 'dataAccess.getStoreSettings',
      reason: 'Error fetching store settings'
    });
    return {
      enabled: false,
      storeName: 'חנות',
      storeDescription: ''
    };
  }
};

/**
 * Get content settings with caching and deduplication
 */
export const getContentSettings = async () => {
  try {
    const cacheKey = 'contentSettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getContentSettings (cached)', {}, cached, null, {
        caller: 'dataAccess.getContentSettings',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const contentRef = doc(db, 'settings', 'content');
      const contentDoc = await getDoc(contentRef);
      
      const result = contentDoc.exists() ? contentDoc.data() : {};

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getContentSettings', {}, result, null, {
        caller: 'dataAccess.getContentSettings',
        reason: 'Fetching content settings from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getContentSettings', {}, null, error, {
      caller: 'dataAccess.getContentSettings',
      reason: 'Error fetching content settings'
    });
    return {};
  }
};

/**
 * Get registration settings with caching and deduplication
 */
export const getRegistrationSettings = async () => {
  try {
    const cacheKey = 'registrationSettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getRegistrationSettings (cached)', {}, cached, null, {
        caller: 'dataAccess.getRegistrationSettings',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const settingsRef = doc(db, 'settings', 'registrationSettings');
      const settingsDoc = await getDoc(settingsRef);
      
      const result = settingsDoc.exists() ? settingsDoc.data() : {};

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getRegistrationSettings', {}, result, null, {
        caller: 'dataAccess.getRegistrationSettings',
        reason: 'Fetching registration settings from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getRegistrationSettings', {}, null, error, {
      caller: 'dataAccess.getRegistrationSettings',
      reason: 'Error fetching registration settings'
    });
    return {};
  }
};

/**
 * Get social links with caching and deduplication
 */
export const getSocialLinks = async () => {
  try {
    const cacheKey = 'socialLinks';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getSocialLinks (cached)', {}, cached, null, {
        caller: 'dataAccess.getSocialLinks',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const settingsRef = doc(db, 'settings', 'socialLinks');
      const settingsDoc = await getDoc(settingsRef);
      
      let result;
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        result = {
          instagram: data.instagram || '',
          telegramChannel: data.telegramChannel || '',
          telegramGroup: data.telegramGroup || '',
          whatsapp: data.whatsapp || '',
          facebook: data.facebook || ''
        };
      } else {
        result = {
          instagram: '',
          telegramChannel: '',
          telegramGroup: '',
          whatsapp: '',
          facebook: ''
        };
      }

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getSocialLinks', {}, result, null, {
        caller: 'dataAccess.getSocialLinks',
        reason: 'Fetching social links from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getSocialLinks', {}, null, error, {
      caller: 'dataAccess.getSocialLinks',
      reason: 'Error fetching social links'
    });
    return {
      instagram: '',
      telegramChannel: '',
      telegramGroup: '',
      whatsapp: '',
      facebook: ''
    };
  }
};

/**
 * Get WhatsApp groups with caching and deduplication
 */
export const getWhatsappGroups = async () => {
  try {
    const cacheKey = 'whatsappGroups';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getWhatsappGroups (cached)', {}, cached, null, {
        caller: 'dataAccess.getWhatsappGroups',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const settingsRef = doc(db, 'settings', 'whatsappGroups');
      const settingsDoc = await getDoc(settingsRef);
      
      const result = settingsDoc.exists() ? settingsDoc.data() : { men: '', women: '' };

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getWhatsappGroups', {}, result, null, {
        caller: 'dataAccess.getWhatsappGroups',
        reason: 'Fetching WhatsApp groups from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getWhatsappGroups', {}, null, error, {
      caller: 'dataAccess.getWhatsappGroups',
      reason: 'Error fetching WhatsApp groups'
    });
    return { men: '', women: '' };
  }
};

/**
 * Get Telegram settings with caching and deduplication.
 * Returns unified shape: { bots[], channels[], messages[] } or legacy { botToken, chatId, siteUrl, enabled }.
 */
export const getTelegramSettings = async () => {
  try {
    const cacheKey = 'telegramSettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getTelegramSettings (cached)', {}, cached, null, {
        caller: 'dataAccess.getTelegramSettings',
        reason: 'Cache hit'
      });
      return cached;
    }

    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');

      const settingsRef = doc(db, 'settings', 'telegram');
      const settingsDoc = await getDoc(settingsRef);

      let result;
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (Array.isArray(data.bots) && data.bots.length > 0) {
          result = {
            bots: data.bots || [],
            channels: data.channels || [],
            messages: data.messages || []
          };
        } else {
          result = {
            bots: [],
            channels: [],
            messages: [],
            legacy: {
              botToken: data.botToken || '',
              chatId: data.chatId || '',
              siteUrl: data.siteUrl || '',
              enabled: data.enabled !== false
            }
          };
        }
      } else {
        result = {
          bots: [],
          channels: [],
          messages: [],
          legacy: { botToken: '', chatId: '', siteUrl: '', enabled: false }
        };
      }

      setCached(cacheKey, result);
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getTelegramSettings', {}, result, null, {
        caller: 'dataAccess.getTelegramSettings',
        reason: 'Fetching Telegram settings from DB'
      });
      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getTelegramSettings', {}, null, error, {
      caller: 'dataAccess.getTelegramSettings',
      reason: 'Error fetching Telegram settings'
    });
    return {
      bots: [],
      channels: [],
      messages: [],
      legacy: { botToken: '', chatId: '', siteUrl: '', enabled: false }
    };
  }
};

/**
 * Get deploy status (last production build passed) from settings/deployStatus.
 * Returns { lastSuccessAt: Date | null, commitSha: string | null, tag: string | null } or null if doc missing.
 */
function parseLastSuccessAt(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds != null) return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1e6);
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return null;
}

export const getDeployStatus = async () => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./config');
    const ref = doc(db, 'settings', 'deployStatus');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
    const lastSuccessAt = parseLastSuccessAt(d.lastSuccessAt);
    return {
      lastSuccessAt: lastSuccessAt || null,
      commitSha: d.commitSha || null,
      tag: d.tag || null
    };
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[getDeployStatus]', e?.message || e);
    }
    return null;
  }
};

/**
 * Get support chat settings with caching and deduplication.
 * By default returns public-safe fields only: { enabled, siteUrl, configured }.
 * Pass { includeSecrets: true } from admin UI only — includes botToken and chatId.
 */
export const getSupportChatSettings = async (opts = {}) => {
  const includeSecrets = opts.includeSecrets === true;
  try {
    const cacheKey = includeSecrets ? 'supportChatSettings_admin' : 'supportChatSettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getSupportChatSettings (cached)', {}, includeSecrets ? { ...cached, botToken: cached.botToken ? '[redacted]' : '' } : cached, null, {
        caller: 'dataAccess.getSupportChatSettings',
        reason: 'Cache hit'
      });
      return cached;
    }

    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');

      const settingsRef = doc(db, 'settings', 'supportChat');
      const settingsDoc = await getDoc(settingsRef);

      const data = settingsDoc.exists() ? settingsDoc.data() : {};
      const result = includeSecrets
        ? {
            enabled: data.enabled === true,
            botToken: data.botToken || '',
            chatId: data.chatId || '',
            siteUrl: data.siteUrl || ''
          }
        : {
            enabled: data.enabled === true,
            siteUrl: data.siteUrl || '',
            configured: !!(data.botToken && data.chatId)
          };

      setCached(cacheKey, result);
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getSupportChatSettings', {}, includeSecrets ? { ...result, botToken: result.botToken ? '[redacted]' : '' } : result, null, {
        caller: 'dataAccess.getSupportChatSettings',
        reason: 'Fetching support chat settings from DB'
      });
      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getSupportChatSettings', {}, null, error, {
      caller: 'dataAccess.getSupportChatSettings',
      reason: 'Error fetching support chat settings'
    });
    return includeSecrets
      ? { enabled: false, botToken: '', chatId: '', siteUrl: '' }
      : { enabled: false, siteUrl: '', configured: false };
  }
};

/**
 * Get RSS feeds with caching and deduplication
 */
export const getRssFeeds = async () => {
  try {
    const cacheKey = 'rssFeeds';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getRssFeeds (cached)', {}, cached, null, {
        caller: 'dataAccess.getRssFeeds',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const feedsRef = collection(db, 'rssFeeds');
      const querySnapshot = await getDocs(feedsRef);
      
      const feeds = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const result = feeds.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return 0;
      });

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getRssFeeds', {}, result, null, {
        caller: 'dataAccess.getRssFeeds',
        reason: 'Fetching RSS feeds from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getRssFeeds', {}, null, error, {
      caller: 'dataAccess.getRssFeeds',
      reason: 'Error fetching RSS feeds'
    });
    return [];
  }
};

/**
 * Get RSS ticker settings (e.g. scroll speed). Stored in Firestore only – no Git publish.
 */
export const getRssTickerSettings = async () => {
  try {
    const cacheKey = 'rssTickerSettings';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getRssTickerSettings (cached)', {}, cached, null, {
        caller: 'dataAccess.getRssTickerSettings',
        reason: 'Cache hit'
      });
      return cached;
    }

    return await withDeduplication(cacheKey, async () => {
      const settingsRef = doc(db, 'settings', 'rssTickerSettings');
      const settingsDoc = await getDoc(settingsRef);

      const result = settingsDoc.exists() && settingsDoc.data().speed != null
        ? { speed: Number(settingsDoc.data().speed) }
        : { speed: 60 };

      setCached(cacheKey, result);

      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getRssTickerSettings', {}, result, null, {
        caller: 'dataAccess.getRssTickerSettings',
        reason: 'Fetching RSS ticker settings from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getRssTickerSettings', {}, null, error, {
      caller: 'dataAccess.getRssTickerSettings',
      reason: 'Error fetching RSS ticker settings'
    });
    return { speed: 60 };
  }
};

/**
 * Get about story with caching and deduplication
 */
export const getAboutStory = async () => {
  try {
    const cacheKey = 'aboutStory';
    const { getCached, withDeduplication, setCached } = await import('../utils/cache');

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getAboutStory (cached)', {}, cached, null, {
        caller: 'dataAccess.getAboutStory',
        reason: 'Cache hit'
      });
      return cached;
    }

    // Use deduplication to prevent concurrent identical requests
    return await withDeduplication(cacheKey, async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./config');
      
      const storyRef = doc(db, 'settings', 'aboutStory');
      const storyDoc = await getDoc(storyRef);
      
      const result = storyDoc.exists() ? storyDoc.data() : {};

      // Cache the result
      setCached(cacheKey, result);

      // Log database read
      const { dbLogger } = await import('../utils/dbLogger');
      dbLogger.log('getAboutStory', {}, result, null, {
        caller: 'dataAccess.getAboutStory',
        reason: 'Fetching about story from DB'
      });

      return result;
    });
  } catch (error) {
    const { dbLogger } = await import('../utils/dbLogger');
    dbLogger.log('getAboutStory', {}, null, error, {
      caller: 'dataAccess.getAboutStory',
      reason: 'Error fetching about story'
    });
    return {};
  }
};

/**
 * Invalidate cache for specific patterns
 * Call this after write operations
 */
export const invalidateCache = async (pattern) => {
  const { clearCache } = await import('../utils/cache');
  clearCache(pattern);
  // When parties change, clear edit-mode content cache so the website shows updated events
  if (pattern === 'activeParties') {
    const { clearMode } = await import('../services/contentCache');
    clearMode('edit');
  }
};
