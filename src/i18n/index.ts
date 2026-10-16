import { ar } from './ar';
import { en } from './en';
import { ku } from './ku';

export type Language = 'ar' | 'en' | 'ku';
export type Direction = 'rtl' | 'ltr';

export const translations = { ar, en, ku } as const;

export const languageConfig: Record<Language, { label: string; dir: Direction; locale: string }> = {
  ar: { label: 'العربية', dir: 'rtl', locale: 'ar-IQ' },
  en: { label: 'English', dir: 'ltr', locale: 'en-US' },
  ku: { label: 'کوردی', dir: 'rtl', locale: 'ku' },
};

// Helper to get nested value from object by dot path
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function getTranslation(lang: Language, key: string): string {
  const value = getNestedValue(translations[lang], key);
  if (typeof value === 'string') return value;
  // Fallback to Arabic
  const fallback = getNestedValue(translations.ar, key);
  if (typeof fallback === 'string') return fallback;
  return key;
}

export function formatTranslation(text: string, params: Record<string, string | number>): string {
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export { ar, en, ku };
