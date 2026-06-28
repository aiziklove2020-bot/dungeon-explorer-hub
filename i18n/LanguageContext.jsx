import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getTranslation } from './translations';

const LanguageContext = createContext(null);

function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Single-language app (Hebrew). Re-introduce `setLanguage`/`toggleLanguage`
// + state when a second language ships (and remember to update translations.js
// keys + RTL/LTR toggling on <html dir>).
function LanguageProvider({ children }) {
  const language = 'he';

  const t = useMemo(() => (key) => getTranslation(key, language), []);

  const value = useMemo(() => ({ language, t }), [t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export { useLanguage, LanguageProvider };

