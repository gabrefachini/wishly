import { EmptyState } from "./States";
import { useTranslation } from "../i18n/useTranslation";

export function SetupNotice() {
  const { t } = useTranslation();

  return (
    <EmptyState
      title={t("app.setupRequired")}
      body={t("app.setupBody")}
    />
  );
}
