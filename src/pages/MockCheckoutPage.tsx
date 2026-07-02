import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SecondaryButton, PrimaryButton } from "../components/Buttons";
import { EmptyState, SuccessState } from "../components/States";
import { LoadingState } from "../components/LoadingState";
import { WishlyLogo } from "../components/WishlyLogo";
import { formatCurrency } from "../i18n/formatters";
import { useTranslation } from "../i18n/useTranslation";
import { isDemoMode } from "../lib/env";
import { confirmMockContribution, getContributionCheckout } from "../services/contributions";

export function MockCheckoutPage() {
  const { contributionId } = useParams();
  const { t, locale } = useTranslation();
  const [checkout, setCheckout] = useState<Awaited<ReturnType<typeof getContributionCheckout>>>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);
  const mockCheckoutDisabled = !(import.meta.env.DEV || isDemoMode);

  useEffect(() => {
    if (mockCheckoutDisabled) {
      setLoading(false);
      return;
    }

    if (!contributionId) {
      setLoading(false);
      return;
    }

    getContributionCheckout(contributionId)
      .then((data) => setCheckout(data))
      .finally(() => setLoading(false));
  }, [contributionId, mockCheckoutDisabled]);

  if (mockCheckoutDisabled) {
    return (
      <main className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto max-w-md">
          <EmptyState
            title={t("common.notFound")}
            body={t("giftFunding.temporarilyUnavailable")}
            branded
          />
        </div>
      </main>
    );
  }

  async function handleConfirm() {
    if (!contributionId) return;
    setSubmitting(true);
    try {
      await confirmMockContribution(contributionId);
      setPaid(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto grid max-w-md gap-4 text-center">
          <WishlyLogo size="md" />
          <LoadingState
            title={t("common.loadingTitle")}
            body={t("common.loadingBody")}
            timeoutTitle={t("common.loadingTimeoutTitle")}
            timeoutBody={t("common.loadingTimeoutBody")}
            retryLabel={t("common.retry")}
            redirectTo="/"
            redirectLabel={t("nav.home")}
            onRetry={() => window.location.reload()}
            className="w-full"
          />
        </div>
      </main>
    );
  }

  if (!checkout) {
    return (
      <main className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto max-w-md">
          <EmptyState title={t("common.notFound")} body={t("giftFunding.checkoutNotFound")} branded />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="flex justify-center">
          <WishlyLogo size="md" />
        </div>
        {paid ? (
          <>
            <SuccessState title={t("giftFunding.contributionReceived")} body={t("giftFunding.paymentPending")} />
            <Link to={`/w/${checkout.share_id}`} className="contents">
              <PrimaryButton>{t("actions.backToWishlist")}</PrimaryButton>
            </Link>
          </>
        ) : (
          <section className="rounded-[32px] bg-porcelain p-6 shadow-card ring-1 ring-warm-100">
            <p className="text-sm font-semibold text-coral">{t("giftFunding.groupGift")}</p>
            <h1 className="mt-2 text-2xl font-bold text-warm-900">{checkout.gift_name}</h1>
            <p className="mt-3 text-sm text-warm-500">
              {t("giftFunding.paymentSandbox")}
            </p>
            <p className="mt-4 text-lg font-semibold text-warm-900">
              {formatCurrency(checkout.amount, locale, checkout.currency)}
            </p>
            <div className="mt-6 grid gap-3">
              <PrimaryButton onClick={() => void handleConfirm()} disabled={submitting}>
                {t("giftFunding.simulateApprovedPayment")}
              </PrimaryButton>
              <Link to={`/w/${checkout.share_id}`} className="contents">
                <SecondaryButton>{t("actions.backToWishlist")}</SecondaryButton>
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
