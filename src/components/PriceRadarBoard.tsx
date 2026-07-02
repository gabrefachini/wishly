import { Activity, ArrowDownRight, ArrowUpRight, Clock3, Store, Target } from "lucide-react";
import type { ReactNode } from "react";
import { SecondaryButton } from "./Buttons";
import { PriceSparkline } from "./PriceSparkline";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatDate, type Locale } from "../i18n/formatters";
import { getPriceRadarHistoryPoints, getPriceRecommendation, getPriceTrend } from "../lib/priceRadar";
import type { GiftRecord, WishlistWithGifts } from "../types/domain";

type PriceRadarBoardProps = {
  wishlist: WishlistWithGifts;
  trackedGifts: GiftRecord[];
  radarOpportunities: GiftRecord[];
  potentialSavings: number;
  canUseRadar: boolean;
  fallbackImageUrl: string;
  locale: Locale;
  t: (key: string) => string;
  onToggleGiftRadar: (gift: GiftRecord, enabled: boolean) => void;
  onOpenGiftEditor: (gift: GiftRecord) => void;
};

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatSignedPercent(value: number | null, locale: Locale) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const formatter = new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    signDisplay: "always",
  });

  return `${formatter.format(value)}%`;
}

function toneClasses(severity: "positive" | "neutral" | "warning") {
  if (severity === "positive") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (severity === "warning") {
    return "bg-sunken text-primary-strong ring-primary/10";
  }

  return "bg-warm-100 text-warm-600 ring-border";
}

function metricLabel(
  label: string,
  value: ReactNode,
  subdued = false,
) {
  return (
    <div className="grid gap-1 rounded-card bg-surface p-3 ring-1 ring-border">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warm-500">{label}</p>
      <div className={`text-sm font-semibold ${subdued ? "text-warm-600" : "text-warm-900"}`}>{value}</div>
    </div>
  );
}

function getHistoryBoundaries(gift: GiftRecord) {
  const historyEntries = (gift.price_history ?? [])
    .filter((entry) => Number.isFinite(entry.price))
    .slice()
    .sort((left, right) => left.checked_at.localeCompare(right.checked_at));

  return {
    historyEntries,
    firstCheckedAt: historyEntries[0]?.checked_at ?? gift.created_at,
    lastCheckedAt: gift.last_checked_at ?? historyEntries.at(-1)?.checked_at ?? null,
  };
}

function getRadarStatusText({
  gift,
  locale,
  t,
}: {
  gift: GiftRecord;
  locale: Locale;
  t: (key: string) => string;
}) {
  const currentPrice = gift.current_price ?? gift.estimated_price ?? null;
  const recommendation = getPriceRecommendation(
    {
      currentPrice,
      averagePrice: gift.average_price,
      lowestPrice: gift.lowest_price,
      highestPrice: gift.highest_price,
      lastPrice: gift.original_price ?? gift.current_price ?? null,
      priceHistory: gift.price_history,
      targetPrice: gift.target_price,
      currency: gift.currency,
    },
    locale,
  );
  const priceTrend = getPriceTrend(
    currentPrice,
    gift.original_price ?? gift.current_price ?? null,
    gift.average_price,
    gift.price_history,
  );

  const trendText =
    priceTrend === "down"
      ? t("priceRadar.item.trendDown")
      : priceTrend === "up"
        ? t("priceRadar.item.trendUp")
        : priceTrend === "stable"
          ? t("priceRadar.item.trendStable")
          : t("priceRadar.item.trendUnknown");

  const changeText =
    formatSignedPercent(gift.price_change_percentage, locale) ||
    (currentPrice !== null && gift.original_price ? formatSignedPercent(((currentPrice - gift.original_price) / gift.original_price) * 100, locale) : null);

  return {
    currentPrice,
    recommendation,
    trendText,
    changeText,
  };
}

