import { useEffect, useRef } from 'react';
import { isEditMode } from '../../services/contentService';
import { logError } from '../../utils/logger';
import { callAdminSettings } from '../../utils/adminApi';

// Debounce window between a state change and the Firestore batch commit.
// 3 s matches the previous inline value and gives rapid keystroke edits time
// to settle without racing the user. Mutable module-level so test code can
// shorten it via setAutosaveDebounceMs(); production callers should not.
let AUTOSAVE_DEBOUNCE_MS = 3000;

/** @internal test-only. */
export function setAutosaveDebounceMs(ms) {
  AUTOSAVE_DEBOUNCE_MS = ms;
}

/**
 * Persist edit-mode changes to Firestore in the background. Only the six
 * human-editable sections listed below are tracked; events/parties have
 * their own persistence path in contentMutators / parties.js.
 *
 * The first run is a no-op that just records the baseline snapshot — this
 * prevents an empty-state autosave on first mount.
 */
export function useContentAutosave(content, isInitialized) {
  const previousAutosaveSectionsRef = useRef(null);

  useEffect(() => {
    if (!isInitialized || !isEditMode()) return;

    if (!previousAutosaveSectionsRef.current) {
      previousAutosaveSectionsRef.current = {
        hero: content.hero,
        about: content.about,
        contact: content.contact,
        registration: content.registration,
        socialLinks: content.socialLinks,
        whatsappGroups: content.whatsappGroups,
      };
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!isEditMode()) return;
      try {
        const previousSections = previousAutosaveSectionsRef.current;
        const hasChanges =
          previousSections.hero !== content.hero ||
          previousSections.about !== content.about ||
          previousSections.contact !== content.contact ||
          previousSections.registration !== content.registration ||
          previousSections.socialLinks !== content.socialLinks ||
          previousSections.whatsappGroups !== content.whatsappGroups;
        if (!hasChanges) {
          return;
        }

        // firestore.rules denies direct client writes to settings/* (see
        // api/admin-settings.js) — this used to be one atomic writeBatch
        // across 4 docs; these are independent content sections, so four
        // sequential calls through the Admin-SDK-backed endpoint are
        // functionally equivalent (no cross-doc invariant relies on them
        // landing together).
        const socialLinksArray = Array.isArray(content.socialLinks) ? content.socialLinks : [];
        const socialLinksObj = {
          instagram: socialLinksArray.find((l) => l && l.type === 'instagram')?.url || '',
          telegramChannel: socialLinksArray.find((l) => l && l.type === 'channel')?.url || '',
          telegramGroup: socialLinksArray.find((l) => l && l.type === 'discussion')?.url || '',
          whatsapp: socialLinksArray.find((l) => l && l.type === 'whatsapp')?.url || '',
          facebook: socialLinksArray.find((l) => l && l.type === 'facebook')?.url || '',
        };

        await callAdminSettings('set-settings', {
          docId: 'content',
          data: { hero: content.hero, about: content.about, contact: content.contact }
        });
        await callAdminSettings('set-settings', { docId: 'registrationSettings', data: content.registration });
        await callAdminSettings('set-settings', { docId: 'socialLinks', data: socialLinksObj });
        await callAdminSettings('set-settings', { docId: 'whatsappGroups', data: content.whatsappGroups });

        // The public pages (About, homepage, etc.) read this same data via
        // firebase/settings.js's cached getters. Without invalidating here,
        // a stale in-memory value could keep being served in this same
        // browser session until it naturally expires, making admin edits
        // look like they "didn't save" even though Firestore is correct.
        const { invalidateCache } = await import('../../firebase/dataAccess');
        await invalidateCache('contentSettings');

        previousAutosaveSectionsRef.current = {
          hero: content.hero,
          about: content.about,
          contact: content.contact,
          registration: content.registration,
          socialLinks: content.socialLinks,
          whatsappGroups: content.whatsappGroups,
        };
      } catch (error) {
        logError('Content.autosave', error);
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [content, isInitialized]);
}
