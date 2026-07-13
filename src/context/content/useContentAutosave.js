import { useEffect, useRef } from 'react';
import { isEditMode } from '../../services/contentService';
import { logError } from '../../utils/logger';

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

        const { doc, writeBatch } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../../firebase/config');

        const batch = writeBatch(firestoreDb);
        const SETTINGS_COLLECTION = 'settings';

        const socialLinksArray = Array.isArray(content.socialLinks) ? content.socialLinks : [];
        const socialLinksObj = {
          instagram: socialLinksArray.find((l) => l && l.type === 'instagram')?.url || '',
          telegramChannel: socialLinksArray.find((l) => l && l.type === 'channel')?.url || '',
          telegramGroup: socialLinksArray.find((l) => l && l.type === 'discussion')?.url || '',
          whatsapp: socialLinksArray.find((l) => l && l.type === 'whatsapp')?.url || '',
          facebook: socialLinksArray.find((l) => l && l.type === 'facebook')?.url || '',
        };

        const contentRef = doc(firestoreDb, SETTINGS_COLLECTION, 'content');
        batch.set(contentRef, {
          hero: content.hero,
          about: content.about,
          contact: content.contact,
        }, { merge: true });

        const registrationRef = doc(firestoreDb, SETTINGS_COLLECTION, 'registrationSettings');
        batch.set(registrationRef, content.registration, { merge: true });

        const socialLinksRef = doc(firestoreDb, SETTINGS_COLLECTION, 'socialLinks');
        batch.set(socialLinksRef, socialLinksObj, { merge: true });

        const whatsappGroupsRef = doc(firestoreDb, SETTINGS_COLLECTION, 'whatsappGroups');
        batch.set(whatsappGroupsRef, content.whatsappGroups, { merge: true });

        await batch.commit();

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
