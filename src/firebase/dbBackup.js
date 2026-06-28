/**
 * Full Firestore DB backup and restore.
 * Export: one-to-one snapshot including document IDs (UIDs). Optionally by selected collections.
 * Import: replaces existing data with backup (clears then writes so result matches backup exactly).
 * Firebase supports writing with custom document ID via setDoc(doc(db, coll, id), data) — UID restore is supported.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

const BATCH_SIZE = 500;

/** Top-level collections to include in backup (logs excluded: webhookLogs, dbReadLogs) */
const TOP_LEVEL_COLLECTIONS = [
  'users',
  'parties',
  'registrations',
  'storeProducts',
  'storeOrders',
  'rssFeeds',
  'supportChatTelegramMap'
];

/** All exportable collection keys (for UI checkboxes). Order: top-level, then settings, then supportChat */
export const EXPORTABLE_COLLECTION_KEYS = [
  ...TOP_LEVEL_COLLECTIONS,
  'settings',
  'supportChat'
];

/** Settings collection: document IDs to export/import as one "settings" object */
const SETTINGS_DOC_IDS = [
  'content',
  'registrationSettings',
  'socialLinks',
  'whatsappGroups',
  'telegram',
  'supportChat',
  'aboutStory',
  'storeSettings'
];

/**
 * Serialize a value for JSON. Convert Firestore Timestamp to { _type: 'timestamp', _seconds, _nanoseconds }.
 */
function serializeValue(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) {
    return { _type: 'timestamp', _seconds: Math.floor(value.getTime() / 1000), _nanoseconds: (value.getTime() % 1000) * 1000000 };
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return { _type: 'timestamp', _seconds: Math.floor(d.getTime() / 1000), _nanoseconds: (d.getTime() % 1000) * 1000000 };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const k of Object.keys(value)) out[k] = serializeValue(value[k]);
    return out;
  }
  return value;
}

/**
 * Deserialize a value from JSON. Restore { _type: 'timestamp', ... } to Firestore Timestamp.
 */
function deserializeValue(value) {
  if (value === null || value === undefined) return value;
  if (value && value._type === 'timestamp' && (value._seconds != null || value._millis != null)) {
    if (value._seconds != null) return Timestamp.fromMillis(value._seconds * 1000 + (value._nanoseconds || 0) / 1000000);
    return Timestamp.fromMillis(value._millis);
  }
  if (Array.isArray(value)) return value.map(deserializeValue);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const k of Object.keys(value)) {
      if (k === '_type') continue;
      out[k] = deserializeValue(value[k]);
    }
    return out;
  }
  return value;
}

/**
 * Export Firestore DB to a plain object (one-to-one structure, document IDs preserved as keys).
 * @param {string[]} [selectedCollections] - If provided, only these collection keys are exported (e.g. ['users','parties','settings']). Otherwise all.
 */
export async function exportFullDb(selectedCollections = null) {
  const include = (key) => !selectedCollections || selectedCollections.includes(key);
  const out = { _version: 1, _exportedAt: new Date().toISOString(), _includeIds: true, collections: {} };

  for (const collName of TOP_LEVEL_COLLECTIONS) {
    if (!include(collName)) continue;
    try {
      const snapshot = await getDocs(collection(db, collName));
      const docs = {};
      snapshot.docs.forEach((d) => {
        docs[d.id] = serializeValue(d.data());
      });
      out.collections[collName] = docs;
    } catch (err) {
      out.collections[collName] = { _error: err.message };
    }
  }

  if (include('settings')) {
    const settingsDocs = {};
    for (const docId of SETTINGS_DOC_IDS) {
      try {
        const ref = doc(db, 'settings', docId);
        const snap = await getDoc(ref);
        if (snap.exists()) settingsDocs[docId] = serializeValue(snap.data());
        else settingsDocs[docId] = null;
      } catch (err) {
        settingsDocs[docId] = { _error: err.message };
      }
    }
    out.collections.settings = settingsDocs;
  }

  if (include('supportChat')) {
    const supportChatSessions = {};
    try {
      const sessionsSnap = await getDocs(collection(db, 'supportChat'));
      for (const sessionDoc of sessionsSnap.docs) {
        const sessionId = sessionDoc.id;
        const messagesRef = collection(db, 'supportChat', sessionId, 'messages');
        const messagesSnap = await getDocs(messagesRef);
        const messages = {};
        messagesSnap.docs.forEach((d) => {
          messages[d.id] = serializeValue(d.data());
        });
        supportChatSessions[sessionId] = { _sessionData: serializeValue(sessionDoc.data()), messages };
      }
      out.collections.supportChat = supportChatSessions;
    } catch (err) {
      out.collections.supportChat = { _error: err.message };
    }
  }

  return out;
}

/** Compare backup (serialized) data with existing doc data: true if same (skip write). */
function docDataEquals(rawBackup, existingData) {
  if (!existingData || typeof existingData !== 'object') return false;
  const backupSerialized = JSON.stringify(serializeValue(deserializeValue(rawBackup)));
  const existingSerialized = JSON.stringify(serializeValue(existingData));
  return backupSerialized === existingSerialized;
}

/**
 * Import: MERGE only (no delete). For each document in backup we setDoc(..., { merge: true }).
 * Skips write when the document already exists with the same content (saves writes).
 */
