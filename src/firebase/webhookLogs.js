import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  deleteDoc,
  doc,
  Timestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

const WEBHOOK_LOGS_COLLECTION = 'webhookLogs';
const MAX_LOGS = 1000; 

// Check if webhook logging is enabled (default: disabled)
export const isWebhookLoggingEnabled = () => {
  try {
    const stored = localStorage.getItem('webhook_logger_enabled');
    return stored !== null ? stored === 'true' : false; // Default to disabled
  } catch (error) {
    return false; // Default to disabled
  }
};

// Enable webhook logging
export const enableWebhookLogging = () => {
  try {
    localStorage.setItem('webhook_logger_enabled', 'true');
  } catch (error) {
    console.error('Failed to enable webhook logging:', error);
  }
};

// Disable webhook logging
export const disableWebhookLogging = () => {
  try {
    localStorage.setItem('webhook_logger_enabled', 'false');
  } catch (error) {
    console.error('Failed to disable webhook logging:', error);
  }
};

// Toggle webhook logging
export const toggleWebhookLogging = () => {
  const current = isWebhookLoggingEnabled();
  if (current) {
    disableWebhookLogging();
  } else {
    enableWebhookLogging();
  }
  return !current;
};

export const saveWebhookLog = async (payload, success, error = null) => {
  // Don't create logs if logging is disabled
  if (!isWebhookLoggingEnabled()) {
    return;
  }

  try {
    const logData = {
      payload: payload,
      success: success,
      error: error || null,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, WEBHOOK_LOGS_COLLECTION), logData);

    cleanupOldLogs().catch(() => {
      
    });
  } catch (err) {

  }
};

const cleanupOldLogs = async () => {
  try {
    const logsRef = collection(db, WEBHOOK_LOGS_COLLECTION);
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.size > MAX_LOGS) {
      const logs = querySnapshot.docs;
      const logsToDelete = logs.slice(MAX_LOGS); 

      const deletePromises = logsToDelete.map(logDoc => deleteDoc(doc(db, WEBHOOK_LOGS_COLLECTION, logDoc.id)));
      await Promise.all(deletePromises);
    }
  } catch (err) {
    
  }
};

export const getWebhookLogs = async (limitCount = 100) => {
  try {
    const logsRef = collection(db, WEBHOOK_LOGS_COLLECTION);
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp)
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Clear all webhook logs - Truncates the log table
 * Handles large numbers of logs by processing in batches (Firestore batch limit is 500)
 */
export const clearWebhookLogs = async () => {
  try {
    const logsRef = collection(db, WEBHOOK_LOGS_COLLECTION);
    const querySnapshot = await getDocs(logsRef);

    if (querySnapshot.empty) {
      return; // Already empty
    }

    // Process in batches of 500 (Firestore batch limit)
    const BATCH_LIMIT = 500;
    const docs = querySnapshot.docs;
    
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + BATCH_LIMIT);
      
      batchDocs.forEach(logDoc => {
        batch.delete(doc(db, WEBHOOK_LOGS_COLLECTION, logDoc.id));
      });
      
      await batch.commit();
    }
  } catch (error) {
    throw error;
  }
};

export const getWebhookLogsCount = async () => {
  try {
    const logsRef = collection(db, WEBHOOK_LOGS_COLLECTION);
    const querySnapshot = await getDocs(logsRef);
    return querySnapshot.size;
  } catch (error) {
    return 0;
  }
};

