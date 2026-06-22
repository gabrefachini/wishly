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
};

export function GiftCard({
  gift,
  mode = "owner",
  onReserve,
  onContribute,
  ownerAction,
}: GiftCardProps) {
  const { t } = useTranslation();
  const disabled = gift.status !== "available";
  const isCollective = gift.purchaseType === "collective" || gift.groupGift;

  return (
    <article className="rounded-[28px] bg-porcelain p-3 shadow-card ring-1 ring-warm-100/80">
      <div className="grid grid-cols-[96px_1fr] gap-4">
        <img src={gift.image} alt={gift.name} className="h-28 w-full rounded-[22px] object-cover" />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={gift.status} />
            <StatusBadge label={gift.priority} />
            {isCollective ? <StatusBadge label={gift.funding?.isFunded ? "funded" : "groupGift"} /> : null}
          </div>
          <h3 className="mt-3 text-base font-bold text-warm-900">{gift.name}</h3>
          <p className="mt-1 text-sm text-warm-500">
            {gift.store} · {gift.priceLabel}
          </p>
          {mode === "owner" && gift.status !== "available" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-warm-500">
              <LockKeyhole size={14} aria-hidden="true" />
              {t("status.surpriseProtected")}
            </p>
          ) : null}
        </div>
      </div>

      {gift.note ? <p className="mt-4 text-sm text-warm-500">{gift.note}</p> : null}

      {gift.funding ? (
        <div className="mt-4 grid gap-2 rounded-[22px] bg-warm-50/70 p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-warm-500">
            <span>{t("giftFunding.raised")}: {gift.funding.raisedLabel}</span>
            <span>{t("giftFunding.goal")}: {gift.funding.goalLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-warm-100">
            <div
              className="h-full rounded-full bg-coral transition-[width]"
              style={{ width: `${gift.funding.progress}%` }}
            />
          </div>
          <p className="text-xs text-warm-500">
            {t("giftFunding.remaining")}: {gift.funding.remainingLabel}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "owner" && gift.storeUrl ? (
          <a
            href={gift.storeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-warm-100 bg-porcelain px-4 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {gift.store}
          </a>
        ) : null}
        {mode === "visitor" && gift.buyHref ? (
          <a
            href={gift.buyHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-warm-100 bg-porcelain px-4 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta"
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <PrimaryButton
            disabled={disabled || (isCollective && gift.funding?.isFunded)}
            className="w-full disabled:cursor-not-allowed disabled:bg-warm-300"
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
            <SecondaryButton className="w-full" onClick={() => onContribute?.(gift.id)}>
              <HeartHandshake size={17} aria-hidden="true" />
              {t("actions.buyTogether")}
            </SecondaryButton>
          ) : (
            <SecondaryButton className="w-full" onClick={() => onReserve?.(gift.id)}>
              <ShoppingBag size={17} aria-hidden="true" />
              {t("actions.reserveGift")}
            </SecondaryButton>
          )}
        </div>
      ) : null}
    </article>
  );
}
