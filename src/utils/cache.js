/**
 * Simple in-memory cache for Firebase reads
 * Reduces database reads by caching results for a short period
 * Includes request deduplication to prevent concurrent identical requests
 */

const cache = new Map();
const pendingRequests = new Map(); // Track pending requests to deduplicate
const CACHE_TTL = 600000; // 10 minutes cache — for data that changes rarely

// This cache is per-process (in-memory), so a browser-side invalidateCache()
// call can never reach the server's own SSR process cache — an admin
// deleting/editing a party wouldn't show up on the public site for up to
// CACHE_TTL. Parties change far more often than settings/users do, so they
// get a much shorter TTL to bound that staleness window.
const SHORT_CACHE_TTL = 30000; // 30 seconds
const SHORT_TTL_KEY_PREFIXES = ['activeParties'];

const ttlFor = (key) => (SHORT_TTL_KEY_PREFIXES.some((p) => key.startsWith(p)) ? SHORT_CACHE_TTL : CACHE_TTL);

export const getCached = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > ttlFor(key)) {
    cache.delete(key);
    return null;
  }

  return cached.data;
};

export const setCached = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Execute a function with request deduplication
 * If the same request is already pending, wait for it instead of making a new one
 */
export const withDeduplication = async (key, fn) => {
  // Check cache first
  const cached = getCached(key);
  if (cached !== null) {
    return cached;
  }
  
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    // Wait for the pending request to complete
    return pendingRequests.get(key);
  }
  
  // Create new request
  const requestPromise = fn()
    .then(result => {
      // Cache the result
      setCached(key, result);
      // Remove from pending requests
      pendingRequests.delete(key);
      return result;
    })
    .catch(error => {
      // Remove from pending requests on error
      pendingRequests.delete(key);
      throw error;
    });
  
  // Store pending request
  pendingRequests.set(key, requestPromise);
  
  return requestPromise;
};

export const clearCache = (pattern = null) => {
  if (!pattern) {
    cache.clear();
    pendingRequests.clear();
    return;
  }
  
  // Clear cache entries matching pattern
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
  
  // Clear pending requests matching pattern
  for (const key of pendingRequests.keys()) {
    if (key.includes(pattern)) {
      pendingRequests.delete(key);
    }
  }
};
