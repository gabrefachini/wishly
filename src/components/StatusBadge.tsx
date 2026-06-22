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
};

const statusClasses: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  reserved: "bg-lavender text-violet-700 ring-violet-100",
  purchased: "bg-warm-100 text-warm-500 ring-warm-100",
  mustHave: "bg-blush text-terracotta ring-coral/10",
  niceToHave: "bg-skysoft text-sky-800 ring-sky-100",
  surpriseMe: "bg-porcelain text-warm-500 ring-warm-100",
  groupGift: "bg-skysoft text-sky-800 ring-sky-100",
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

export function StatusBadge({ label }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        statusClasses[label] ?? "bg-warm-50 text-warm-500 ring-warm-100"
      }`}
    >
      {t(labelKeys[label])}
    </span>
  );
}
