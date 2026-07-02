import { ExternalLink, HeartHandshake, LockKeyhole, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { StatusBadge } from "./StatusBadge";

export type GiftCardModel = {
  id: string;
  name: string;
  store: string;
  priceLabel: string;
  priority: "mustHave" | "niceToHave" | "surpriseMe";
  status: "available" | "reserved" | "purchased";
  image: string;
  note?: string;
  groupGift?: boolean;
  storeUrl?: string | null;
  purchaseType?: "individual" | "collective";
  buyHref?: string | null;
  showAffiliateDisclosure?: boolean;
  funding?: {
    goalLabel: string;
    raisedLabel: string;
    remainingLabel: string;
    progress: number;
    isFunded: boolean;
  };
};

type GiftCardProps = {
  gift: GiftCardModel;
  mode?: "owner" | "visitor";
  onReserve?: (giftId: string) => void;
  onContribute?: (giftId: string) => void;
  ownerAction?: ReactNode;
  suppressOwnerStatusNote?: boolean;
  themed?: boolean;
  menu?: ReactNode;
  onOpenDetails?: (giftId: string) => void;
};

export function GiftCard({
  gift,
  mode = "owner",
  onReserve,
  onContribute,
  ownerAction,
  suppressOwnerStatusNote = false,
  themed = false,
  menu,
  onOpenDetails,
}: GiftCardProps) {
  const { t } = useTranslation();
  const disabled = gift.status !== "available";
  const isCollective = gift.purchaseType === "collective" || gift.groupGift;

  return (
    <article className="rounded-[30px] bg-surface p-4 shadow-card ring-1 ring-border sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
        <button
          type="button"
          onClick={() => onOpenDetails?.(gift.id)}
          className="overflow-hidden rounded-[24px] text-left focus:outline-none"
        >
          <img src={gift.image} alt={gift.name} className="h-48 w-full rounded-[24px] object-cover sm:h-32" />
        </button>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
            <StatusBadge label={gift.status} themed={themed} />
            {isCollective ? <StatusBadge label={gift.funding?.isFunded ? "funded" : "groupGift"} themed={themed} /> : null}
            {!isCollective ? <StatusBadge label={gift.priority} themed={themed} /> : null}
            </div>
            {menu}
          </div>
          <button
            type="button"
            onClick={() => onOpenDetails?.(gift.id)}
            className="mt-4 block text-left focus:outline-none"
          >
            <h3 className="text-lg font-bold tracking-[-0.02em] text-warm-900">{gift.name}</h3>
          </button>
          <p className="mt-3 text-2xl font-bold tracking-[-0.03em] text-warm-900">
            {gift.priceLabel}
          </p>
          <p className="mt-1 text-sm text-warm-500">
            {gift.store}
          </p>
          {mode === "owner" && gift.status !== "available" && !suppressOwnerStatusNote ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-warm-500">
              <LockKeyhole size={14} aria-hidden="true" />
              {t("status.surpriseProtected")}
            </p>
          ) : null}
        </div>
      </div>

      {gift.note ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-warm-500">{gift.note}</p> : null}

      {gift.funding ? (
        <div
          className={`mt-4 grid gap-2 rounded-[24px] p-4 ${themed ? "" : "bg-surface-alt"}`}
          style={themed ? { backgroundColor: "var(--wishlist-secondary-soft)" } : undefined}
        >
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-warm-500">
            <span>{t("giftFunding.raised")}: {gift.funding.raisedLabel}</span>
            <span>{t("giftFunding.goal")}: {gift.funding.goalLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-warm-100">
            <div
              className={`h-full rounded-full transition-[width] ${themed ? "" : "bg-coral"}`}
              style={{
                width: `${gift.funding.progress}%`,
                backgroundColor: themed ? "var(--wishlist-progress)" : undefined,
              }}
            />
          </div>
          <p className="text-xs text-warm-500">
            {t("giftFunding.remaining")}: {gift.funding.remainingLabel}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {mode === "owner" && gift.storeUrl ? (
          <a
            href={gift.storeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {gift.store}
          </a>
        ) : null}
        {mode === "visitor" && gift.buyHref ? (
          <a
            href={gift.buyHref}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-warm-700 shadow-card transition ${themed ? "" : "hover:border-coral/35 hover:text-terracotta"}`}
            style={themed ? { borderColor: "var(--wishlist-primary-soft)" } : undefined}
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t("actions.buyWithAffiliate")}
          </a>
        ) : null}
        {ownerAction}
      </div>

      {mode === "visitor" && gift.showAffiliateDisclosure ? (
        <p className="mt-3 text-xs leading-5 text-warm-500">{t("affiliate.disclosure")}</p>
      ) : null}

      {mode === "visitor" ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <PrimaryButton
            disabled={disabled || (isCollective && gift.funding?.isFunded)}
            className="w-full disabled:cursor-not-allowed disabled:bg-warm-300"
            style={
              themed
                ? {
                    backgroundColor: "var(--wishlist-button)",
                    boxShadow: "0 14px 28px var(--wishlist-primary-soft)",
                  }
                : undefined
            }
            onClick={() => (isCollective ? onContribute?.(gift.id) : onReserve?.(gift.id))}
          >
            {isCollective ? <HeartHandshake size={17} aria-hidden="true" /> : <ShoppingBag size={17} aria-hidden="true" />}
            {disabled
              ? t(`status.${gift.status}`)
              : isCollective
                ? t("giftFunding.contribute")
                : t("actions.buyThis")}
          </PrimaryButton>
          {isCollective ? (
            <SecondaryButton
              className="w-full"
              style={themed ? { borderColor: "var(--wishlist-primary-soft)", color: "var(--wishlist-primary)" } : undefined}
              onClick={() => onContribute?.(gift.id)}
            >
              <HeartHandshake size={17} aria-hidden="true" />
              {t("actions.buyTogether")}
            </SecondaryButton>
          ) : (
            <SecondaryButton
              className="w-full"
              style={themed ? { borderColor: "var(--wishlist-primary-soft)", color: "var(--wishlist-primary)" } : undefined}
              onClick={() => onReserve?.(gift.id)}
            >
              <ShoppingBag size={17} aria-hidden="true" />
              {t("actions.reserveGift")}
            </SecondaryButton>
          )}
        </div>
      ) : null}
    </article>
  );
}