export function PriceRadarBoard({
  wishlist,
  trackedGifts,
  radarOpportunities,
  potentialSavings,
  canUseRadar,
  fallbackImageUrl,
  locale,
  t,
  onToggleGiftRadar,
  onOpenGiftEditor,
}: PriceRadarBoardProps) {
  if (!canUseRadar) {
    return (
      <section className="grid gap-4 rounded-modal border border-dashed border-primary/25 bg-sunken p-5 shadow-card sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-primary">{t("priceRadar.eyebrow")}</p>
            <h2 className="text-xl font-bold text-warm-900">{t("priceRadar.dashboardTitle")}</h2>
            <p className="text-sm leading-6 text-warm-600">{t("priceRadar.paywallBody")}</p>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-warm-600 ring-1 ring-border">
            {t("priceRadar.disabled")}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <p className="rounded-card bg-surface p-4 text-sm text-warm-600 ring-1 ring-border">
            {t("priceRadar.benefitTracking")}
          </p>
          <p className="rounded-card bg-surface p-4 text-sm text-warm-600 ring-1 ring-border">
            {t("priceRadar.benefitHistory")}
          </p>
          <p className="rounded-card bg-surface p-4 text-sm text-warm-600 ring-1 ring-border">
            {t("priceRadar.benefitAlerts")}
          </p>
          <p className="rounded-card bg-surface p-4 text-sm text-warm-600 ring-1 ring-border">
            {t("priceRadar.benefitTarget")}
          </p>
        </div>
      </section>
    );
  }

  if (trackedGifts.length === 0) {
    return (
      <section className="grid gap-4 rounded-modal bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-primary">{t("priceRadar.eyebrow")}</p>
            <h2 className="text-xl font-bold text-warm-900">{t("priceRadar.dashboardTitle")}</h2>
            <p className="text-sm leading-6 text-warm-600">{t("priceRadar.dashboardBody")}</p>
          </div>
          <span className="rounded-full bg-warm-50 px-3 py-1 text-xs font-semibold text-warm-600">
            {wishlist.is_price_radar_enabled ? t("priceRadar.enabled") : t("priceRadar.disabled")}
          </span>
        </div>
        <div className="rounded-modal border border-dashed border-border bg-sunken p-5">
          <p className="text-sm font-semibold text-warm-800">{t("priceRadar.emptyTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-warm-600">{t("priceRadar.emptyBody")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 rounded-modal bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)] lg:items-start">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-primary">{t("priceRadar.eyebrow")}</p>
              <h2 className="text-xl font-bold text-warm-900">{t("priceRadar.dashboardTitle")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-warm-600">{t("priceRadar.dashboardBody")}</p>
            </div>
            <span className="rounded-full bg-warm-50 px-3 py-1 text-xs font-semibold text-warm-600">
              {t("priceRadar.enabled")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {metricLabel(t("priceRadar.stats.monitored"), trackedGifts.length)}
            {metricLabel(t("priceRadar.stats.opportunities"), radarOpportunities.length)}
            {potentialSavings > 0
              ? metricLabel(
                  t("priceRadar.stats.potentialSavings"),
                  formatCurrency(
                    potentialSavings,
                    locale,
                    wishlist.gifts[0]?.currency || (locale === "pt-BR" ? "BRL" : "USD"),
                  ),
                )
              : metricLabel(t("priceRadar.stats.potentialSavings"), t("priceRadar.summary.learning"), true)}
          </div>
        </div>

        <div className="grid gap-3 rounded-modal bg-sunken p-4 ring-1 ring-border">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-warm-800">{t("priceRadar.summary.title")}</p>
              <p className="text-sm leading-6 text-warm-600">{t("priceRadar.summary.body")}</p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-warm-600 ring-1 ring-border">
              {trackedGifts.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-warm-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 ring-1 ring-border">
              <Activity size={13} aria-hidden="true" />
              {t("priceRadar.summary.realtime")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 ring-1 ring-border">
              <Clock3 size={13} aria-hidden="true" />
              {t("priceRadar.summary.updatedOften")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {trackedGifts.map((gift) => {
          const { historyEntries, firstCheckedAt, lastCheckedAt } = getHistoryBoundaries(gift);
          const historyPoints = getPriceRadarHistoryPoints(gift.price_history);
          const { currentPrice, recommendation, trendText, changeText } = getRadarStatusText({
            gift,
            locale,
            t,
          });
          const targetPrice = gift.target_price;
          const lowestPrice = gift.lowest_price;
          const averagePrice = gift.average_price;
          const startDateLabel = formatDate(firstCheckedAt, locale);
          const lastCheckLabel = lastCheckedAt ? formatDateTime(lastCheckedAt, locale) : t("priceRadar.item.noHistory");
          const currentPriceLabel =
            currentPrice !== null
              ? formatCurrency(currentPrice, locale, gift.currency || (locale === "pt-BR" ? "BRL" : "USD"))
              : t("priceRadar.noCurrentPrice");
          const hasHistory = historyEntries.length >= 2;
          const storeName = gift.store_url
            ? (() => {
                try {
                  return new URL(gift.store_url).hostname.replace(/^www\./, "");
                } catch {
                  return t("priceRadar.item.unknownStore");
                }
              })()
            : t("priceRadar.item.unknownStore");

          return (
            <article
              key={gift.id}
              className="overflow-hidden rounded-modal border border-border bg-surface p-4 shadow-card transition hover:shadow-soft sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start">
                <div className="grid gap-4">
                  <div className="flex gap-4">
                    <img
                      src={gift.image_url || fallbackImageUrl}
                      alt={gift.name}
                      className="h-24 w-24 shrink-0 rounded-card object-cover ring-1 ring-border"
                    />
                    <div className="min-w-0 grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-[var(--wishlist-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--wishlist-primary)]">
                          {gift.price_tracking_enabled ? t("priceRadar.item.active") : t("priceRadar.item.inactive")}
                        </span>
                        <StatusBadge label={gift.status} />
                        <span className="inline-flex items-center rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-warm-600 ring-1 ring-border">
                          {storeName}
                        </span>
                        {changeText ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                              changeText.startsWith("-")
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-sunken text-primary-strong ring-primary/10"
                            }`}
                          >
                            {changeText.startsWith("-") ? (
                              <ArrowDownRight size={13} aria-hidden="true" />
                            ) : (
                              <ArrowUpRight size={13} aria-hidden="true" />
                            )}
                            {trendText} · {changeText}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-warm-600 ring-1 ring-border">
                            {trendText}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold tracking-tight text-warm-900 sm:text-2xl">{gift.name}</h3>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-warm-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Store size={14} aria-hidden="true" className="text-warm-400" />
                            {storeName}
                          </span>
                          <span aria-hidden="true" className="hidden sm:inline">•</span>
                          <span>
                            {t("priceRadar.item.monitoringSince")}: {startDateLabel}
                          </span>
                          <span aria-hidden="true" className="hidden sm:inline">•</span>
                          <span>
                            {t("priceRadar.item.lastChecked")}: {lastCheckLabel}
                          </span>
                        </p>
                      </div>

                      <div className="grid gap-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          {t("priceRadar.item.currentPrice")}
                        </p>
                        <div className="text-3xl font-bold tracking-tight text-warm-900 sm:text-[2.15rem]">
                          {currentPriceLabel}
                        </div>
                        <p className="text-sm leading-6 text-warm-600">{recommendation.title}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 rounded-modal bg-sunken p-4 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        {t("priceRadar.item.analysisTitle")}
                      </p>
                      <h4 className="text-lg font-bold text-warm-900">{recommendation.title}</h4>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses(recommendation.severity)}`}>
                      {recommendation.score}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-warm-600">{recommendation.message}</p>

                  <div className="grid gap-3">
                    <div className="rounded-card bg-surface p-3 ring-1 ring-border">
                      <div className="flex items-end justify-between gap-3">
                        <div className="grid gap-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warm-500">
                            {t("priceRadar.item.priceHistory")}
                          </p>
                          <p className="text-xs text-warm-500">{t("priceRadar.item.last30Days")}</p>
                        </div>
                        {targetPrice !== null ? (
                          <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-semibold text-primary-strong ring-1 ring-primary/10">
                            {t("priceRadar.item.targetPrice")}
                          </span>
                        ) : null}
                      </div>
                      <PriceSparkline
                        points={historyPoints}
                        referenceValue={targetPrice}
                        referenceLabel={t("priceRadar.item.targetPrice")}
                        currentLabel={t("priceRadar.item.currentMarker")}
                        startLabel={t("priceRadar.item.timelineStart")}
                        endLabel={t("priceRadar.item.timelineEnd")}
                        accent="var(--wishlist-primary)"
                        softAccent="var(--wishlist-secondary-soft)"
                        emptyLabel={t("priceRadar.item.collectingHistoryShort")}
                      />
                      <p className="mt-2 text-xs leading-5 text-warm-500">
                        {hasHistory
                          ? t("priceRadar.item.historyCaptured")
                          : `${t("priceRadar.item.collectingHistoryTitle")} ${t("priceRadar.item.collectingHistoryBody")}`}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {metricLabel(
                        t("priceRadar.item.lowestPrice"),
                        lowestPrice !== null ? formatCurrency(lowestPrice, locale, gift.currency) : "—",
                        true,
                      )}
                      {metricLabel(
                        t("priceRadar.item.averagePrice"),
                        averagePrice !== null ? formatCurrency(averagePrice, locale, gift.currency) : "—",
                        true,
                      )}
                      {metricLabel(
                        t("priceRadar.item.targetPrice"),
                        targetPrice !== null ? formatCurrency(targetPrice, locale, gift.currency) : t("priceRadar.item.noTarget"),
                        true,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <SecondaryButton type="button" onClick={() => onToggleGiftRadar(gift, !gift.price_tracking_enabled)}>
                  {gift.price_tracking_enabled ? t("priceRadar.disable") : t("priceRadar.activate")}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => onOpenGiftEditor(gift)}>
                  <Target size={16} aria-hidden="true" />
                  {t("priceRadar.setTarget")}
                </SecondaryButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
