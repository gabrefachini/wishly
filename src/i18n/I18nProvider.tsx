import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nContext, type I18nContextValue, type TranslationNode } from "./I18nContext";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import type { Locale } from "./formatters";

const STORAGE_KEY = "wishly.locale";
const defaultLocale: Locale = "en";
const supportedLocales: Locale[] = ["en", "pt-BR"];
const dictionaries: Record<Locale, TranslationNode> = {
  en,
  "pt-BR": ptBR,
};

function isLocale(value: string | null): value is Locale {
  return supportedLocales.includes(value as Locale);
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) {
    return stored;
  }

  const languages = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language];

  return languages.some((language) => language.toLowerCase().startsWith("pt"))
    ? "pt-BR"
    : defaultLocale;
}

function getNestedValue(dictionary: TranslationNode, key: string) {
  return key.split(".").reduce<string | TranslationNode | undefined>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return current[part];
    }

    return undefined;
  }, dictionary);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    function t(key: string) {
      const translated = getNestedValue(dictionaries[locale], key);
      const fallback = getNestedValue(dictionaries.en, key);
      const valueToUse = translated ?? fallback;

      return typeof valueToUse === "string" ? valueToUse : key;
    }

    return {
      locale,
      setLocale: setLocaleState,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
