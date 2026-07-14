import { setByPath } from './defaults';
import { logError } from '../../utils/logger';

/**
 * Per-section update functions extracted from ContentContext. Each mutator
 * updates local React state eagerly (optimistic) and fires a Firestore write
 * in the background. If the write fails the UI stays with the optimistic
 * state — this is intentional, the autosave effect will retry on the next
 * change, and admin always sees the current edit.
 *
 * Called with `setContent` from useContentLoader. Returns an object of
 * stable references (plain closures, not bound to a React hook lifecycle).
 */
export function createContentMutators(setContent, getContent) {
  const updateHero = async (heroData) => {
    setContent((prev) => ({ ...prev, hero: { ...heroData } }));
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');
      const contentRef = doc(firestoreDb, 'settings', 'content');
      await setDoc(contentRef, { hero: heroData }, { merge: true });
    } catch (error) {
      logError('Content.updateHero', error);
    }
  };

  const addEvent = async (event) => {
    const { createParty } = await import('../../firebase/parties');

    const [day, month] = event.date.split('.');
    const currentYear = new Date().getFullYear();
    const eventDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
    if (eventDate < new Date()) {
      eventDate.setFullYear(currentYear + 1);
    }

    const partyData = {
      name: event.title || event.day || 'Event',
      description: event.description || '',
      date: eventDate,
      maleLimit: 100,
      femaleLimit: 100,
      imageURL: event.img || '',
      day: event.day || '',
      time: event.time || '',
      dj: event.dj || '',
      title: event.title || '',
      registrationLink: event.registrationLink || '',
      partyType: 'internal',
    };

    const createdParty = await createParty(partyData);
    const nextEvent = { ...event, id: createdParty?.id || event.id };
    setContent((prev) => ({ ...prev, events: [...prev.events, nextEvent] }));
  };

  // Used by updateEvent + deleteEvent to resolve the Firestore party whose
  // (date + title) matches a CMS event row. Parties own the registration
  // data; we only touch the party when the matching row actually changes.
  const findMatchingParty = (activeParties, oldEvent) =>
    activeParties.find((p) => {
      const pDate = new Date(p.date)
        .toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
        .replace(/\./g, '.');
      return pDate === oldEvent.date && (p.title === oldEvent.title || p.name === oldEvent.title);
    });

  const updateEvent = async (index, eventData) => {
    const currentEvents = getContent().events;
    const oldEvent = currentEvents[index];
    if (!oldEvent) return;

    const { getActiveParties: loadActive, updateParty } = await import('../../firebase/parties');
    let activeParties = [];
    try {
      activeParties = await loadActive();
      if (!Array.isArray(activeParties)) activeParties = [];
    } catch {
      activeParties = [];
    }

    const matchingParty = findMatchingParty(activeParties, oldEvent);

    if (matchingParty) {
      const [day, month] = eventData.date.split('.');
      const currentYear = new Date().getFullYear();
      const eventDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
      if (eventDate < new Date()) {
        eventDate.setFullYear(currentYear + 1);
      }

      await updateParty(matchingParty.id, {
        name: eventData.title || eventData.day || 'Event',
        description: eventData.description || '',
        date: eventDate,
        imageURL: eventData.img || '',
        day: eventData.day || '',
        time: eventData.time || '',
        dj: eventData.dj || '',
        title: eventData.title || '',
        registrationLink: eventData.registrationLink || '',
      });
    }

    setContent((prev) => ({
      ...prev,
      events: prev.events.map((ev, i) => (i === index ? { ...eventData } : { ...ev })),
    }));
  };

  const deleteEvent = async (index) => {
    const currentEvents = getContent().events;
    const eventToDelete = currentEvents[index];
    if (!eventToDelete) return;

    const { getActiveParties: loadActive, deleteParty } = await import('../../firebase/parties');
    let activeParties = [];
    try {
      activeParties = await loadActive();
      if (!Array.isArray(activeParties)) activeParties = [];
    } catch {
      activeParties = [];
    }

    const matchingParty = findMatchingParty(activeParties, eventToDelete);
    if (matchingParty) {
      await deleteParty(matchingParty.id);
    }

    setContent((prev) => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index),
    }));
  };

  const reorderEvents = (newOrder) => {
    setContent((prev) => ({
      ...prev,
      events: newOrder.map((index) => ({ ...prev.events[index] })),
    }));
  };

  const updateAbout = async (aboutData) => {
    setContent((prev) => ({
      ...prev,
      about: {
        ...aboutData,
        infoCards: aboutData.infoCards ? aboutData.infoCards.map((card) => ({ ...card })) : prev.about.infoCards,
        steps: aboutData.steps ? aboutData.steps.map((step) => ({ ...step })) : prev.about.steps,
      },
    }));

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');
      const contentRef = doc(firestoreDb, 'settings', 'content');
      await setDoc(contentRef, {
        about: {
          ...aboutData,
          infoCards: aboutData.infoCards ? aboutData.infoCards.map((card) => ({ ...card })) : [],
          steps: aboutData.steps ? aboutData.steps.map((step) => ({ ...step })) : [],
        },
      }, { merge: true });
    } catch (error) {
      logError('Content.updateAbout', error);
    }
  };

  const updateContact = async (contactData) => {
    setContent((prev) => ({ ...prev, contact: { ...contactData } }));
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');
      const contentRef = doc(firestoreDb, 'settings', 'content');
      await setDoc(contentRef, { contact: { ...contactData } }, { merge: true });
    } catch (error) {
      logError('Content.updateContact', error);
    }
  };

  const updateRegistration = async (registrationData) => {
    setContent((prev) => ({
      ...prev,
      registration: { ...prev.registration, ...registrationData },
    }));
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');
      const registrationRef = doc(firestoreDb, 'settings', 'registrationSettings');
      await setDoc(registrationRef, { ...registrationData }, { merge: true });
    } catch (error) {
      logError('Content.updateRegistration', error);
    }
  };

  const updateSocialLinks = async (links) => {
    if (Array.isArray(links)) {
      setContent((prev) => ({ ...prev, socialLinks: links.map((link) => ({ ...link })) }));
    } else {
      const linksArray = [
        { type: 'instagram', label: 'אינסטגרם', url: links.instagram || '#' },
        { type: 'channel', label: 'ערוץ טלגרם', url: links.telegramChannel || '#' },
        { type: 'discussion', label: 'קבוצת טלגרם', url: links.telegramGroup || '#' },
        { type: 'whatsapp', label: 'מדברים בדסמ', url: links.whatsapp || '#' },
        { type: 'facebook', label: 'פייסבוק', url: links.facebook || '#' },
      ];
      setContent((prev) => ({ ...prev, socialLinks: linksArray }));
    }

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');

      const linksToPersist = Array.isArray(links)
        ? {
            instagram: links.find((l) => l && l.type === 'instagram')?.url || '',
            telegramChannel: links.find((l) => l && l.type === 'channel')?.url || '',
            telegramGroup: links.find((l) => l && l.type === 'discussion')?.url || '',
            whatsapp: links.find((l) => l && l.type === 'whatsapp')?.url || '',
            facebook: links.find((l) => l && l.type === 'facebook')?.url || '',
          }
        : {
            instagram: links?.instagram || '',
            telegramChannel: links?.telegramChannel || '',
            telegramGroup: links?.telegramGroup || '',
            whatsapp: links?.whatsapp || '',
            facebook: links?.facebook || '',
          };

      const socialLinksRef = doc(firestoreDb, 'settings', 'socialLinks');
      await setDoc(socialLinksRef, linksToPersist, { merge: true });
    } catch (error) {
      logError('Content.updateSocialLinks', error);
    }
  };

  const updateWhatsappGroups = async (groups) => {
    setContent((prev) => ({ ...prev, whatsappGroups: { ...groups } }));
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');
      const whatsappGroupsRef = doc(firestoreDb, 'settings', 'whatsappGroups');
      await setDoc(whatsappGroupsRef, { ...groups }, { merge: true });
    } catch (error) {
      logError('Content.updateWhatsappGroups', error);
    }
  };

  /**
   * Update a single content field by dot path (e.g. "hero.titleHebrew",
   * "about.infoCards.0.title") and persist. Used by EditableContent for
   * inline edit mode. Guarded against top-level sections we don't ship.
   */
  const updateContentPath = async (path, value) => {
    if (!path || typeof path !== 'string') return;
    const section = path.split('.')[0];
    if (
      section !== 'hero' &&
      section !== 'about' &&
      section !== 'contact' &&
      section !== 'labels' &&
      section !== 'store'
    ) {
      return;
    }
    const restPath = path.split('.').slice(1).join('.');
    if (!restPath) return;

    const currentSection = getContent()[section];
    const updatedSection = setByPath(currentSection || {}, restPath, value);

    setContent((prev) => ({ ...prev, [section]: updatedSection }));

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../../firebase/config');
      const contentRef = doc(firestoreDb, 'settings', 'content');
      await setDoc(contentRef, { [section]: updatedSection }, { merge: true });
    } catch (error) {
      console.error('Failed to persist content path:', path, error);
    }
  };

  return {
    updateHero,
    addEvent,
    updateEvent,
    deleteEvent,
    reorderEvents,
    updateAbout,
    updateContact,
    updateRegistration,
    updateSocialLinks,
    updateWhatsappGroups,
    updateContentPath,
  };
}
