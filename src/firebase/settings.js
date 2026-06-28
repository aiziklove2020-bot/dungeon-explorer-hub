import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from './config';
import { 
  getContentSettings as getContentSettingsFromDataAccess,
  getRegistrationSettings as getRegistrationSettingsFromDataAccess,
  getSocialLinks as getSocialLinksFromDataAccess,
  getWhatsappGroups as getWhatsappGroupsFromDataAccess,
  getTelegramSettings as getTelegramSettingsFromDataAccess,
  getSupportChatSettings as getSupportChatSettingsFromDataAccess,
  getRssFeeds as getRssFeedsFromDataAccess,
  getRssTickerSettings as getRssTickerSettingsFromDataAccess,
  getAboutStory as getAboutStoryFromDataAccess,
  getDeployStatus as getDeployStatusFromDataAccess,
  invalidateCache
} from './dataAccess';

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'socialLinks';
const TELEGRAM_SETTINGS_DOC_ID = 'telegram';
const SUPPORT_CHAT_DOC_ID = 'supportChat';
const LIVE_CHAT_DOC_ID = 'liveChat';
const ABOUT_STORY_DOC_ID = 'aboutStory';
const WHATSAPP_GROUPS_DOC_ID = 'whatsappGroups';
const CONTENT_DOC_ID = 'content'; 
const REGISTRATION_SETTINGS_DOC_ID = 'registrationSettings';
const RSS_FEEDS_DOC_ID = 'rssFeeds';

// Re-export from dataAccess for caching
export const getSocialLinks = getSocialLinksFromDataAccess;

export const updateSocialLinks = async (links) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(settingsRef, links, { merge: true });
    
    // Clear cache after update
    await invalidateCache('socialLinks');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getTelegramSettings = getTelegramSettingsFromDataAccess;

export const updateTelegramSettings = async (settings) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, TELEGRAM_SETTINGS_DOC_ID);
    await setDoc(settingsRef, settings, { merge: true });
    await invalidateCache('telegramSettings');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getSupportChatSettings = getSupportChatSettingsFromDataAccess;

export const getDeployStatus = getDeployStatusFromDataAccess;

export const updateSupportChatSettings = async (settings) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SUPPORT_CHAT_DOC_ID);
    await setDoc(settingsRef, settings, { merge: true });
    await invalidateCache('supportChatSettings');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getAboutStory = getAboutStoryFromDataAccess;

export const updateAboutStory = async (story) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, ABOUT_STORY_DOC_ID);
    await setDoc(settingsRef, story, { merge: true });
    
    // Clear cache after update
    await invalidateCache('aboutStory');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getWhatsappGroups = getWhatsappGroupsFromDataAccess;

export const updateWhatsappGroups = async (groups) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, WHATSAPP_GROUPS_DOC_ID);
    await setDoc(settingsRef, groups, { merge: true });
    
    // Clear cache after update
    await invalidateCache('whatsappGroups');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getContent = getContentSettingsFromDataAccess;

export const updateContent = async (content) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, CONTENT_DOC_ID);
    await setDoc(settingsRef, content, { merge: true });
    
    // Clear cache after update
    await invalidateCache('contentSettings');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getRegistrationSettings = getRegistrationSettingsFromDataAccess;

export const updateRegistrationSettings = async (settings) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, REGISTRATION_SETTINGS_DOC_ID);
    await setDoc(settingsRef, settings, { merge: true });
    
    // Clear cache after update
    await invalidateCache('registrationSettings');
  } catch (error) {
    throw error;
  }
};

const RSS_FEEDS_COLLECTION = 'rssFeeds';

// Re-export from dataAccess for caching
export const getRssFeeds = getRssFeedsFromDataAccess;
export const getRssTickerSettings = getRssTickerSettingsFromDataAccess;

const RSS_TICKER_SETTINGS_DOC_ID = 'rssTickerSettings';

export const updateRssTickerSettings = async (settings) => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, RSS_TICKER_SETTINGS_DOC_ID);
    await setDoc(settingsRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
    await invalidateCache('rssTickerSettings');
  } catch (error) {
    throw error;
  }
};

export const addRssFeed = async (feedData) => {
  try {
    const feedsRef = collection(db, RSS_FEEDS_COLLECTION);
    const newFeed = {
      text: feedData.text || '',
      enabled: feedData.enabled !== false,
      order: feedData.order || 0,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(feedsRef, newFeed);
    await invalidateCache('rssFeeds');
    return { id: docRef.id, ...newFeed };
  } catch (error) {
    throw error;
  }
};

export const updateRssFeed = async (feedId, feedData) => {
  try {
    const feedRef = doc(db, RSS_FEEDS_COLLECTION, feedId);
    await updateDoc(feedRef, {
      text: feedData.text,
      enabled: feedData.enabled !== false,
      order: feedData.order || 0,
      updatedAt: new Date().toISOString()
    });
    await invalidateCache('rssFeeds');
  } catch (error) {
    throw error;
  }
};

export const deleteRssFeed = async (feedId) => {
  try {
    const feedRef = doc(db, RSS_FEEDS_COLLECTION, feedId);
    await deleteDoc(feedRef);
    await invalidateCache('rssFeeds');
  } catch (error) {
    throw error;
  }
};

/** Live forum chat: retention + global mute (also editable from Admin). */
export const getLiveChatSettings = async () => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, LIVE_CHAT_DOC_ID);
    const settingsDoc = await getDoc(settingsRef);
    const data = settingsDoc.exists() ? settingsDoc.data() : {};
    const rd = Number(data.retentionDays);
    const retentionDays = Number.isFinite(rd) && rd >= 1 && rd <= 365 ? Math.floor(rd) : 3;
    return {
      retentionDays,
      globalChatMuted: data.globalChatMuted === true
    };
  } catch {
    return { retentionDays: 3, globalChatMuted: false };
  }
};

export const updateLiveChatSettings = async (partial) => {
  const settingsRef = doc(db, SETTINGS_COLLECTION, LIVE_CHAT_DOC_ID);
  const next = { ...partial, updatedAt: new Date().toISOString() };
  if (next.retentionDays != null) {
    const rd = Number(next.retentionDays);
    next.retentionDays = Number.isFinite(rd) ? Math.min(365, Math.max(1, Math.floor(rd))) : 3;
  }
  await setDoc(settingsRef, next, { merge: true });
};

