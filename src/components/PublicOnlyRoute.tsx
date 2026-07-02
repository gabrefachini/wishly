import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { isDemoMode } from "../lib/env";
import { LoadingState } from "./LoadingState";
import { useTranslation } from "../i18n/useTranslation";

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();
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

  if (session && !isDemoMode) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
