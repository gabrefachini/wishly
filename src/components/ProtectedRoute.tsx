import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { LoadingState } from "./LoadingState";
import { useTranslation } from "../i18n/useTranslation";

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="mx-auto grid min-h-screen max-w-3xl place-items-center px-4 py-8">
        <LoadingState
          title={t("common.loadingTitle")}
          body={t("common.loadingBody")}
          timeoutTitle={t("common.loadingTimeoutTitle")}
          timeoutBody={t("common.loadingTimeoutBody")}
          retryLabel={t("common.retry")}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!session) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
