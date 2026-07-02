import type { Locale } from "../i18n/formatters";
import { useI18n } from "../i18n/I18nContext";

const locales: Locale[] = ["en", "pt-BR"];

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="inline-flex rounded-full border border-border bg-surface p-1 shadow-card"
      aria-label={t("language.label")}
    >
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={`min-h-8 rounded-full px-3 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/15 ${
            locale === item
              ? "bg-sunken text-primary-strong"
              : "text-warm-500 hover:bg-warm-50"
          }`}
          aria-pressed={locale === item}
        >
          {t(`language.${item}`)}
        </button>
      ))}
    </div>
  );
}
