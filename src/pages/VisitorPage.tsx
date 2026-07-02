import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GiftCard, type GiftCardModel } from "../components/GiftCard";
import { ContributionForm, ReservationForm } from "../components/Forms";
import { Modal } from "../components/Modal";
import { EmptyState, SuccessState } from "../components/States";
import { WishlyLogo } from "../components/WishlyLogo";
import { featuredGift, localized, wishlists } from "../data/mockData";
import { buildGiftRedirectPath } from "../lib/affiliate";
import { hasSupabaseEnv, isDemoMode } from "../lib/env";
import { getWishlistThemeCssVars } from "../lib/wishlistAppearance";
import { formatCurrency, formatDate } from "../i18n/formatters";
import { useTranslation } from "../i18n/useTranslation";
import { buildFundingSummary, formatGiftPrice, mapGiftPriority, mapGiftStatus } from "../lib/presenters";
import { contributionSchema, reservationSchema } from "../lib/validation";
import { createContribution } from "../services/contributions";
import { reserveGift } from "../services/reservations";
import { getPublicWishlist } from "../services/wishlists";
import { LoadingState } from "../components/LoadingState";
import type { GiftRecord, WishlistRecord } from "../types/domain";
import { env } from "../lib/env";

const fallbackCover =
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80";

function storeLabel(url: string | null) {
  if (!url) return "Wishly";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Wishly";
  }
}

