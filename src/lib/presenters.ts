import { formatCurrency, formatDate, type Locale } from "../i18n/formatters";
import type { GiftPriority, GiftRecord, WishlistRecord, WishlistWithGifts } from "../types/domain";
import { calculateFundingProgress } from "./affiliate";

export function mapGiftPriority(priority: GiftPriority) {
  if (priority === "must_have") return "mustHave";
  if (priority === "nice_to_have") return "niceToHave";
  return "surpriseMe";
}

export function mapGiftStatus(status: GiftRecord["status"]) {
  return status;
}

export function formatGiftPrice(
  value: number | null,
  locale: Locale,
  currency: string,
  estimatedLabel: string,
) {
  if (value === null) {
    return estimatedLabel;
  }

  return `${estimatedLabel} ${formatCurrency(value, locale, currency)}`;
}

export function buildFundingSummary(
  gift: Pick<GiftRecord, "funding_goal_amount" | "funding_received_amount" | "funding_currency">,
  locale: Locale,
) {
  const goal = gift.funding_goal_amount ?? 0;
  const raised = gift.funding_received_amount ?? 0;
  const remaining = Math.max(goal - raised, 0);

  return {
    goalLabel: formatCurrency(goal, locale, gift.funding_currency || "USD"),
    raisedLabel: formatCurrency(raised, locale, gift.funding_currency || "USD"),
    remainingLabel: formatCurrency(remaining, locale, gift.funding_currency || "USD"),
    progress: calculateFundingProgress(goal, raised),
  };
}

export function buildWishlistSummary(
  wishlist: WishlistWithGifts | WishlistRecord & { gifts?: GiftRecord[] },
  locale: Locale,
  t: (key: string) => string,
) {
  const gifts = (wishlist.gifts ?? []).filter((gift) => gift.deleted_at === null);
  const reservedCount = gifts.filter((gift) => gift.status === "reserved").length;
  const visibilityLabel =
    wishlist.visibility === "public_link" ? t("common.shared") : t("common.private");

  return {
    occasionLabel: t(`occasions.${wishlist.occasion}`),
    dateLabel: wishlist.event_date ? formatDate(wishlist.event_date, locale) : "-",
    giftCountLabel: `${gifts.length} ${t("lists.giftCount")}`,
    reservedCountLabel: `${reservedCount} ${t("lists.reservedCount")}`,
    visibilityLabel,
  };
}
