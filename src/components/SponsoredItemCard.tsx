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
    <article className="overflow-hidden rounded-[28px] bg-porcelain shadow-card ring-1 ring-warm-100">
      <img
        src={item.image_url || fallbackImage}
        alt=""
        className="h-44 w-full object-cover"
      />
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blush px-3 py-1 text-xs font-semibold text-terracotta">
            {sponsoredLabel}
          </span>
          {item.occasion ? <StatusBadge label="groupGift" /> : null}
          {occasionLabel ? (
            <span className="inline-flex items-center rounded-full bg-warm-50 px-3 py-1 text-xs font-semibold text-warm-600">
              {occasionLabel}
            </span>
          ) : null}
        </div>
        <div>
          <h3 className="text-lg font-bold text-warm-900">{item.title}</h3>
          {item.description ? (
            <p className="mt-2 text-sm leading-6 text-warm-500">{item.description}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-warm-700">
            {item.price !== null ? formatCurrency(item.price, locale, item.currency) : openLabel}
          </p>
          <div className="flex gap-2">
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
