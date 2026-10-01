import { useState, useEffect, useCallback } from 'react';

/**
 * Shared data-fetching hook for admin section components.
 * Handles loading/error state, initial fetch, and manual reload.
 *
 * @param {Function} fetchFn - async function that returns data
 * @param {Array}    deps    - extra dependencies that trigger a re-fetch when changed
 * @returns {{ data, loading, error, reload }}
 */
const LOAD_TIMEOUT_MS = 20000;

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { isTimeout: true })), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });

const useAdminSection = (fetchFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // A Firestore request can hang forever on a flaky mobile/Safari
      // connection (the cache even keeps handing out the same hung promise),
      // which showed as an endless loader. Give up after a while, clear the
      // cache so the retry is a real fresh request, and try once more before
      // surfacing an error.
      let result;
      for (let attempt = 0; ; attempt++) {
        try {
          result = await withTimeout(fetchFn(), LOAD_TIMEOUT_MS);
          break;
        } catch (err) {
          if (!err?.isTimeout || attempt >= 1) throw err;
          const { clearCache } = await import('../utils/cache');
          clearCache();
        }
      }
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};

export default useAdminSection;
