/**
 * Database read logger - logs all Firebase database calls
 * Logs are stored locally (localStorage) and NOT in Firebase to avoid additional reads
 */

const LOG_STORAGE_KEY = 'db_reads_log';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 entries

class DBLogger {
  constructor() {
    this.enabled = this.loadEnabledState();
    this.dbLoggingEnabled = this.loadDBLoggingState();
    this.logs = this.loadLogs();
  }

  loadEnabledState() {
    try {
      const stored = localStorage.getItem('db_logger_enabled');
      return stored !== null ? stored === 'true' : false; // Default to disabled
    } catch (error) {
      return false; // Default to disabled
    }
  }

  saveEnabledState() {
    try {
      localStorage.setItem('db_logger_enabled', this.enabled.toString());
    } catch (error) {
      console.error('Failed to save logger state:', error);
    }
  }

  loadDBLoggingState() {
    try {
      const stored = localStorage.getItem('db_logger_db_enabled');
      return stored !== null ? stored === 'true' : false; // Default to disabled - do not write to DB
    } catch (error) {
      return false; // Default to disabled
    }
  }

  saveDBLoggingState() {
    try {
      localStorage.setItem('db_logger_db_enabled', this.dbLoggingEnabled.toString());
    } catch (error) {
      console.error('Failed to save DB logger state:', error);
    }
  }

