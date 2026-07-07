import { ArrowRight, BarChart3, Radar, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/States";
import { LoadingState } from "../components/LoadingState";
import { SecondaryButton } from "../components/Buttons";
import { BentoCard, BentoGrid, MetricBentoCard, PremiumPageShell, SectionHeader } from "../components/PremiumLayout";
import { useTranslation } from "../i18n/useTranslation";
import { formatCurrency } from "../i18n/formatters";
import { updateMetadata } from "../lib/metadata";
import { getPriceRecommendation } from "../lib/priceRadar";
import { listActiveWishlists } from "../services/wishlists";
import type { GiftRecord, WishlistWithGifts } from "../types/domain";

type RadarGroup = {
  wishlist: WishlistWithGifts;
  trackedGifts: GiftRecord[];
  currentTrackedValue: number;
  opportunityCount: number;
};

type HighlightItem = {
  gift: GiftRecord;
  wishlist: WishlistWithGifts;
  score: number;
};

function getTrackedGiftValue(gift: GiftRecord) {
  return gift.current_price ?? gift.estimated_price ?? null;
}

function isOpportunity(gift: GiftRecord) {
  return gift.recommendation_status === "buy_now" || gift.recommendation_status === "good_price";
}

export function PremiumRadarPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateMetadata({
      title: `${t("nav.radar")} — Wishly`,
      description: t("radarPage.body"),
    });
  }, [t]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

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
  }, [t]);

  const radarGroups = useMemo<RadarGroup[]>(() => {
    return wishlists
      .map((wishlist) => {
        const trackedGifts = wishlist.gifts.filter(
          (gift) => gift.deleted_at === null && gift.price_tracking_enabled,
        );

        const currentTrackedValue = trackedGifts.reduce((total, gift) => {
          const nextValue = getTrackedGiftValue(gift);
          return total + (nextValue ?? 0);
        }, 0);

        return {
          wishlist,
          trackedGifts,
          currentTrackedValue,
          opportunityCount: trackedGifts.filter(isOpportunity).length,
        };
      })
      .filter((group) => group.trackedGifts.length > 0)
      .sort((left, right) => {
        if (right.opportunityCount !== left.opportunityCount) {
          return right.opportunityCount - left.opportunityCount;
        }

        return right.trackedGifts.length - left.trackedGifts.length;
      });
  }, [wishlists]);

  const trackedGifts = useMemo(
    () => radarGroups.flatMap((group) => group.trackedGifts),
    [radarGroups],
  );

  const trackedValue = trackedGifts.reduce((total, gift) => {
    const nextValue = getTrackedGiftValue(gift);
    return total + (nextValue ?? 0);
  }, 0);

  const highlights = useMemo<HighlightItem[]>(() => {
    return trackedGifts
      .map((gift) => {
        const wishlist = wishlists.find((item) => item.id === gift.wishlist_id);
        if (!wishlist) return null;

        const recommendation = getPriceRecommendation(
          {
            currentPrice: gift.current_price,
            averagePrice: gift.average_price,
            lowestPrice: gift.lowest_price,
            highestPrice: gift.highest_price,
            lastPrice: gift.price_history?.at(-2)?.price ?? null,
            priceHistory: gift.price_history,
            targetPrice: gift.target_price,
            currency: gift.currency,
          },
          locale,
        );

        return {
          gift,
          wishlist,
          score: recommendation.score,
        };
      })
      .filter((item): item is HighlightItem => item !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);
  }, [locale, trackedGifts, wishlists]);

  return (
    <PremiumPageShell>
      <SectionHeader eyebrow={t("radarPage.eyebrow")} title={t("radarPage.title")} body={t("radarPage.body")} />

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

      {error ? <p className="text-sm text-primary-strong">{error}</p> : null}

      {!loading && !error && radarGroups.length === 0 ? (
        <EmptyState
          title={t("radarPage.emptyTitle")}
          body={t("radarPage.emptyBody")}
          action={t("radarPage.emptyAction")}
          onAction={() => navigate("/lists")}
          branded
        />
      ) : null}

      {!loading && !error && radarGroups.length > 0 ? (
        <>
          <BentoGrid className="sm:grid-cols-2 xl:grid-cols-4">
            <MetricBentoCard
              icon={Radar}
              label={t("radarPage.trackedItems")}
              value={String(trackedGifts.length)}
              accent="primary"
            />
            <MetricBentoCard
              icon={BarChart3}
              label={t("radarPage.activeLists")}
              value={String(radarGroups.length)}
              accent="info"
            />
            <MetricBentoCard
              icon={Target}
              label={t("radarPage.trackedValue")}
              value={formatCurrency(trackedValue, locale, "BRL")}
              accent="neutral"
            />
            <MetricBentoCard
              icon={Sparkles}
              label={t("radarPage.opportunities")}
              value={String(trackedGifts.filter(isOpportunity).length)}
              accent="emerald"
            />
          </BentoGrid>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="grid gap-4">
              <SectionHeader title={t("radarPage.groupTitle")} body={t("radarPage.groupBody")} />
              <div className="grid gap-4">
                {radarGroups.map((group) => (
                  <BentoCard key={group.wishlist.id} className="grid gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold tracking-[-0.02em] text-warm-900">{group.wishlist.title}</h3>
                        <p className="mt-2 text-sm text-warm-500">{t(`occasions.${group.wishlist.occasion}`)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-warm-600">
                        <span className="rounded-full bg-sunken px-3 py-1">
                          {t("radarPage.listTrackedCount", { count: group.trackedGifts.length })}
                        </span>
                        <span className="rounded-full bg-sunken px-3 py-1 text-emerald-700">
                          {t("radarPage.listOpportunitiesCount", { count: group.opportunityCount })}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-card bg-sunken p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warm-500">
                          {t("radarPage.trackedValue")}
                        </p>
                        <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-warm-900">
                          {formatCurrency(group.currentTrackedValue, locale, "BRL")}
                        </p>
                      </div>
                      <div className="rounded-card bg-sunken p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warm-500">
                          {t("radarPage.trackedItems")}
                        </p>
                        <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-warm-900">
                          {group.trackedGifts.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {group.trackedGifts.slice(0, 3).map((gift) => (
                        <div
                          key={gift.id}
                          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-warm-900">{gift.name}</p>
                            <p className="mt-1 text-sm text-warm-500">
                              {gift.current_price !== null
                                ? formatCurrency(gift.current_price, locale, gift.currency)
                                : t("radarPage.noCurrentPrice")}
                            </p>
                          </div>
                          <Link to={`/lists/${group.wishlist.id}`} className="inline-flex">
                            <SecondaryButton>
                              {t("actions.viewList")}
                              <ArrowRight size={16} aria-hidden="true" />
                            </SecondaryButton>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </BentoCard>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:sticky xl:top-6">
              <SectionHeader title={t("radarPage.highlightTitle")} body={t("radarPage.highlightBody")} align="left" />
              <div className="grid gap-4">
                {highlights.map(({ gift, wishlist }) => (
                  <BentoCard key={gift.id} tone="soft" className="grid gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {t("radarPage.fromList", { title: wishlist.title })}
                      </p>
                      <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-warm-900">{gift.name}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-card bg-surface p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warm-500">
                          {t("radarPage.currentPrice")}
                        </p>
                        <p className="mt-2 text-lg font-bold text-warm-900">
                          {gift.current_price !== null
                            ? formatCurrency(gift.current_price, locale, gift.currency)
                            : t("radarPage.noCurrentPrice")}
                        </p>
                      </div>
                      <div className="rounded-card bg-surface p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warm-500">
                          {t("radarPage.targetPrice")}
                        </p>
                        <p className="mt-2 text-lg font-bold text-warm-900">
                          {gift.target_price !== null
                            ? formatCurrency(gift.target_price, locale, gift.currency)
                            : t("radarPage.noTargetPrice")}
                        </p>
                      </div>
                    </div>
                    <Link to={`/lists/${wishlist.id}`} className="inline-flex">
                      <SecondaryButton className="w-full sm:w-auto">
                        {t("actions.viewList")}
                      </SecondaryButton>
                    </Link>
                  </BentoCard>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </PremiumPageShell>
  );
}
