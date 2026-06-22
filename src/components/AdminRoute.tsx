import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { isAdminUser } from "../lib/admin";
import { useTranslation } from "../i18n/useTranslation";
import { AdminAccessDeniedPage } from "../pages/AdminAccessDeniedPage";

export function AdminRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return <div className="py-20 text-center text-sm text-warm-500">{t("common.loading")}</div>;
  }

  if (!session) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!isAdminUser(session.user)) {
    return <AdminAccessDeniedPage />;
  }

  return <Outlet />;
}

