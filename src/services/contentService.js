/**
 * Content service – Edit mode vs Public (Publish) mode.
 *
 * Public mode: Content and parties (events) are loaded from Git (content/content.json). Visitors see only what was published.
 * Edit mode: Content and parties are loaded from Firestore. Admin can edit; changes stay in DB until published.
 * Publish: Admin clicks "Publish to Git" → API copies all content + parties from Firestore to Git.
 */

import * as contentCache from './contentCache';
import { invalidateCache as invalidateDataAccessCache } from '../firebase/dataAccess';
import { clearCache } from '../utils/cache';
import { adminAuthHeader } from '../utils/adminApi';
import {
  ISRAEL_TZ,
  DEFAULT_PARTY_RETENTION_HOURS,
  computePartyExpirationIso,
} from '../../shared/partyExpiry.js';

/** Same key as Admin.jsx and App (admin login) so edit mode is consistent. */
const EDIT_MODE_KEY = 'adminAuthenticated';

/** When true, admin sees site as visitors (content from Git) but stays logged in; "חזרה לעריכה" clears this. */
const VIEW_AS_VISITOR_KEY = 'viewAsVisitor';

/**
 * Check if we're in edit mode (admin authenticated).
 * @returns {boolean}
 */
export const isEditMode = () => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(EDIT_MODE_KEY) === 'true' || sessionStorage.getItem('admin_authenticated') === 'true';
  } catch {
    return false;
  }
};

/**
 * Admin is viewing the site as visitors (content from Git) but still logged in.
 * @returns {boolean}
 */
export const isViewingAsVisitor = () => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(VIEW_AS_VISITOR_KEY) === 'true';
  } catch {
    return false;
  }
};

