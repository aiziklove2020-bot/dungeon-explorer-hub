// Parties: create, edit, list and delete. Registration is by WhatsApp only
// (there are no site accounts), so nothing here touches registrations.
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { notifyAllSubscribersOfNewParty } from './pushSubscriptions';
import { getActiveParties as getActivePartiesFromDataAccess, getPartyById as getPartyByIdFromDataAccess, invalidateCache } from './dataAccess';
import {
  DEFAULT_PARTY_RETENTION_HOURS,
  computePartyExpirationIso,
  isPartyExpiredByDate,
} from '../../shared/partyExpiry.js';
import { getPartySettings } from './partySettings';

/**
 * Resolve the current admin-configured retention window. Used internally
 * by createParty/updateParty/recomputeAllPartiesExpiration so each write
 * carries a fresh `expiration` Timestamp without needing the caller to
 * know about the setting.
 */
const resolveRetentionHours = async () => {
  try {
    const s = await getPartySettings();
    return s?.retentionHours || DEFAULT_PARTY_RETENTION_HOURS;
  } catch {
    return DEFAULT_PARTY_RETENTION_HOURS;
  }
};

/** Compute a Firestore `Timestamp` for the party's expiration instant. */
const buildExpirationTimestamp = (date, retentionHours) => {
  const iso = computePartyExpirationIso(date, retentionHours);
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Timestamp.fromMillis(ms);
};

const PARTIES_COLLECTION = 'parties';

export const createParty = async (partyData) => {
  try {
    
    let dateValue = partyData.date;
    if (typeof dateValue === 'string') {
      // Parse ISO date string (YYYY-MM-DD) as local midnight to avoid UTC offset shifting the date
      const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        dateValue = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0);
      } else {
        dateValue = new Date(dateValue);
      }
    } else if (dateValue && dateValue.toDate) {
      dateValue = dateValue.toDate();
    }

    // Bake an Israel-TZ-aware `expiration` Timestamp directly onto the doc so
    // every read path (homepage, JSON-LD, cleanup jobs, content.json) can use
    // a single comparison `now >= expiration` instead of recomputing the rule.
    const retentionHours = await resolveRetentionHours();
    const expirationTs = buildExpirationTimestamp(dateValue, retentionHours);

    // Stamp the Hebrew weekday whenever the caller didn't supply one (imports
    // can save a party with an empty day, which rendered a bare date on the site).
    const dayName = partyData.day || (
      dateValue instanceof Date && !Number.isNaN(dateValue.getTime())
        ? dateValue.toLocaleDateString('he-IL', { weekday: 'long' })
        : ''
    );

    const party = {
      ...partyData,
      day: dayName,
      date: Timestamp.fromDate(dateValue),
      createdAt: Timestamp.now(),
      status: partyData.status || 'active',
      partyType: partyData.partyType || 'internal',
      needsPublish: true,
      ...(expirationTs ? { expiration: expirationTs } : {})
    };
    
    const partiesRef = collection(db, PARTIES_COLLECTION);
    const newPartyRef = doc(partiesRef);
    await setDoc(newPartyRef, party);

    // Clear cache
    await invalidateCache('activeParties');

    const created = { id: newPartyRef.id, ...party };

    // Fire-and-forget mobile push to every registered device (any site
    // visitor who opted in, not just paying subscribers) — internal to
    // notifyAllSubscribersOfNewParty, never awaited, so a slow/failed push
    // never delays party creation.
    notifyAllSubscribersOfNewParty(created);

    // No immediate Telegram announcement here on purpose: the scheduled/
    // manual broadcast (api/telegram-webhook.js sendAllPartyReminders) is
    // now the single source of truth for posting parties to Telegram — it
    // already covers every active party a few times a week, with a lock
    // against duplicate runs. Notifying immediately here too meant a party could get posted
    // twice through two uncoordinated paths.

    return created;
  } catch (error) {
    throw error;
  }
};

// Re-export from dataAccess for backward compatibility
export const getActiveParties = getActivePartiesFromDataAccess;

/** Admin-only: every party regardless of expiry status, so the main
 * management panel has full visibility (unlike the public/active-only
 * views elsewhere on the site). */
export const getAllParties = async () => {
  const partiesRef = collection(db, PARTIES_COLLECTION);
  const snap = await getDocs(partiesRef);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { id: d.id, ...data, date: data.date?.toDate ? data.date.toDate() : data.date };
    })
    .sort((a, b) => {
      const toMs = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());
      return toMs(a.date) - toMs(b.date);
    });
};

export const deleteExpiredParties = async () => {
  try {
    // Use dataAccess to get active parties (with caching)
    const activeParties = await getActiveParties();

    // Honour the admin-configured retention window. If the settings doc is
    // missing or unreachable we fall back to the shared default — never abort
    // cleanup, otherwise stale parties would accumulate.
    let retentionHours = DEFAULT_PARTY_RETENTION_HOURS;
    try {
      const settings = await getPartySettings();
      if (settings?.retentionHours) retentionHours = settings.retentionHours;
    } catch {
      // keep default
    }

    const nowMs = Date.now();
    const deletions = [];

    activeParties.forEach(party => {
      const partyDate = party.date instanceof Date ? party.date : new Date(party.date);
      // Expiry rule lives in shared/partyExpiry.js so the homepage filter,
      // this client-side cleanup, the publish-time deletion, and the import-skip
      // all agree (Israel-local 00:00 of labeled-day + retentionHours). Time
      // is intentionally ignored.
      if (isPartyExpiredByDate(partyDate, retentionHours, nowMs)) {
        const partyRef = doc(db, PARTIES_COLLECTION, party.id);
        deletions.push(deleteDoc(partyRef));
      }
    });
    
    if (deletions.length > 0) {
      await Promise.all(deletions);
      
      // Clear cache for active parties
      await invalidateCache('activeParties');
    }
    
    return deletions.length;
  } catch (error) {
    // Missing or insufficient permissions = Firestore rules block; fail silently
    if (error?.code !== 'permission-denied' && error?.code !== 'PERMISSION_DENIED') {
      console.error('Error deleting expired parties:', error);
    }
    return 0;
  }
};

