import { createContext, useContext, useMemo, useRef } from 'react';
import {
  isEditMode,
  isViewingAsVisitor,
  publishContent as publishContentToGit,
  importContentFromGit as importContentFromGitService,
  clearContentCache,
  clearAllContentCache,
} from '../services/contentService';
import { defaultContent } from './content/defaults';
import { buildMatchingTable, exportMatchesToCsv } from './content/matching';
import {
  exportContent as exportContentHelper,
  parseContentImport,
  exportParties as exportPartiesHelper,
  importParties as importPartiesHelper,
  exportAllData as exportAllDataHelper,
  importAllData as importAllDataHelper,
} from './content/importExport';
import { useContentLoader } from './content/useContentLoader';
import { useRegistrationsCache } from './content/useRegistrationsCache';
import { useContentAutosave } from './content/useContentAutosave';
import { createContentMutators } from './content/contentMutators';

const ContentContext = createContext();

/**
 * ContentProvider is intentionally a thin shell. All substantive behaviour
 * lives in ./content/ slices:
 *
 *   - useContentLoader       → content state + mode-flag watcher + reload
 *   - useRegistrationsCache  → registrations list + CRUD
 *   - useContentAutosave     → debounced Firestore batch write in edit mode
 *   - createContentMutators  → hero/about/contact/events/... updaters
 *
 * The public `useContent()` shape is unchanged so 17+ consumer components
 * keep working without modification.
 */
export const ContentProvider = ({ children }) => {
  const { content, setContent, isInitialized, contentLoadError, reloadContent } = useContentLoader();
  const {
    registrationsCache,
    getRegistrations,
    refreshRegistrations,
    saveRegistration,
    clearRegistrations,
  } = useRegistrationsCache();

  useContentAutosave(content, isInitialized);

  // Mutators close over setContent + a lazy content accessor so updateEvent /
  // deleteEvent / updateContentPath always read the latest state without
  // re-creating the mutator map on every render.
  const contentRef = useRef(content);
  contentRef.current = content;
  const mutators = useMemo(
    () => createContentMutators(setContent, () => contentRef.current),
    [setContent]
  );

  const value = useMemo(
    () => ({
      content,
      isInitialized,
      contentLoadError,
      ...mutators,
      getMatchingTable: () => buildMatchingTable(registrationsCache),
      getRegistrations,
      saveRegistration,
      clearRegistrations,
      exportMatches: () => exportMatchesToCsv(registrationsCache),
      resetToDefaults: () => setContent(defaultContent),
      exportContent: () => exportContentHelper(content),
      importContent: (jsonData) => {
        const merged = parseContentImport(jsonData);
        if (!merged) return false;
        setContent(merged);
        return true;
      },
      exportParties: exportPartiesHelper,
      importParties: importPartiesHelper,
      exportAllData: () => exportAllDataHelper(registrationsCache),
      importAllData: importAllDataHelper,
      registrationsCount: registrationsCache.length,
      refreshRegistrations,
      reloadContent: () => reloadContent(true),
      publishContent: publishContentToGit,
      importContentFromGit: importContentFromGitService,
      clearContentCache,
      clearAllContentCache,
      isEditMode,
      isViewingAsVisitor,
    }),
    [
      content,
      isInitialized,
      contentLoadError,
      registrationsCache,
      mutators,
      getRegistrations,
      saveRegistration,
      clearRegistrations,
      refreshRegistrations,
      reloadContent,
      setContent,
    ]
  );

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within ContentProvider');
  }
  return context;
};
