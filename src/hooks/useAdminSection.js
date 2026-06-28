import { useState, useEffect, useCallback } from 'react';

/**
 * Shared data-fetching hook for admin section components.
 * Handles loading/error state, initial fetch, and manual reload.
 *
 * @param {Function} fetchFn - async function that returns data
 * @param {Array}    deps    - extra dependencies that trigger a re-fetch when changed
 * @returns {{ data, loading, error, reload }}
 */
const useAdminSection = (fetchFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
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
