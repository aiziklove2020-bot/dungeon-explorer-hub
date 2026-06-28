import { useState, useEffect, useRef, useCallback } from 'react';

const DEBOUNCE_MS = 1000;

export const useDraft = (key) => {
  const storageKey = `draft_${key}`;
  const timerRef = useRef(null);

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [storageKey]);

  const saveDraft = useCallback((data) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const hasContent = Object.values(data).some(v =>
          (typeof v === 'string' && v.trim()) || (Array.isArray(v) && v.length > 0)
        );
        if (hasContent) {
          localStorage.setItem(storageKey, JSON.stringify(data));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch { /* quota exceeded */ }
    }, DEBOUNCE_MS);
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const hasDraft = useCallback(() => {
    return localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { loadDraft, saveDraft, clearDraft, hasDraft };
};
