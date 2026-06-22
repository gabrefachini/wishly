import { CalendarDays, Gift, Lock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

type WishlistCardProps = {
  to: string;
  cover: string;
  occasionLabel: string;
  title: string;
  dateLabel: string;
  giftCountLabel: string;
  reservedCountLabel: string;
  visibilityLabel: string;
};

export function WishlistCard({
  to,
  cover,
  occasionLabel,
  title,
  dateLabel,
  giftCountLabel,
  reservedCountLabel,
  visibilityLabel,
}: WishlistCardProps) {
  const visibilityIcon =
    visibilityLabel.toLowerCase().includes("private") ? (
      <Lock size={14} aria-hidden="true" />
    ) : (
      <Share2 size={14} aria-hidden="true" />
    );

  return (
    <Link
      to={to}
      className="group grid grid-cols-[104px_1fr] gap-4 rounded-[28px] bg-porcelain p-3 shadow-card ring-1 ring-warm-100/80 transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-coral/20"
    >
      <img src={cover} alt="" className="h-28 w-full rounded-[22px] object-cover" />
      <div className="flex min-w-0 flex-col justify-between py-1 pr-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
            {occasionLabel}
          </p>
          <h3 className="mt-1 truncate text-lg font-bold text-warm-900">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-warm-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} aria-hidden="true" />
            {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warm-50 px-2.5 py-1 text-warm-700">
            <Gift size={14} aria-hidden="true" />
            {giftCountLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warm-50 px-2.5 py-1 text-warm-700">
            {visibilityIcon}
            {visibilityLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warm-50 px-2.5 py-1 text-warm-700">
            {reservedCountLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
