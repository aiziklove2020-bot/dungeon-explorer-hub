/**
 * Content / parties / full-data import & export helpers.
 *
 * Extracted from ContentContext.jsx (Phase 3.1 god-file split). These
 * functions do all of the Firestore plumbing and file-download wiring so the
 * provider can stay focused on React state.
 */

import { getActiveParties } from '../../firebase/parties';
import {
  getContent,
  updateContent,
  getRegistrationSettings,
  updateRegistrationSettings,
  getSocialLinks,
  updateSocialLinks as updateSocialLinksService,
  getWhatsappGroups,
  updateWhatsappGroups as updateWhatsappGroupsService,
  getTelegramSettings,
  updateTelegramSettings,
  getAboutStory,
  updateAboutStory
} from '../../firebase/settings';
import { logError, logWarn } from '../../utils/logger';
import { mergeWithDefaults } from './defaults';

function downloadJson(data, filename) {
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function partyDateToIso(date) {
  if (date instanceof Date) return date.toISOString();
  if (date?.toDate) return date.toDate().toISOString();
  return date;
}

function serializePartiesArray(active) {
  return active.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    date: partyDateToIso(p.date),
    maleLimit: p.maleLimit,
    femaleLimit: p.femaleLimit,
    imageURL: p.imageURL || '',
    day: p.day || '',
    time: p.time || '',
    dj: p.dj || '',
    title: p.title || '',
    registrationLink: p.registrationLink || '',
    status: p.status || 'active',
    registrations: p.registrations || []
  }));
}

function normalizePartyForImport(partyData) {
  let dateValue = partyData.date;
  if (typeof dateValue === 'string') {
    dateValue = new Date(dateValue);
  } else if (dateValue && dateValue.toDate) {
    dateValue = dateValue.toDate();
  }
  return {
    name: partyData.name,
    description: partyData.description || '',
    date: dateValue,
    maleLimit: partyData.maleLimit || 100,
    femaleLimit: partyData.femaleLimit || 100,
    imageURL: partyData.imageURL || '',
    day: partyData.day || '',
    time: partyData.time || '',
    dj: partyData.dj || '',
    title: partyData.title || '',
    registrationLink: partyData.registrationLink || '',
    status: 'active'
  };
}

async function applyPartiesImport(activeList) {
  const { createParty, updateParty } = await import('../../firebase/parties');
  const existingParties = await getActiveParties();
  const existingPartyIds = new Set((existingParties || []).map((p) => p.id));

  for (const partyData of activeList) {
    try {
      const partyToImport = normalizePartyForImport(partyData);
      if (partyData.id) {
        if (existingPartyIds.has(partyData.id)) {
          await updateParty(partyData.id, partyToImport);
        } else {
          await createParty(partyToImport);
        }
      } else {
        await createParty(partyToImport);
      }
    } catch (error) {
      logWarn('Content.import.party', partyData?.id, error);
    }
  }
}

/** Download the current in-memory content as a JSON file. */
export function exportContent(content) {
  downloadJson(content, 'talking-bdsm-content.json');
}

/** Parse a JSON string and return a merged content object, or null on error. */
export function parseContentImport(jsonData) {
  try {
    const parsed = JSON.parse(jsonData);
    return mergeWithDefaults(parsed);
  } catch (e) {
    logError('Content.importContent.parse', e);
    return null;
  }
}

/** Download current active parties as JSON. */
export async function exportParties() {
  const active = await getActiveParties();
  const activeArray = Array.isArray(active) ? active : [];
  downloadJson(
    { active: serializePartiesArray(activeArray) },
    `parties-${new Date().toISOString().split('T')[0]}.json`
  );
}

/** Apply a parties-only JSON import. Reloads the page on success. */
export async function importParties(jsonData) {
  try {
    const parsed = JSON.parse(jsonData);
    if (parsed.active && Array.isArray(parsed.active)) {
      await applyPartiesImport(parsed.active);
    }
    window.location.reload();
    return true;
  } catch (e) {
    logError('Content.importContent', e);
    return false;
  }
}

