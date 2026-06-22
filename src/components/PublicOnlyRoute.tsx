import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <div className="py-20 text-center text-sm text-warm-500">{t("common.loading")}</div>;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
