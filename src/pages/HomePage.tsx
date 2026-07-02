import { ArrowRight, Bell, CalendarDays, Gift, HandCoins, Plus, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SecondaryButton } from "../components/Buttons";
import { EmptyState } from "../components/States";
import { LoadingState } from "../components/LoadingState";
import {
  ActionBentoCard,
  BentoCard,
  BentoGrid,
  MetricBentoCard,
  PremiumPageShell,
  SectionHeader,
} from "../components/PremiumLayout";
import { WishlistCard } from "../components/WishlistCard";
import { getDemoDashboardSnapshot } from "../data/demoState";
import { useTranslation } from "../i18n/useTranslation";
import { isDemoMode } from "../lib/env";
import { updateMetadata } from "../lib/metadata";
import { buildWishlistSummary } from "../lib/presenters";
import { listActiveWishlists } from "../services/wishlists";
import type { WishlistWithGifts } from "../types/domain";

const fallbackCover =
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80";

export function HomePage() {
  const { t, locale } = useTranslation();
  const { profile, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateMetadata({
      title: `${t("home.title")} — Wishly`,
      description: t("home.heroBody"),
    });
  }, [t]);

  useEffect(() => {
    let active = true;
    if (authLoading) {
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    setWishlists([]);

    listActiveWishlists()
      .then((data) => {
        if (active) {
          setWishlists(data);
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
  }, [authLoading, session?.user?.id, t]);

  const firstWishlist = wishlists[0];
  const previewHref = firstWishlist ? `/w/${firstWishlist.share_id}` : "/create";
  const addGiftHref = firstWishlist ? `/gift/new?wishlistId=${firstWishlist.id}` : "/create";
  const activeListCount = wishlists.length;
  const reservedGiftCount = wishlists.reduce(
    (total, wishlist) => total + wishlist.gifts.filter((gift) => gift.status === "reserved").length,
    0,
  );
  const fundedAmount = wishlists.reduce(
    (total, wishlist) =>
      total +
      wishlist.gifts.reduce((giftTotal, gift) => giftTotal + (gift.funding_received_amount ?? 0), 0),
    0,
  );
  const upcomingCount = wishlists.filter((wishlist) => wishlist.event_date).length;
  const notificationCount = isDemoMode ? getDemoDashboardSnapshot().notificationCount : 0;

  return (
    <PremiumPageShell className="pb-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-warm-500">
            {t("home.greetingPrefix")}, {profile?.name || "Gabriel"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-warm-900 sm:text-[2.2rem]">
            {t("home.title")}
          </h1>
        </div>
        <button
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-surface text-warm-700 shadow-card ring-1 ring-border focus:outline-none focus:ring-4 focus:ring-coral/15"
          aria-label={t("home.notifications")}
        >
          <Bell size={20} aria-hidden="true" />
          {notificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          ) : null}
        </button>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <BentoCard tone="accent" className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-terracotta">{t("home.question")}</p>
            <h2 className="mt-3 max-w-2xl text-[clamp(2rem,4vw,3.45rem)] font-bold leading-[1.02] tracking-[-0.05em] text-warm-900">
              {t("home.heroTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-warm-600 sm:text-base">{t("home.heroBody")}</p>
            <Link to="/create" className="mt-6 inline-flex">
              <SecondaryButton className="bg-surface hover:text-terracotta">
                {t("home.createNew")}
              </SecondaryButton>
            </Link>
          </div>
          <div className="grid gap-3">
            <SummaryCard icon={Gift} label={t("home.activeLists")} value={String(activeListCount)} />
            <SummaryCard icon={Share2} label={t("home.reservedGifts")} value={String(reservedGiftCount)} />
            <SummaryCard icon={HandCoins} label={t("home.receivedContributions")} value={String(fundedAmount)} />
          </div>
        </BentoCard>

        <BentoGrid className="sm:grid-cols-2 xl:grid-cols-1">
          <MetricBentoCard
            icon={Bell}
            label={t("home.notifications")}
            value={String(notificationCount)}
            note={t("home.upcomingLists")}
            accent="lavender"
          />
          <MetricBentoCard
            icon={CalendarDays}
            label={t("home.upcomingEvents")}
            value={String(upcomingCount)}
            note={firstWishlist ? firstWishlist.title : t("home.emptyBody")}
            accent="coral"
          />
        </BentoGrid>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="grid gap-4">
          <SectionHeader
            title={t("home.upcomingLists")}
            body={wishlists.length > 0 ? t("home.heroBody") : t("home.emptyBody")}
            action={
              <Link
                to="/lists"
                className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta focus:outline-none focus:ring-4 focus:ring-coral/15"
              >
                {t("actions.viewAll")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />

          {loading ? (
            <LoadingState
              title={t("common.loadingTitle")}
              body={t("common.loadingBody")}
              timeoutTitle={t("common.loadingTimeoutTitle")}
              timeoutBody={t("common.loadingTimeoutBody")}
              retryLabel={t("common.retry")}
              redirectTo="/lists"
              redirectLabel={t("nav.lists")}
              onRetry={() => window.location.reload()}
            />
          ) : null}
          {error ? <p className="text-sm text-terracotta">{error}</p> : null}

          {!loading && !error && wishlists.length === 0 ? (
            <EmptyState
              title={t("home.emptyTitle")}
              body={t("home.emptyBody")}
              action={t("home.emptyAction")}
              onAction={() => navigate("/create")}
              branded
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {wishlists.slice(0, 4).map((wishlist) => {
              const summary = buildWishlistSummary(wishlist, locale, t);
              return (
                <WishlistCard
                  key={wishlist.id}
                  to={`/lists/${wishlist.id}`}
                  cover={wishlist.cover_image_url || fallbackCover}
                  occasionLabel={summary.occasionLabel}
                  title={wishlist.title}
                  dateLabel={summary.dateLabel}
                  giftCountLabel={summary.giftCountLabel}
                  reservedCountLabel={summary.reservedCountLabel}
                  visibilityLabel={summary.visibilityLabel}
                />
              );
            })}
          </div>
        </div>

        <BentoGrid className="xl:sticky xl:top-6">
          <ActionBentoCard
            icon={Plus}
            title={t("home.createNew")}
            body={t("home.emptyBody")}
            action={
              <Link to="/create" className="inline-flex">
                <SecondaryButton>{t("actions.createWishlist")}</SecondaryButton>
              </Link>
            }
          />
          <BentoCard tone="default" className="grid gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-coral">{t("nav.lists")}</p>
            <div className="grid gap-3">
              <Link to="/create" className="contents">
                <SecondaryButton className="w-full">
                  <Plus size={17} aria-hidden="true" />
                  {t("home.createNew")}
                </SecondaryButton>
              </Link>
              <Link to={addGiftHref} className="contents">
                <SecondaryButton className="w-full">
                  <Plus size={17} aria-hidden="true" />
                  {t("actions.addGift")}
                </SecondaryButton>
              </Link>
              <Link to={firstWishlist ? `/lists/${firstWishlist.id}` : previewHref} className="contents">
                <SecondaryButton className="w-full">{t("home.shareList")}</SecondaryButton>
              </Link>
            </div>
          </BentoCard>
        </BentoGrid>
      </section>
    </PremiumPageShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gift;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[26px] border border-border bg-surface p-4 shadow-card">
      <Icon size={18} aria-hidden="true" className="text-terracotta" />
      <p className="mt-3 text-2xl font-bold tracking-[-0.03em] text-warm-900">{value}</p>
      <p className="mt-1 text-sm text-warm-600">{label}</p>
    </div>
  );
}