export function VisitorPage() {
  const { shareId } = useParams();
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<(WishlistRecord & { gifts: GiftRecord[] }) | null>(null);
  const [loading, setLoading] = useState(hasSupabaseEnv || isDemoMode);
  const [error, setError] = useState<string | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [selectedContributionGiftId, setSelectedContributionGiftId] = useState<string | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [contributionLoading, setContributionLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [contributionErrors, setContributionErrors] = useState<Record<string, string | undefined>>({});
  const [reservationValues, setReservationValues] = useState({
    reserver_name: "",
    reserver_email: "",
    reserver_message: "",
  });
  const [contributionValues, setContributionValues] = useState({
    contributor_name: "",
    contributor_email: "",
    contributor_message: "",
    amount: "",
  });

  useEffect(() => {
    if ((!hasSupabaseEnv && !isDemoMode) || !shareId) {
      return;
    }

    let active = true;
    setLoading(true);

    getPublicWishlist(shareId)
      .then((data) => {
        if (active) {
          setWishlist(data);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t("common.error"));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [shareId, t]);

  const selectedGift = useMemo(() => {
    if (!selectedGiftId) return null;
    if (!hasSupabaseEnv && !isDemoMode) {
      return featuredGift.id === selectedGiftId ? featuredGift : null;
    }
    return wishlist?.gifts.find((gift) => gift.id === selectedGiftId) ?? null;
  }, [selectedGiftId, wishlist]);

  const selectedContributionGift = useMemo(() => {
    if (!selectedContributionGiftId) return null;
    return wishlist?.gifts.find((gift) => gift.id === selectedContributionGiftId) ?? null;
  }, [selectedContributionGiftId, wishlist]);

  async function handleReserve() {
    if (!shareId || !selectedGiftId) return;
    const parsed = reservationSchema.safeParse(reservationValues);
    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setFormErrors(nextErrors);
      return;
    }

    setReservationLoading(true);
    setFormErrors({});
    setError(null);
    try {
      await reserveGift({
        shareId,
        giftId: selectedGiftId,
        ...reservationValues,
      });
      const refreshed = await getPublicWishlist(shareId);
      setWishlist(refreshed);
      setReservationSuccess(true);
      setSelectedGiftId(null);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : t("common.error");
      setError(message.includes("gift_unavailable") ? t("reservation.alreadyReserved") : message);
    } finally {
      setReservationLoading(false);
    }
  }

  async function handleContribution() {
    if (!shareId || !selectedContributionGift) return;

    const parsed = contributionSchema.safeParse(contributionValues);
    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setContributionErrors(nextErrors);
      return;
    }

    setContributionErrors({});
    setContributionLoading(true);
    setError(null);
    try {
      if (!import.meta.env.DEV) {
        throw new Error("public_contributions_temporarily_unavailable");
      }

      const result = await createContribution({
        shareId,
        giftId: selectedContributionGift.id,
        contributor_name: contributionValues.contributor_name,
        contributor_email: contributionValues.contributor_email,
        contributor_message: contributionValues.contributor_message,
        amount: Number(contributionValues.amount),
        currency: selectedContributionGift.funding_currency || selectedContributionGift.currency,
        locale,
      });
      setSelectedContributionGiftId(null);
      navigate(result.checkout_url);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : t("common.error");
      setError(
        message.includes("public_contributions_temporarily_unavailable")
          ? t("giftFunding.temporarilyUnavailable")
          : message,
      );
    } finally {
      setContributionLoading(false);
    }
  }

  if (!hasSupabaseEnv && !isDemoMode) {
    const demoWishlist = wishlists.find((item) => item.shareId === shareId) ?? wishlists[0];

    return (
      <main className="min-h-screen bg-page px-4 py-5 text-warm-900 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-warm-700 shadow-card ring-1 ring-border"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <WishlyLogo size="sm" />
            </Link>
          </div>
          <section className="overflow-hidden rounded-modal bg-surface shadow-soft ring-1 ring-border">
            <img src={demoWishlist.cover} alt="" className="h-56 w-full object-cover" />
            <div className="p-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-warm-700">
                <ShieldCheck size={14} aria-hidden="true" />
                {t("visitor.noLogin")}
              </p>
              <h1 className="mt-4 text-3xl font-bold text-warm-900">{t("visitor.title")}</h1>
              <p className="mt-3 text-base leading-7 text-warm-500">{t("visitor.body")}</p>
            </div>
          </section>
          <section className="grid gap-3">
            {demoWishlist.gifts.map((gift) => (
              <GiftCard
                key={gift.id}
                mode="visitor"
                gift={{
                  id: gift.id,
                  name: localized(gift.name, locale),
                  store: gift.store,
                  priceLabel: `${t("giftForm.estimated")} ${formatCurrency(gift.price, locale)}`,
                  priority: gift.priority,
                  status: gift.status,
                  image: gift.image,
                  note: gift.note ? localized(gift.note, locale) : undefined,
                  groupGift: gift.groupGift,
                  purchaseType: gift.groupGift ? "collective" : "individual",
                }}
              />
            ))}
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page px-4 py-5 text-warm-900 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-warm-700 shadow-card ring-1 ring-border focus:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <WishlyLogo size="sm" />
            </Link>
          </div>
          <LoadingState
            title={t("common.loadingTitle")}
            body={t("common.loadingBody")}
            timeoutTitle={t("common.loadingTimeoutTitle")}
            timeoutBody={t("common.loadingTimeoutBody")}
            retryLabel={t("common.retry")}
            redirectTo="/"
            redirectLabel={t("nav.home")}
            onRetry={() => window.location.reload()}
          />
        </div>
      </main>
    );
  }

  if (error || !wishlist) {
    return (
      <main className="min-h-screen bg-page px-4 py-5 text-warm-900 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            title={t("visitor.privateTitle")}
            body={t("visitor.privateBody")}
            branded
          />
        </div>
      </main>
    );
  }

  const wishlistThemeVars = getWishlistThemeCssVars(wishlist);

  return (
    <main className="min-h-screen bg-page px-4 py-5 text-warm-900 sm:px-6" style={wishlistThemeVars}>
      <div className="mx-auto grid max-w-3xl gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-warm-700 shadow-card ring-1 ring-border focus:outline-none focus:ring-4"
            style={{ boxShadow: "0 0 0 6px transparent" }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <WishlyLogo size="sm" />
          </Link>
        </div>

        <section className="overflow-hidden rounded-modal bg-surface shadow-soft ring-1 ring-border">
          <img
            src={wishlist.cover_image_url || fallbackCover}
            alt=""
            className="h-56 w-full object-cover"
          />
          <div className="p-5" style={{ backgroundColor: "var(--wishlist-header-surface)" }}>
            <p
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--wishlist-secondary-soft)",
                color: "var(--wishlist-badge)",
              }}
            >
              <ShieldCheck size={14} aria-hidden="true" />
              {t("visitor.noLogin")}
            </p>
            <h1 className="mt-4 text-3xl font-bold text-warm-900">{wishlist.title}</h1>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--wishlist-primary)" }}>
              {t(`occasions.${wishlist.occasion}`)} ·{" "}
              {wishlist.event_date ? formatDate(wishlist.event_date, locale) : "-"}
            </p>
            <p className="mt-3 text-base leading-7 text-warm-500">
              {wishlist.message || t("visitor.body")}
            </p>
          </div>
        </section>

        {reservationSuccess ? (
          <SuccessState title={t("reservation.successTitle")} body={t("reservation.successBody")} />
        ) : null}
        {error ? <p className="text-sm text-primary-strong">{error}</p> : null}

        <section className="grid gap-3">
          {wishlist.gifts.map((gift) => {
            const cardGift: GiftCardModel = {
              id: gift.id,
              name: gift.name,
              store: storeLabel(gift.store_url),
              priceLabel: formatGiftPrice(
                gift.estimated_price,
                locale,
                gift.currency,
                t("giftForm.estimated"),
              ),
              priority: mapGiftPriority(gift.priority),
              status: mapGiftStatus(gift.status),
              image: gift.image_url || fallbackCover,
              note: gift.description || undefined,
              groupGift: gift.purchase_type === "collective",
              purchaseType: gift.purchase_type,
              buyHref: gift.store_url && shareId ? buildGiftRedirectPath(gift.id, shareId) : null,
              showAffiliateDisclosure: Boolean(gift.store_url) && env.affiliateDisclosureEnabled,
              funding:
                gift.purchase_type === "collective"
                  ? {
                      ...buildFundingSummary(gift, locale),
                      isFunded: gift.funding_status === "funded",
                    }
                  : undefined,
            };

            return (
              <GiftCard
                key={gift.id}
                gift={cardGift}
                mode="visitor"
                themed
                onReserve={(giftId) => {
                  setReservationSuccess(false);
                  setSelectedGiftId(giftId);
                }}
                onContribute={(giftId) => {
                  setReservationSuccess(false);
                  setSelectedContributionGiftId(giftId);
                }}
              />
            );
          })}
        </section>
      </div>

      <Modal
        title={t("reservation.title")}
        open={Boolean(selectedGift)}
        onClose={() => setSelectedGiftId(null)}
      >
        <ReservationForm
          values={reservationValues}
          errors={formErrors}
          loading={reservationLoading}
          t={t}
          onChange={(name, value) =>
            setReservationValues((current) => ({ ...current, [name]: value }))
          }
          onSubmit={() => void handleReserve()}
          onClose={() => setSelectedGiftId(null)}
        />
      </Modal>

      <Modal
        title={t("giftFunding.contributeToThisGift")}
        open={Boolean(selectedContributionGift)}
        onClose={() => setSelectedContributionGiftId(null)}
      >
        <ContributionForm
          values={contributionValues}
          errors={contributionErrors}
          loading={contributionLoading}
          t={t}
          amountOptions={locale === "pt-BR" ? ["50", "100", "200"] : ["10", "25", "50"]}
          onPickAmount={(amount) =>
            setContributionValues((current) => ({ ...current, amount }))
          }
          onChange={(name, value) =>
            setContributionValues((current) => ({ ...current, [name]: value }))
          }
          onSubmit={() => void handleContribution()}
          onClose={() => setSelectedContributionGiftId(null)}
        />
      </Modal>
    </main>
  );
}