/** True when running inside the native Capacitor app (WebView). No cache used for content in app. */
export const isApp = () => {
  if (typeof window === 'undefined') return false;
  try {
    return !!(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

const FETCH_TIMEOUT_MS = 20000;
/** In the app, content.json can be large (many parties); use longer timeout and more retries for slow mobile networks. */
const FETCH_TIMEOUT_APP_MS = 45000;
const FETCH_RETRIES = 3;
const FETCH_RETRIES_APP = 4;
const FETCH_RETRY_DELAY_MS = 1000;

/**
 * Fetch with timeout and retries (for slow/flaky networks in the app).
 */
const fetchWithTimeoutAndRetry = async (url, options = {}, { timeoutMs = FETCH_TIMEOUT_MS, retries = FETCH_RETRIES } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
};

/** Build content.json URL for public (web) – used by prefetch and load. In app, use absolute URL so WebView always hits the same origin. */
const getContentJsonUrl = (cacheBust = false, inApp = false) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ? import.meta.env.BASE_URL.replace(/\/+$/, '') : '';
  const path = `${base}/content/content.json`;
  const bust = cacheBust ? `?t=${Date.now()}` : '';
  if (inApp && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}${bust}`;
  }
  return `${path}${bust}`;
};

/** In app: URL for content-base.json (content without events) so we can load parties separately. */
const getContentBaseUrl = (inApp) => {
  if (!inApp || typeof window === 'undefined' || !window.location?.origin) return null;
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ? import.meta.env.BASE_URL.replace(/\/+$/, '') : '';
  const path = `${base}/content/content-base.json`;
  return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}?t=${Date.now()}`;
};

/** In app: URL for parties.json (events + externalEvents only). */
const getPartiesUrl = (inApp) => {
  if (!inApp || typeof window === 'undefined' || !window.location?.origin) return null;
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ? import.meta.env.BASE_URL.replace(/\/+$/, '') : '';
  const path = `${base}/content/parties.json`;
  return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}?t=${Date.now()}`;
};

/**
 * Use prefetched content if available (from main.jsx early fetch). Consumes the promise so it's only used once.
 */
const consumePrefetch = async (inApp) => {
  if (inApp || typeof window === 'undefined') return null;
  const p = window.__TBDSM_contentPrefetch;
  if (!p || typeof p.then !== 'function') return null;
  try {
    const data = await p;
    delete window.__TBDSM_contentPrefetch;
    if (data && typeof data === 'object') return data;
  } catch (_) {
    delete window.__TBDSM_contentPrefetch;
  }
  return null;
};

const fetchOptions = {
  cache: 'no-store',
  headers: {
    Accept: 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache'
  }
};

/**
 * In the app: fetch full content.json (single request). Used as fallback when split fails or returns no events.
 */
const loadFullContentJsonApp = async () => {
  const url = getContentJsonUrl(true, true);
  const timeoutMs = FETCH_TIMEOUT_APP_MS;
  const retries = FETCH_RETRIES_APP;
  try {
    const response = await fetchWithTimeoutAndRetry(url, fetchOptions, { timeoutMs, retries });
    if (!response.ok) return null;
    const text = await response.text();
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
};

/**
 * In the app: load content-base.json (no events) then parties.json, so parties load separately and the first response is smaller.
 * Falls back to full content.json if content-base or parties are not available (e.g. old deploy).
 */
const loadFromGitAppSplit = async () => {
  const contentBaseUrl = getContentBaseUrl(true);
  const partiesUrl = getPartiesUrl(true);
  if (!contentBaseUrl || !partiesUrl) return null;

  const timeoutMs = FETCH_TIMEOUT_APP_MS;
  const retries = FETCH_RETRIES_APP;

  const resBase = await fetchWithTimeoutAndRetry(contentBaseUrl, fetchOptions, { timeoutMs, retries }).catch(() => null);
  if (!resBase || !resBase.ok) return null;

  let data;
  try {
    const text = await resBase.text();
    const parsePromise = new Promise((resolve, reject) => {
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e);
      }
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Content parse timeout')), 15000)
    );
    data = await Promise.race([parsePromise, timeoutPromise]);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') {
    return null;
  }

  data.events = data.events || [];
  data.externalEvents = data.externalEvents || [];

  const resParties = await fetchWithTimeoutAndRetry(partiesUrl, fetchOptions, { timeoutMs: 25000, retries: 4 }).catch(() => null);
  if (resParties && resParties.ok) {
    try {
      const partiesText = await resParties.text();
      const parties = JSON.parse(partiesText);
      if (parties && typeof parties === 'object') {
        if (Array.isArray(parties.events)) data.events = parties.events;
        if (Array.isArray(parties.externalEvents)) data.externalEvents = parties.externalEvents;
      }
    } catch (_) {
      // Keep base content with empty events; fallback to full content will run below
    }
  }

  const hasNoParties = (!data.events || data.events.length === 0) && (!data.externalEvents || data.externalEvents.length === 0);
  if (hasNoParties) {
    const full = await loadFullContentJsonApp();
    if (full && ((Array.isArray(full.events) && full.events.length > 0) || (Array.isArray(full.externalEvents) && full.externalEvents.length > 0))) {
      data.events = full.events || [];
      data.externalEvents = full.externalEvents || [];
    }
  }

  return data;
};

/**
 * Load content from Git (content/content.json) for public visitors.
 * In the app: tries content-base + parties (load party after party); falls back to full content.json.
 * On web: uses early prefetch from main.jsx when available for faster first paint.
 */
const loadFromGit = async () => {
  const inApp = isApp();
  if (!inApp) {
    const cached = contentCache.getCached('public');
    if (cached != null && typeof cached === 'object') return cached;
    const prefetched = await consumePrefetch(inApp);
    if (prefetched) {
      contentCache.setCached('public', prefetched);
      return prefetched;
    }
  }

  if (inApp) {
    const split = await loadFromGitAppSplit();
    if (split) return split;
  }

  const contentPath = getContentJsonUrl(!!inApp, inApp);
  const timeoutMs = inApp ? FETCH_TIMEOUT_APP_MS : FETCH_TIMEOUT_MS;
  const retries = inApp ? FETCH_RETRIES_APP : FETCH_RETRIES;
  const response = inApp
    ? await fetchWithTimeoutAndRetry(contentPath, fetchOptions, { timeoutMs, retries })
    : await fetch(contentPath, fetchOptions);

  if (!response.ok) {
    throw new Error(`Failed to load content: ${response.status}`);
  }

  let data;
  if (inApp) {
    const text = await response.text();
    const parsePromise = new Promise((resolve, reject) => {
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e);
      }
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Content parse timeout')), 15000)
    );
    data = await Promise.race([parsePromise, timeoutPromise]);
  } else {
    data = await response.json();
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Content is not an object');
  }

  if (!inApp) {
    contentCache.setCached('public', data);
  }
  return data;
};

/**
 * Load content + parties from Firestore (edit mode).
 */
const loadFromFirestore = async () => {
  const cached = contentCache.getCached('edit');
  if (cached != null && typeof cached === 'object') {
    return cached;
  }

  const { getContent, getRegistrationSettings, getSocialLinks, getWhatsappGroups, getRssFeeds } = await import('../firebase/settings');
  const { getActiveParties } = await import('../firebase/parties');
  const { getPartySettings } = await import('../firebase/partySettings');

  const [contentData, registrationSettings, socialLinksData, whatsappGroupsData, activePartiesList, rssFeedsList, partySettings] = await Promise.all([
    getContent(),
    getRegistrationSettings(),
    getSocialLinks(),
    getWhatsappGroups(),
    getActiveParties(),
    getRssFeeds(),
    getPartySettings().catch(() => null),
  ]);

  const partyRetentionHours = partySettings?.retentionHours ?? DEFAULT_PARTY_RETENTION_HOURS;
  const formatPartyDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('he-IL', {
          day: '2-digit',
          month: '2-digit',
          timeZone: ISRAEL_TZ,
        }).replace(/\./g, '.')
      : '';
  const resolveExpirationIso = (party) => {
    if (party.expiration?.toDate) {
      const t = party.expiration.toDate().getTime();
      if (Number.isFinite(t)) return new Date(t).toISOString();
    }
    if (party.expiration instanceof Date && Number.isFinite(party.expiration.getTime())) {
      return party.expiration.toISOString();
    }
    return party.date ? computePartyExpirationIso(party.date, partyRetentionHours) : null;
  };

  const socialLinksArray = [
    { type: 'instagram', label: 'אינסטגרם', url: socialLinksData?.instagram || '#' },
    { type: 'channel', label: 'ערוץ טלגרם', url: socialLinksData?.telegramChannel || '#' },
    { type: 'discussion', label: 'קבוצת טלגרם', url: socialLinksData?.telegramGroup || '#' },
    { type: 'whatsapp', label: 'מדברים בדסמ', url: socialLinksData?.whatsapp || '#' },
    { type: 'facebook', label: 'פייסבוק', url: socialLinksData?.facebook || '#' }
  ];

  let events = [];
  let externalEvents = [];
  const activeParties = Array.isArray(activePartiesList) ? activePartiesList : [];
  const internalParties = activeParties.filter(p => ['internal', 'exchange'].includes(p.partyType || 'internal'));
  const externalParties = activeParties.filter(p => p.partyType === 'external');

  events = internalParties.map(party => ({
    id: party.id,
    day: party.day || '',
    date: formatPartyDate(party.date),
    title: party.title || party.name || '',
    time: party.time || '',
    dj: party.dj || '',
    img: party.imageURL || '',
    description: party.description || '',
    registrationLink: party.registrationLink || '',
    partyType: party.partyType || 'internal',
    expiration: resolveExpirationIso(party),
  }));

  externalEvents = externalParties.map(party => ({
    day: party.day || '',
    date: formatPartyDate(party.date),
    title: party.title || party.name || '',
    time: party.time || '',
    dj: party.dj || '',
    img: party.imageURL || '',
    description: party.description || '',
    registrationLink: party.registrationLink || '',
    partyType: 'external',
    expiration: resolveExpirationIso(party),
  }));

  const data = {
    hero: contentData?.hero || {},
    about: contentData?.about || {},
    contact: contentData?.contact || {},
    registration: registrationSettings || {},
    socialLinks: socialLinksArray,
    whatsappGroups: whatsappGroupsData || { men: '', women: '' },
    events,
    externalEvents,
    labels: contentData?.labels || {},
    store: contentData?.store || {},
    storeEnabled: contentData?.storeEnabled ?? false,
    activeWorkshopsCount: contentData?.activeWorkshopsCount ?? 0,
    rssFeeds: Array.isArray(rssFeedsList) ? rssFeedsList.filter(f => f.enabled !== false) : [],
    partyRetentionHours,
  };

  contentCache.setCached('edit', data);
  return data;
};

/**
 * Load content: Git/local file when public or when admin chose "view as visitor"; Firestore when in edit mode.
 * Edit mode always uses Firestore so newly added parties appear before publish.
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<object>} Content + events for ContentContext
 */
export const loadContent = async (forceRefresh = false) => {
  const useGit = !isEditMode() || isViewingAsVisitor();
  const mode = useGit ? 'public' : 'edit';
  if (forceRefresh) {
    contentCache.clearMode(mode);
  }

  try {
    return useGit ? await loadFromGit() : await loadFromFirestore();
  } catch (error) {
    console.error('Content load error:', error);
    if (mode === 'public') {
      contentCache.clearMode('public');
      throw error;
    }
    throw error;
  }
};

/**
 * Publish content from Firestore to GitHub (edit mode only).
 * @param {string} [commitMessage]
 * @returns {Promise<{ success: boolean, commit?: object }>}
 */
let isPublishing = false;

export const publishContent = async (commitMessage) => {
  if (!isEditMode()) {
    throw new Error('Cannot publish outside of edit mode');
  }
  if (isPublishing) {
    throw new Error('Publish already in progress. Please wait.');
  }

  isPublishing = true;
  try {
    let publishedBy = '';
    try {
      publishedBy = sessionStorage.getItem('admin_username') || sessionStorage.getItem('admin_id') || '';
    } catch (err) {
      // sessionStorage may throw in private mode; commit will fall back to default attribution.
      console.warn('contentService.publish: sessionStorage read failed:', err);
    }
    // Prefer adminUsername; if only Firebase UID is available, use a display fallback so commit doesn't show raw id
    const looksLikeUid = /^[a-zA-Z0-9]{20,}$/.test((publishedBy || '').trim());
    if (looksLikeUid) publishedBy = 'admin';
    const baseMessage = commitMessage || `Update site content - ${new Date().toISOString()}`;
    const commitMessageWithUser = publishedBy ? `${baseMessage} (published by: ${publishedBy})` : baseMessage;

    const endpoint = process.env.NODE_ENV === 'development'
      ? '/api/publish-content-local'
      : '/api/publish-content';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...adminAuthHeader()
      },
      body: JSON.stringify({
        commitMessage: commitMessageWithUser
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}`, message: await response.text().catch(() => 'Unknown error') };
      }
      const msg = errorData.message || errorData.error || `Publish failed: ${response.status}`;
      const err = new Error(msg);
      err.status = response.status;
      err.details = errorData;
      throw err;
    }

    const result = await response.json();
    contentCache.clearMode('public');

    // No Telegram notification here on purpose — this used to fire a "new
    // party" message for every party flagged needsPublish, which included
    // parties that were only *edited* (updateParty sets needsPublish=true
    // on every save), re-announcing them as new on every unrelated "פרסם
    // ל-Git" click. The scheduled/manual broadcast is the single source of
    // truth for posting parties to Telegram now (see api/telegram-webhook.js
    // sendAllPartyReminders).

    return result;
  } finally {
    isPublishing = false;
  }
};

