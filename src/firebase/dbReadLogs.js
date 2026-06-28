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

const DB_READ_LOGS_COLLECTION = 'dbReadLogs';
const MAX_LOGS = 5000; // Keep more logs for analysis
const BATCH_SIZE = 10; // Write logs in batches to reduce writes

// Queue for batching writes
let logQueue = [];
let batchTimeout = null;

/**
 * Save a database read log to Firestore
 * Uses batching to reduce write operations
 */
export const saveDBReadLog = async (logData) => {
  try {
    // Add to queue
    logQueue.push({
      ...logData,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });

    // If queue is full, flush immediately
    if (logQueue.length >= BATCH_SIZE) {
      await flushLogQueue();
      return;
    }

    // Otherwise, set timeout to flush after 2 seconds
    if (!batchTimeout) {
      batchTimeout = setTimeout(async () => {
        await flushLogQueue();
        batchTimeout = null;
      }, 2000);
    }
  } catch (err) {
    // Silently fail - don't break the app if logging fails
    console.error('Failed to queue log:', err);
  }
};

/**
 * Flush the log queue to Firestore
 */
const flushLogQueue = async () => {
  if (logQueue.length === 0) return;

  try {
    const batch = writeBatch(db);
    const logsToWrite = [...logQueue];
    logQueue = []; // Clear queue

    // Add all logs to batch
    logsToWrite.forEach(log => {
      const logRef = doc(collection(db, DB_READ_LOGS_COLLECTION));
      batch.set(logRef, log);
    });

    // Commit batch (single write operation for multiple logs)
    await batch.commit();

    // Cleanup old logs asynchronously
    cleanupOldLogs().catch(() => {
      // Ignore cleanup errors
    });
  } catch (err) {
    console.error('Failed to flush log queue:', err);
    // Re-add logs to queue if write failed (up to a limit)
    if (logQueue.length < BATCH_SIZE * 2) {
      logQueue = [...logQueue, ...logsToWrite];
    }
  }
};

/**
 * Cleanup old logs to prevent collection from growing too large
 */
const cleanupOldLogs = async () => {
  try {
    const logsRef = collection(db, DB_READ_LOGS_COLLECTION);
    
    // Get total count
    const allLogs = await getDocs(logsRef);
    
    if (allLogs.size <= MAX_LOGS) {
      return; // No cleanup needed
    }

    // Get oldest logs to delete
    const q = query(
      logsRef,
      orderBy('timestamp', 'asc'),
      limit(allLogs.size - MAX_LOGS)
    );
    
    const oldLogs = await getDocs(q);
    const batch = writeBatch(db);
    
    oldLogs.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
  } catch (err) {
    // Ignore cleanup errors
  }
};

/**
 * Get recent logs from Firestore
 */
export const getDBReadLogs = async (limitCount = 100, startAfter = null) => {
  try {
    const logsRef = collection(db, DB_READ_LOGS_COLLECTION);
    let q = query(
      logsRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    if (startAfter) {
      q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        startAfter(startAfter),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get stats from logs
 */
export const getDBReadLogsStats = async (startDate = null, endDate = null) => {
  try {
    const logsRef = collection(db, DB_READ_LOGS_COLLECTION);
    let q;

    if (startDate || endDate) {
      const constraints = [orderBy('timestamp', 'desc')];
      if (startDate) {
        constraints.unshift(where('timestamp', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        constraints.unshift(where('timestamp', '<=', Timestamp.fromDate(endDate)));
      }
      q = query(logsRef, ...constraints);
    } else {
      q = query(logsRef, orderBy('timestamp', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => doc.data());

    const stats = {
      totalReads: 0,
      totalCalls: logs.length,
      byFunction: {},
      byDate: {},
      errors: 0,
      cacheHits: 0
    };

    logs.forEach(log => {
      stats.totalReads += log.readCount || 0;
      stats.byFunction[log.function] = (stats.byFunction[log.function] || 0) + (log.readCount || 0);
      
      const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || log.createdAt);
      const date = timestamp.toISOString().split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + (log.readCount || 0);
      
      if (!log.success) stats.errors++;
      if (log.readCount === 0) stats.cacheHits++;
    });

    return stats;
  } catch (error) {
    throw error;
  }
};

/**
 * Clear all logs (admin only) - Truncates the log table
 * Handles large numbers of logs by processing in batches (Firestore batch limit is 500)
 * Also clears the pending log queue
 */
export const clearAllDBReadLogs = async () => {
  try {
    // Clear pending log queue first
    logQueue = [];
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    
    const logsRef = collection(db, DB_READ_LOGS_COLLECTION);
    const allLogs = await getDocs(logsRef);
    
    if (allLogs.empty) {
      return true; // Already empty
    }
    
    // Process in batches of 500 (Firestore batch limit)
    const BATCH_LIMIT = 500;
    const docs = allLogs.docs;
    
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + BATCH_LIMIT);
      
      batchDocs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Flush queue on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    flushLogQueue();
  });
}

