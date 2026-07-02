import { Gift, Lock, Share2 } from "lucide-react";
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
      className="group grid gap-4 rounded-modal bg-surface p-3 shadow-card ring-1 ring-border transition hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-primary/20 sm:grid-cols-[120px_1fr]"
    >
      <img src={cover} alt="" className="h-40 w-full rounded-card object-cover sm:h-32" />
      <div className="flex min-w-0 flex-col justify-between py-1 pr-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {occasionLabel}
          </p>
          <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-warm-900 sm:text-[1.3rem]">{title}</h3>
          <p className="mt-2 text-sm text-warm-500">{dateLabel}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-warm-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-warm-700">
            <Gift size={14} aria-hidden="true" />
            {giftCountLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-warm-700">
            {visibilityIcon}
            {visibilityLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-primary-strong">
            {reservedCountLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