/**
 * Import content from Git (branch PublishMode) into Firestore.
 * In dev: can pass content from local file. In prod: API fetches from GitHub.
 * @param {{ includeParties?: boolean }} [options] - includeParties: also replace active parties from events in the file
 * @returns {Promise<{ success: boolean, message?: string, partiesCreated?: number }>}
 */
export const importContentFromGit = async (options = {}) => {
  if (!isEditMode()) {
    throw new Error('Cannot import outside of edit mode');
  }
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
  let body = { includeParties: options.includeParties === true };
  if (isDev) {
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL)
        ? import.meta.env.BASE_URL.replace(/\/+$/, '')
        : '';
      const contentPath = `${base || ''}/content/content.json`;
      const response = await fetch(contentPath, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (response.ok) {
        const content = await response.json();
        body = { ...body, content };
      }
    } catch (err) {
      // Local content fetch is dev-only convenience; fall through to API path.
      console.warn('contentService.import: local content fetch failed:', err);
    }
  }
  const endpoint = '/api/import-content-from-git';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...adminAuthHeader()
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const e = new Error(err.message || err.error || `Import failed: ${res.status}`);
    e.details = err;
    e.status = res.status;
    throw e;
  }
  const result = await res.json();
  contentCache.clearMode('edit');
  contentCache.clearMode('public');
  // So next load fetches fresh parties from Firestore (internal + external)
  await invalidateDataAccessCache('activeParties');
  return result;
};

export const clearContentCache = () => {
  contentCache.clearMode('public');
};

/** Clear both public and edit caches (e.g. for "Clear cache" in edit-mode toolbar). */
export const clearAllContentCache = () => {
  contentCache.clearAll();
  clearCache('contentSettings');
  clearCache('registrationSettings');
  clearCache('socialLinks');
  clearCache('whatsappGroups');
};
