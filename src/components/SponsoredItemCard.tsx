import { ExternalLink, Plus } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { formatCurrency, type Locale } from "../i18n/formatters";

type SponsoredItemCardProps = {
  item: {
    title: string;
    description: string | null;
    image_url: string | null;
    destination_url: string;
    occasion: string | null;
    price: number | null;
    currency: string;
  };
  locale: Locale;
  sponsoredLabel: string;
  occasionLabel?: string;
  addLabel: string;
  openLabel: string;
  onAdd: () => void;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1513279922550-250c2129b13a?auto=format&fit=crop&w=900&q=80";

export function SponsoredItemCard({
  item,
  locale,
  sponsoredLabel,
  occasionLabel,
  addLabel,
  openLabel,
  onAdd,
}: SponsoredItemCardProps) {
  return (
    <article className="overflow-hidden rounded-[30px] bg-surface shadow-card ring-1 ring-border transition hover:shadow-soft">
      <img
        src={item.image_url || fallbackImage}
        alt=""
        className="h-52 w-full object-cover"
      />
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blush px-3 py-1 text-xs font-semibold text-terracotta">
            {sponsoredLabel}
          </span>
          {item.occasion ? <StatusBadge label="groupGift" /> : null}
          {occasionLabel ? (
            <span className="inline-flex items-center rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-warm-600">
              {occasionLabel}
            </span>
          ) : null}
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-[-0.02em] text-warm-900">{item.title}</h3>
          {item.description ? (
            <p className="mt-2 text-sm leading-6 text-warm-500">{item.description}</p>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <p className="text-base font-semibold text-warm-700">
            {item.price !== null ? formatCurrency(item.price, locale, item.currency) : openLabel}
          </p>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <a href={item.destination_url} target="_blank" rel="noreferrer">
              <SecondaryButton type="button">
                <ExternalLink size={16} aria-hidden="true" />
                {openLabel}
              </SecondaryButton>
            </a>
            <PrimaryButton type="button" onClick={onAdd}>
              <Plus size={16} aria-hidden="true" />
              {addLabel}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </article>
  );
}