/** Download everything (content, parties, settings, registrations) as a single JSON file. */
export async function exportAllData(registrationsCache) {
  const [active, socialLinks, whatsappGroups, telegramSettings, aboutStory, contentData, registrationSettings] = await Promise.all([
    getActiveParties(),
    getSocialLinks(),
    getWhatsappGroups(),
    getTelegramSettings(),
    getAboutStory(),
    getContent(),
    getRegistrationSettings()
  ]);

  const activeArray = Array.isArray(active) ? active : [];
  const socialLinksArray = Array.isArray(contentData.socialLinks) ? contentData.socialLinks : [];
  const socialLinksObj = {
    instagram: socialLinks.instagram || socialLinksArray.find((l) => l && l.type === 'instagram')?.url || '',
    telegramChannel: socialLinks.telegramChannel || socialLinksArray.find((l) => l && l.type === 'channel')?.url || '',
    telegramGroup: socialLinks.telegramGroup || socialLinksArray.find((l) => l && l.type === 'discussion')?.url || '',
    whatsapp: socialLinks.whatsapp || socialLinksArray.find((l) => l && l.type === 'whatsapp')?.url || '',
    facebook: socialLinks.facebook || socialLinksArray.find((l) => l && l.type === 'facebook')?.url || ''
  };

  const allData = {
    content: {
      hero: contentData.hero || {},
      about: contentData.about || {},
      contact: contentData.contact || {},
      events: contentData.events || [],
      registration: contentData.registration || {},
      socialLinks: socialLinksObj,
      whatsappGroups,
      aboutStory,
      registrationSettings
    },
    telegramSettings,
    parties: {
      active: serializePartiesArray(activeArray)
    },
    registrations: (registrationsCache || []).map((r) => ({
      ...r,
      submittedAt: r.submittedAt instanceof Date ? r.submittedAt.toISOString() : r.submittedAt
    })),
    exportDate: new Date().toISOString()
  };

  downloadJson(allData, `talking-bdsm-all-data-${new Date().toISOString().split('T')[0]}.json`);
}

/** Apply a full-data JSON import (content + settings + parties). Reloads on success. */
export async function importAllData(jsonData) {
  try {
    const parsed = JSON.parse(jsonData);

    if (parsed.content) {
      if (parsed.content.hero || parsed.content.about || parsed.content.contact || parsed.content.events || parsed.content.registration) {
        await updateContent({
          hero: parsed.content.hero || {},
          about: parsed.content.about || {},
          contact: parsed.content.contact || {},
          events: parsed.content.events || [],
          registration: parsed.content.registration || {}
        });
      }

      if (parsed.content.socialLinks) {
        if (typeof parsed.content.socialLinks === 'object' && !Array.isArray(parsed.content.socialLinks)) {
          await updateSocialLinksService(parsed.content.socialLinks);
        } else if (Array.isArray(parsed.content.socialLinks)) {
          const socialLinksObj = {
            instagram: parsed.content.socialLinks.find((l) => l && l.type === 'instagram')?.url || '',
            telegramChannel: parsed.content.socialLinks.find((l) => l && l.type === 'channel')?.url || '',
            telegramGroup: parsed.content.socialLinks.find((l) => l && l.type === 'discussion')?.url || '',
            whatsapp: parsed.content.socialLinks.find((l) => l && l.type === 'whatsapp')?.url || '',
            facebook: parsed.content.socialLinks.find((l) => l && l.type === 'facebook')?.url || ''
          };
          await updateSocialLinksService(socialLinksObj);
        }
      }
      if (parsed.content.whatsappGroups) {
        await updateWhatsappGroupsService(parsed.content.whatsappGroups);
      }
      if (parsed.content.aboutStory) {
        await updateAboutStory(parsed.content.aboutStory);
      }
      if (parsed.content.registrationSettings) {
        await updateRegistrationSettings(parsed.content.registrationSettings);
      }
    }

    if (parsed.telegramSettings) {
      await updateTelegramSettings(parsed.telegramSettings);
    }

    if (parsed.parties?.active && Array.isArray(parsed.parties.active)) {
      await applyPartiesImport(parsed.parties.active);
    }

    window.location.reload();
    return true;
  } catch (e) {
    logError('Content.importFromGit', e);
    return false;
  }
}
