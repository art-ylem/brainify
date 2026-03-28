import { useState, useCallback } from 'preact/hooks';
import { resolveLocale, t as translate, type Locale } from '@brainify/shared';
import { getTelegramUser } from '../lib/telegram.js';

export function useI18n() {
  const tgUser = getTelegramUser();
  const langCode = tgUser?.language_code ?? navigator.language?.slice(0, 2);
  const [locale, setLocale] = useState<Locale>(() =>
    resolveLocale(langCode),
  );

  const t = useCallback(
    (key: string) => translate(locale, key),
    [locale],
  );

  return { locale, setLocale, t };
}
