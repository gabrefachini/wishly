import { useI18n } from "./I18nContext";

export function useTranslation() {
  const { t, locale } = useI18n();

  return { t, locale };
}
