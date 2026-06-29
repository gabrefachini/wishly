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
const defaultLocale: Locale = "pt-BR";
const dictionaries: Record<Locale, TranslationNode> = {
  en,
  "pt-BR": ptBR,
};

function detectInitialLocale(): Locale {
  return defaultLocale;
}

function getNestedValue(dictionary: TranslationNode, key: string) {
  return key.split(".").reduce<string | TranslationNode | undefined>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return current[part];
    }

    return undefined;
  }, dictionary);
}

function interpolate(
  value: string,
  variables?: Record<string, string | number>,
) {
  if (!variables) {
    return value;
  }

  return Object.entries(variables).reduce((nextValue, [key, replacement]) => {
    return nextValue.replaceAll(`{{${key}}}`, String(replacement));
  }, value);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    function t(key: string, variables?: Record<string, string | number>) {
      const translated = getNestedValue(dictionaries[locale], key);
      const fallback = getNestedValue(dictionaries.en, key);
      const valueToUse = translated ?? fallback;

      return typeof valueToUse === "string" ? interpolate(valueToUse, variables) : key;
    }

    return {
      locale,
      setLocale: setLocaleState,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
