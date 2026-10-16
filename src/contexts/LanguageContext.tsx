import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, Direction, languageConfig, getTranslation, formatTranslation } from '@/i18n';

interface LanguageContextType {
  language: Language;
  dir: Direction;
  locale: string;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'ar' || stored === 'en' || stored === 'ku') return stored;
  return 'ar';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const config = languageConfig[language];

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  // Apply dir and lang to document
  useEffect(() => {
    document.documentElement.dir = config.dir;
    document.documentElement.lang = language;
  }, [language, config.dir]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const text = getTranslation(language, key);
    if (params) return formatTranslation(text, params);
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      dir: config.dir,
      locale: config.locale,
      setLanguage,
      t,
      isRTL: config.dir === 'rtl',
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