/**
 * Recompute and persist the `expiration` Timestamp on every active party
 * using the supplied retention window. Returns the number of docs that were
 * actually written (i.e. whose expiration changed) so the admin UI can show
 * an accurate "X parties updated — git push needed" notice.
 *
 * Skips invalid dates and parties whose expiration already matches, to keep
 * `needsPublish` from flapping when nothing actually changed.
 */
export const recomputeAllPartiesExpiration = async (retentionHours) => {
  try {
    const partiesRef = collection(db, PARTIES_COLLECTION);
    const snapshot = await getDocs(partiesRef);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    let changedCount = 0;

    snapshot.forEach(d => {
      const data = d.data();
      if (!data?.date) return;
      const partyDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
      const newTs = buildExpirationTimestamp(partyDate, retentionHours);
      if (!newTs) return;
      const currentMs = data.expiration?.toMillis ? data.expiration.toMillis() : null;
      if (currentMs === newTs.toMillis()) return;
      batch.update(d.ref, { expiration: newTs, needsPublish: true });
      changedCount++;
    });

    if (changedCount > 0) {
      await batch.commit();
      await invalidateCache('activeParties');
    }
    return changedCount;
  } catch (error) {
    console.error('Error recomputing party expirations:', error);
    return 0;
  }
};

export const getPartyById = getPartyByIdFromDataAccess;

export const updateParty = async (partyId, partyData) => {
  try {
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);
    const updateData = {};

    // `name`/`description` and the date/expiration recompute below only run
    // for a full edit (PartyEditor always supplies `date`) — partial calls
    // like the admin's guardian list only pass the
    // one or two fields they're changing. Writing `name: undefined` (or an
    // invalid date parsed from `undefined`) made Firestore's updateDoc()
    // reject the whole write with "Unsupported field value: undefined",
    // silently breaking every partial update.
    if (partyData.name !== undefined) updateData.name = partyData.name;
    if (partyData.description !== undefined) updateData.description = partyData.description || '';

    if (partyData.date !== undefined) {
      let dateValue = partyData.date instanceof Date ? partyData.date : null;
      if (!dateValue) {
        const s = String(partyData.date);
        const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        dateValue = isoMatch
          ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0)
          : new Date(s);
      }
      updateData.date = Timestamp.fromDate(dateValue);

      // The party's expiration depends on `date`, so it's recomputed
      // whenever `date` is part of this update.
      const retentionHours = await resolveRetentionHours();
      const expirationTs = buildExpirationTimestamp(dateValue, retentionHours);
      if (expirationTs) updateData.expiration = expirationTs;
    }

    if (partyData.day !== undefined) updateData.day = partyData.day;
    if (partyData.time !== undefined) updateData.time = partyData.time;
    if (partyData.dj !== undefined) updateData.dj = partyData.dj;
    if (partyData.title !== undefined) updateData.title = partyData.title;
    if (partyData.registrationLink !== undefined) updateData.registrationLink = partyData.registrationLink;
    if (partyData.whatsappNumber !== undefined) updateData.whatsappNumber = partyData.whatsappNumber;
    // category/city drive the site's filter pills and were missing here
    // entirely — editing them on an existing party silently never saved,
    // only a brand-new party (createParty spreads every field) picked them up.
    if (partyData.category !== undefined) updateData.category = partyData.category || '';
    if (partyData.city !== undefined) updateData.city = partyData.city || '';

    if (partyData.partyType !== undefined) {
      updateData.partyType = partyData.partyType;
    }

    if (partyData.publishToInstagram !== undefined) {
      updateData.publishToInstagram = partyData.publishToInstagram === true;
    }
    if (partyData.badge !== undefined) updateData.badge = partyData.badge || '';

    // Assigned safety team, set from the admin's party panel (PartiesSection).
    if (partyData.guardians !== undefined) {
      updateData.guardians = Array.isArray(partyData.guardians) ? partyData.guardians : [];
    }

    if (partyData.imageURL !== undefined) {
      updateData.imageURL = partyData.imageURL;
      if (partyData.imageDeleteUrl) {
        updateData.imageDeleteUrl = partyData.imageDeleteUrl;
      }
    }

    updateData.needsPublish = true;
    
    await updateDoc(partyRef, updateData);
    
    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache('activeParties'); // Clear all parties cache
    
    return true;
  } catch (error) {
    throw error;
  }
};

export const deleteParty = async (partyId, imageDeleteUrl = null) => {
  try {
    // Use dataAccess to get party data (with caching)
    const partyData = await getPartyByIdFromDataAccess(partyId);
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    const partyRef = doc(db, PARTIES_COLLECTION, partyId);

    if (!imageDeleteUrl) {
      imageDeleteUrl = partyData.imageDeleteUrl || null;
    }

    await deleteDoc(partyRef);

    // Clear cache - CRITICAL: Must clear all related caches
    await invalidateCache(`party_${partyId}`); // Clear partyById cache
    await invalidateCache('activeParties'); // Clear all parties cache

    return { success: true, imageDeleteUrl };
  } catch (error) {
    throw error;
  }
};
