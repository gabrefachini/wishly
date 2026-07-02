import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/States";
import { LoadingState } from "../components/LoadingState";
import { WishlyLogo } from "../components/WishlyLogo";
import { useTranslation } from "../i18n/useTranslation";
import { hasSupabaseEnv, isDemoMode } from "../lib/env";
import { resolveGiftRedirect } from "../services/affiliateLinks";

export function GoGiftPage() {
  const { giftId } = useParams();
  const [searchParams] = useSearchParams();
  const { t, locale } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ((!hasSupabaseEnv && !isDemoMode) || !giftId) {
      setError(t("common.error"));
      return;
    }

    const shareId = searchParams.get("shareId");
    if (!shareId) {
      setError(t("common.error"));
      return;
    }

    resolveGiftRedirect({
      giftId,
      shareId,
      locale,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    })
      .then((result) => {
        window.location.replace(result.url);
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : t("common.error"));
      });
  }, [giftId, locale, searchParams, t]);

  if (error) {
    return (
      <main className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto grid max-w-md gap-6">
          <div className="flex justify-center">
            <WishlyLogo size="md" />
          </div>
          <EmptyState title={t("affiliate.redirectErrorTitle")} body={t("affiliate.redirectErrorBody")} />
          <Link
            to={searchParams.get("shareId") ? `/w/${searchParams.get("shareId")}` : "/"}
            className="text-center text-sm font-semibold text-coral"
          >
            {t("actions.backToWishlist")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto grid max-w-md justify-items-center gap-4 text-center">
        <WishlyLogo size="md" />
        <p className="text-sm font-semibold text-coral">{t("affiliate.redirecting")}</p>
        <LoadingState
          title={t("common.loadingTitle")}
          body={t("common.loadingBody")}
          timeoutTitle={t("common.loadingTimeoutTitle")}
          timeoutBody={t("common.loadingTimeoutBody")}
          retryLabel={t("common.retry")}
          redirectTo={searchParams.get("shareId") ? `/w/${searchParams.get("shareId")}` : "/"}
          redirectLabel={t("actions.backToWishlist")}
          onRetry={() => window.location.reload()}
          className="w-full"
        />
      </div>
    </main>
  );
}
