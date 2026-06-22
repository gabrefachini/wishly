import { EmptyState } from "../components/States";
import { useTranslation } from "../i18n/useTranslation";

export function AdminAccessDeniedPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title={t("admin.accessDenied")}
        body={t("admin.accessDeniedBody")}
        branded
      />
    </div>
  );
}