  loadLogs() {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load logs:', error);
      return [];
    }
  }

  saveLogs() {
    try {
      // Keep only last MAX_LOG_ENTRIES
      if (this.logs.length > MAX_LOG_ENTRIES) {
        this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  async log(functionName, params = {}, result = null, error = null, callerInfo = null) {
    if (!this.enabled) return;

    // Get caller information from stack trace if not provided
    let caller = null;
    let reason = null;
    
    // If callerInfo is an object with explicit caller and reason, use them
    if (callerInfo && typeof callerInfo === 'object') {
      caller = callerInfo.caller || callerInfo.file || null;
      reason = callerInfo.reason || null;
    } 
    // If callerInfo is a string, use it as caller
    else if (callerInfo && typeof callerInfo === 'string') {
      caller = callerInfo;
    }
    
    // If caller not provided, try to extract from stack trace
    if (!caller) {
      try {
        const stack = new Error().stack;
        if (stack) {
          const stackLines = stack.split('\n');
          // Skip first 3 lines: Error, this function, dbLogger.log
          // Get the actual caller (4th line)
          if (stackLines.length > 3) {
            const callerLine = stackLines[3] || stackLines[2] || '';
            // Extract file and line number
            const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) || 
                         callerLine.match(/at\s+(.+?):(\d+):(\d+)/);
            if (match) {
              const fileName = match[2] || match[1];
              const lineNumber = match[3] || match[2];
              // Extract just the file name without full path
              const shortFileName = fileName.split('/').pop() || fileName.split('\\').pop() || fileName;
              // Remove query params and hash from filename (e.g., ?t=123456)
              const cleanFileName = shortFileName.split('?')[0].split('#')[0];
              caller = `${cleanFileName}:${lineNumber}`;
            } else {
              // Fallback: use the whole line
              caller = callerLine.trim().substring(0, 100);
            }
          }
        }
      } catch (e) {
        caller = 'unknown';
      }
    }

    // Try to infer reason from caller context or use provided reason
    if (!reason) {
      if (caller) {
        if (caller.includes('useEffect') || caller.includes('loadActiveParties') || caller.includes('loadData')) {
          reason = 'Component mount/update';
        } else if (caller.includes('handle') || caller.includes('onClick') || caller.includes('onSubmit')) {
          reason = 'User action';
        } else if (caller.includes('save') || caller.includes('create') || caller.includes('update') || caller.includes('delete')) {
          reason = 'Data mutation';
        } else if (caller.includes('refresh') || caller.includes('load') || caller.includes('fetch')) {
          reason = 'Data refresh';
        } else if (caller.includes('check') || caller.includes('validate') || caller.includes('isUser') || caller.includes('isClient')) {
          reason = 'Validation/Check';
        } else if (caller.includes('filter') || caller.includes('map') || caller.includes('forEach')) {
          reason = 'Data processing';
        } else if (caller.includes('BalanceTables') || caller.includes('RegistrationItem')) {
          reason = 'UI rendering';
        } else {
          reason = 'Other';
        }
      } else {
        reason = 'Unknown';
      }
    }

    // Calculate additional metadata
    const resultSize = result ? (Array.isArray(result) ? result.length : typeof result === 'object' ? Object.keys(result).length : 1) : 0;
    const isCached = functionName.includes('(cached)');
    // For cache hits, readCount should be 0 (no actual DB reads)
    const readCount = isCached ? 0 : this.estimateReadCount(functionName, params, result);
    
    // Get more detailed information about the result
    let resultType = 'null';
    let resultDetails = null;
    if (result !== null) {
      if (Array.isArray(result)) {
        resultType = 'array';
        resultDetails = {
          length: result.length,
          sample: result.length > 0 ? (typeof result[0] === 'object' ? Object.keys(result[0]).join(', ') : typeof result[0]) : null
        };
      } else if (typeof result === 'object') {
        resultType = 'object';
        resultDetails = {
          keys: Object.keys(result).slice(0, 10), // First 10 keys
          keyCount: Object.keys(result).length
        };
      } else {
        resultType = typeof result;
        resultDetails = String(result).substring(0, 50); // First 50 chars
      }
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      function: functionName,
      params: this.sanitizeParams(params),
      success: error === null,
      error: error ? error.message : null,
      resultSize,
      readCount,
      isCached,
      resultType,
      resultDetails,
      caller: caller || 'unknown',
      reason: reason || 'unknown',
      duration: null // Will be set if available
    };

    // Save to local storage - only if logger is enabled
    if (this.enabled) {
      this.logs.push(logEntry);
      this.saveLogs();

      // Save to Firestore only if DB logging is enabled
      if (this.dbLoggingEnabled) {
        try {
          const { saveDBReadLog } = await import('../firebase/dbReadLogs');
          saveDBReadLog(logEntry).catch(() => {
            // Silently fail - don't break the app
          });
        } catch (err) {
          // Ignore if import fails
        }
      }
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB Read] ${functionName}`, {
        params: logEntry.params,
        reads: logEntry.readCount,
        success: logEntry.success
      });
    }
  }

  sanitizeParams(params) {
    // Remove sensitive data and large objects
    const sanitized = { ...params };
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.token) sanitized.token = '***';
    if (sanitized.registrations && Array.isArray(sanitized.registrations)) {
      sanitized.registrations = `[${sanitized.registrations.length} items]`;
    }
    return sanitized;
  }

  estimateReadCount(functionName, params, result) {
    // Estimate Firebase read count based on function and result
    if (functionName.includes('getAll') || functionName.includes('getActiveParties')) {
      return Array.isArray(result) ? result.length : 1;
    }
    if (functionName.includes('getBalanceMatches') || functionName.includes('getPartyById')) {
      return 1; // Single document read
    }
    if (functionName.includes('getUserByPhone')) {
      return 1; // Query read (could be multiple if no index, but usually 1)
    }
    if (functionName.includes('getDocs')) {
      return Array.isArray(result) ? result.length : 1;
    }
    if (functionName.includes('getDoc')) {
      return 1;
    }
    return 1; // Default
  }

  getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayLogs = this.logs.filter(log => new Date(log.timestamp) >= today);
    const totalReads = todayLogs.reduce((sum, log) => sum + log.readCount, 0);
    const totalCalls = todayLogs.length;
    
    const byFunction = {};
    todayLogs.forEach(log => {
      byFunction[log.function] = (byFunction[log.function] || 0) + log.readCount;
    });

    return {
      today: {
        totalReads,
        totalCalls,
        byFunction: Object.entries(byFunction)
          .sort((a, b) => b[1] - a[1])
          .map(([func, reads]) => ({ function: func, reads }))
      },
      allTime: {
        totalReads: this.logs.reduce((sum, log) => sum + log.readCount, 0),
        totalCalls: this.logs.length
      }
    };
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit).reverse(); // Most recent first
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  exportLogs() {
    const stats = this.getStats();
    return {
      stats,
      logs: this.logs,
      exportedAt: new Date().toISOString()
    };
  }

  enable() {
    this.enabled = true;
    this.saveEnabledState();
  }

  disable() {
    this.enabled = false;
    this.saveEnabledState();
  }

  toggle() {
    this.enabled = !this.enabled;
    this.saveEnabledState();
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  enableDBLogging() {
    this.dbLoggingEnabled = true;
    this.saveDBLoggingState();
  }

  disableDBLogging() {
    this.dbLoggingEnabled = false;
    this.saveDBLoggingState();
  }

  toggleDBLogging() {
    this.dbLoggingEnabled = !this.dbLoggingEnabled;
    this.saveDBLoggingState();
    return this.dbLoggingEnabled;
  }

  isDBLoggingEnabled() {
    return this.dbLoggingEnabled;
  }
}

// Singleton instance
export const dbLogger = new DBLogger();