export async function importFullDb(data, onProgress = null) {
  if (!data || !data.collections) throw new Error('Invalid backup: missing collections');

  const report = (msg, current, total) => {
    if (typeof onProgress === 'function') onProgress(msg, current, total);
  };

  const collections = data.collections;
  let totalSteps = 0;
  Object.keys(collections).forEach((key) => {
    const c = collections[key];
    if (c && typeof c === 'object' && !c._error) {
      if (key === 'supportChat') {
        Object.keys(c).forEach((sid) => {
          if (c[sid] && c[sid].messages) totalSteps += Object.keys(c[sid].messages).length;
          totalSteps += 1;
        });
      } else if (key === 'settings') {
        totalSteps += Object.keys(c).length;
      } else {
        totalSteps += Object.keys(c).length;
      }
    }
  });
  let step = 0;

  for (const collName of TOP_LEVEL_COLLECTIONS) {
    const docs = collections[collName];
    if (!docs || docs._error) continue;
    const ids = Object.keys(docs).filter((id) => !id.startsWith('_'));
    for (const id of ids) {
      const raw = docs[id];
      if (raw && typeof raw === 'object' && raw._error) continue;
      const ref = doc(db, collName, id);
      const restored = deserializeValue(raw);
      if (restored && typeof restored !== 'object') { step++; continue; }
      const existing = await getDoc(ref);
      if (existing.exists() && docDataEquals(raw, existing.data())) {
        step++;
        if (step % 50 === 0) report(`Merge ${collName} (skip unchanged)...`, step, totalSteps);
        continue;
      }
      await setDoc(ref, restored, { merge: true });
      step++;
      if (step % 50 === 0) report(`Merge ${collName}...`, step, totalSteps);
    }
  }

  if (collections.settings && !collections.settings._error) {
    for (const docId of Object.keys(collections.settings)) {
      if (docId.startsWith('_')) continue;
      const raw = collections.settings[docId];
      if (raw && typeof raw === 'object' && raw._error) continue;
      const ref = doc(db, 'settings', docId);
      const restored = deserializeValue(raw);
      if (restored && typeof restored !== 'object') { step++; continue; }
      const existing = await getDoc(ref);
      if (existing.exists() && docDataEquals(raw, existing.data())) {
        step++;
        report('Merge settings...', step, totalSteps);
        continue;
      }
      await setDoc(ref, restored, { merge: true });
      step++;
      report('Merge settings...', step, totalSteps);
    }
  }

  if (collections.supportChat && !collections.supportChat._error) {
    for (const sessionId of Object.keys(collections.supportChat)) {
      if (sessionId.startsWith('_')) continue;
      const sessionData = collections.supportChat[sessionId];
      if (!sessionData || sessionData._error) continue;
      const sessionDocData = sessionData._sessionData;
      const sessionRef = doc(db, 'supportChat', sessionId);
      if (sessionDocData && typeof sessionDocData === 'object' && !sessionDocData._error) {
        const existing = await getDoc(sessionRef);
        if (!existing.exists() || !docDataEquals(sessionDocData, existing.data())) {
          await setDoc(sessionRef, deserializeValue(sessionDocData), { merge: true });
        }
      } else {
        await setDoc(sessionRef, {}, { merge: true });
      }
      step++;
      const messages = sessionData.messages;
      if (messages && typeof messages === 'object') {
        const msgIds = Object.keys(messages).filter((id) => !id.startsWith('_'));
        for (const msgId of msgIds) {
          const raw = messages[msgId];
          if (raw && typeof raw === 'object' && raw._error) continue;
          const ref = doc(db, 'supportChat', sessionId, 'messages', msgId);
          const restored = deserializeValue(raw);
          if (restored && typeof restored !== 'object') { step++; continue; }
          const existing = await getDoc(ref);
          if (existing.exists() && docDataEquals(raw, existing.data())) {
            step++;
            continue;
          }
          await setDoc(ref, restored, { merge: true });
          step++;
        }
      }
      report('Merge supportChat...', step, totalSteps);
    }
  }

  report('Done', totalSteps, totalSteps);
  return true;
}

/**
 * Get a short summary of DB (collection names and doc counts) for display.
 */
export async function getDbSummary() {
  const summary = { collections: {}, totalDocs: 0 };
  const collNames = [...TOP_LEVEL_COLLECTIONS, 'settings', 'supportChat'];
  for (const name of collNames) {
    try {
      if (name === 'settings') {
        let count = 0;
        for (const docId of SETTINGS_DOC_IDS) {
          const ref = doc(db, 'settings', docId);
          const snap = await getDoc(ref);
          if (snap.exists()) count++;
        }
        summary.collections[name] = count;
        summary.totalDocs += count;
      } else if (name === 'supportChat') {
        const sessionsSnap = await getDocs(collection(db, 'supportChat'));
        let messagesCount = 0;
        for (const sessionDoc of sessionsSnap.docs) {
          const messagesSnap = await getDocs(collection(db, 'supportChat', sessionDoc.id, 'messages'));
          messagesCount += messagesSnap.docs.length;
        }
        summary.collections[name] = `${sessionsSnap.docs.length} sessions, ${messagesCount} messages`;
        summary.totalDocs += sessionsSnap.docs.length + messagesCount;
      } else {
        const snap = await getDocs(collection(db, name));
        summary.collections[name] = snap.docs.length;
        summary.totalDocs += snap.docs.length;
      }
    } catch (err) {
      summary.collections[name] = `error: ${err.message}`;
    }
  }
  return summary;
}
