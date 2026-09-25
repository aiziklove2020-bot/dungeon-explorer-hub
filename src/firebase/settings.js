import { doc, getDoc } from 'firebase/firestore';
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
import { callAdminSettings } from '../utils/adminApi';

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
    await callAdminSettings('set-settings', { docId: SETTINGS_DOC_ID, data: links });

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
    await callAdminSettings('set-settings', { docId: TELEGRAM_SETTINGS_DOC_ID, data: settings });
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
    await callAdminSettings('set-settings', { docId: SUPPORT_CHAT_DOC_ID, data: settings });
    await invalidateCache('supportChatSettings');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getAboutStory = getAboutStoryFromDataAccess;

export const updateAboutStory = async (story) => {
  try {
    await callAdminSettings('set-settings', { docId: ABOUT_STORY_DOC_ID, data: story });

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
    await callAdminSettings('set-settings', { docId: WHATSAPP_GROUPS_DOC_ID, data: groups });

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
    await callAdminSettings('set-settings', { docId: CONTENT_DOC_ID, data: content });

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
    await callAdminSettings('set-settings', { docId: REGISTRATION_SETTINGS_DOC_ID, data: settings });

    // Clear cache after update
    await invalidateCache('registrationSettings');
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for caching
export const getRssFeeds = getRssFeedsFromDataAccess;
export const getRssTickerSettings = getRssTickerSettingsFromDataAccess;

const RSS_TICKER_SETTINGS_DOC_ID = 'rssTickerSettings';

export const updateRssTickerSettings = async (settings) => {
  try {
    await callAdminSettings('set-settings', {
      docId: RSS_TICKER_SETTINGS_DOC_ID,
      data: { ...settings, updatedAt: new Date().toISOString() }
    });
    await invalidateCache('rssTickerSettings');
  } catch (error) {
    throw error;
  }
};

export const addRssFeed = async (feedData) => {
  try {
    const result = await callAdminSettings('add-rss-feed', {
      data: {
        text: feedData.text || '',
        enabled: feedData.enabled !== false,
        order: feedData.order || 0
      }
    });
    await invalidateCache('rssFeeds');
    return { id: result.id, text: result.text, enabled: result.enabled, order: result.order, createdAt: result.createdAt };
  } catch (error) {
    throw error;
  }
};

export const updateRssFeed = async (feedId, feedData) => {
  try {
    await callAdminSettings('update-rss-feed', {
      feedId,
      data: {
        text: feedData.text,
        enabled: feedData.enabled !== false,
        order: feedData.order || 0
      }
    });
    await invalidateCache('rssFeeds');
  } catch (error) {
    throw error;
  }
};

export const deleteRssFeed = async (feedId) => {
  try {
    await callAdminSettings('delete-rss-feed', { feedId });
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
  const next = { ...partial, updatedAt: new Date().toISOString() };
  if (next.retentionDays != null) {
    const rd = Number(next.retentionDays);
    next.retentionDays = Number.isFinite(rd) ? Math.min(365, Math.max(1, Math.floor(rd))) : 3;
  }
  await callAdminSettings('set-settings', { docId: LIVE_CHAT_DOC_ID, data: next });
};

