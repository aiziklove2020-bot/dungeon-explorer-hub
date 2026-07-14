/**
 * Simple in-memory cache for Firebase reads
 * Reduces database reads by caching results for a short period
 * Includes request deduplication to prevent concurrent identical requests
 */

const cache = new Map();
const pendingRequests = new Map(); // Track pending requests to deduplicate
const CACHE_TTL = 600000; // 10 minutes cache (increased from 5 minutes to further reduce database reads - parties rarely change)

export const getCached = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
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
