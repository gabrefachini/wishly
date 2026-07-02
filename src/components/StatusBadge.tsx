import { useTranslation } from "../i18n/useTranslation";

type StatusBadgeProps = {
  label:
    | "available"
    | "reserved"
    | "purchased"
    | "mustHave"
    | "niceToHave"
    | "surpriseMe"
    | "groupGift"
    | "funded";
  tone?: "status" | "priority" | "neutral";
  themed?: boolean;
};

const statusClasses: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  reserved: "bg-lavender text-warm-900 ring-border",
  purchased: "bg-warm-100 text-warm-500 ring-warm-100",
  mustHave: "bg-blush text-terracotta ring-coral/10",
  niceToHave: "bg-surface-alt text-warm-700 ring-border",
  surpriseMe: "bg-porcelain text-warm-500 ring-warm-100",
  groupGift: "bg-lavender text-warm-900 ring-border",
  funded: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const labelKeys: Record<StatusBadgeProps["label"], string> = {
  available: "status.available",
  reserved: "status.reserved",
  purchased: "status.purchased",
  mustHave: "priority.mustHave",
  niceToHave: "priority.niceToHave",
  surpriseMe: "priority.surpriseMe",
  groupGift: "giftFunding.groupGift",
  funded: "giftFunding.fullyFunded",
};

export function StatusBadge({ label, themed = false }: StatusBadgeProps) {
  const { t } = useTranslation();
  const isReserved = label === "reserved";
  const isPrimaryAccent = label === "mustHave";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        themed && isReserved
          ? "bg-[var(--wishlist-secondary-soft)] text-[var(--wishlist-badge)] ring-[var(--wishlist-secondary-soft)]"
          : themed && isPrimaryAccent
            ? "bg-[var(--wishlist-primary-soft)] text-[var(--wishlist-primary)] ring-[var(--wishlist-primary-soft)]"
            : statusClasses[label] ?? "bg-warm-50 text-warm-500 ring-warm-100"
      }`}
    >
      {t(labelKeys[label])}
    </span>
  );
}
