import ru from './locales/ru.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };

export type Locale = 'ru' | 'en';

type Translations = typeof ru;

const locales: Record<Locale, Translations> = { ru, en };

const DEFAULT_LOCALE: Locale = 'en';

export function resolveLocale(languageCode?: string): Locale {
  if (languageCode === 'ru') return 'ru';
  return DEFAULT_LOCALE;
}

export function t(locale: Locale, path: string): string {
  const keys = path.split('.');
  let current: unknown = locales[locale] ?? locales[DEFAULT_LOCALE];

  for (const key of keys) {
    if (current != null && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }

  return typeof current === 'string' ? current : path;
}

export { locales };
