import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadContent as loadContentFromService,
  isEditMode,
  isViewingAsVisitor,
} from '../../services/contentService';
import {
  defaultContent,
  mergeWithDefaults,
  getInitialContentState,
  getInitializedFromCache,
} from './defaults';

/**
 * Owns `content`, `isInitialized`, and `contentLoadError`. Also watches for
 * edit-mode / view-as-visitor flips (via storage, focus, visibility events)
 * and reloads from the appropriate source when they change.
 *
 * Returns the tuple { content, setContent, isInitialized, contentLoadError,
 * reloadContent } so mutator hooks can read/write the same state.
 */
export function useContentLoader() {
  const [content, setContent] = useState(getInitialContentState);
  const [isInitialized, setIsInitialized] = useState(getInitializedFromCache);
  const [contentLoadError, setContentLoadError] = useState(false);

  const reloadContent = useCallback(async (forceRefresh = false) => {
    try {
      const data = await loadContentFromService(forceRefresh);
      const merged = mergeWithDefaults({
        hero: data.hero,
        about: data.about,
        contact: data.contact,
        registration: data.registration,
        socialLinks: data.socialLinks,
        whatsappGroups: data.whatsappGroups,
        events: data.events || [],
        externalEvents: data.externalEvents || [],
        labels: data.labels || {},
        store: data.store || {},
        storeEnabled: data.storeEnabled,
        activeWorkshopsCount: data.activeWorkshopsCount,
        rssFeeds: data.rssFeeds || [],
      });
      setContent(merged);
      setContentLoadError(false);
      setIsInitialized(true);
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[TBDSM] Content load failed:', error?.message || error);
      }
      setContent(defaultContent);
      setContentLoadError(true);
      setIsInitialized(true);
    }
  }, []);

  // First load: if we restored from cache, force a refresh in the background
  // so visitors see the latest content without a cold-start blank screen.
  useEffect(() => {
    const startedFromCache = getInitializedFromCache();
    reloadContent(startedFromCache);
  }, [reloadContent]);

  // Edit-mode / view-as-visitor flip → reload (different source of truth).
  const editModeRef = useRef(isEditMode());
  const viewAsVisitorRef = useRef(isViewingAsVisitor());
  useEffect(() => {
    const checkModeFlags = () => {
      const edit = isEditMode();
      const viewAs = isViewingAsVisitor();
      if (edit !== editModeRef.current || viewAs !== viewAsVisitorRef.current) {
        editModeRef.current = edit;
        viewAsVisitorRef.current = viewAs;
        reloadContent(true);
      }
    };

    const onStorage = () => checkModeFlags();
    const onFocus = () => checkModeFlags();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkModeFlags();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reloadContent]);

  return { content, setContent, isInitialized, contentLoadError, reloadContent };
}
