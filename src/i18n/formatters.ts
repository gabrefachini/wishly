export type Locale = "en" | "pt-BR";

const localeMap: Record<Locale, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

const currencyMap: Record<Locale, string> = {
  en: "USD",
  "pt-BR": "BRL",
};

export function formatCurrency(value: number, locale: Locale, currency?: string) {
  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency: currency ?? currencyMap[locale],
  }).format(value);
}

export function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeMap[locale], {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
