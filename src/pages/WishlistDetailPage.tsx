import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GiftCard, type GiftCardModel } from "../components/GiftCard";
import { SecondaryButton, ShareButton } from "../components/Buttons";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/States";
import { buildFundingSummary, buildWishlistSummary, formatGiftPrice, mapGiftPriority, mapGiftStatus } from "../lib/presenters";
import { useTranslation } from "../i18n/useTranslation";
import { deleteGift, getMyWishlist, updateGiftStatus } from "../services/wishlists";
import type { GiftRecord, WishlistWithGifts } from "../types/domain";

const fallbackCover =
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80";

function storeLabel(url: string | null) {
  if (!url) return "Wishly";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Wishly";
  }
}

export function WishlistDetailPage() {
  const { id } = useParams();
  const { t, locale } = useTranslation();
  const [wishlist, setWishlist] = useState<WishlistWithGifts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [giftToDeleteId, setGiftToDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    getMyWishlist(id)
      .then((data) => {
        if (active) {
          setWishlist(data);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t("common.error"));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, t]);

  async function handleShare() {
    if (!wishlist) return;
    const shareUrl = `${window.location.origin}/w/${wishlist.share_id}`;

    if (navigator.share) {
      await navigator.share({ title: wishlist.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }

    setShareMessage(t("wishlist.linkCopied"));
  }

  async function handleMarkPurchased(giftId: string) {
    await updateGiftStatus(giftId, "purchased");
    if (wishlist) {
      const refreshed = await getMyWishlist(wishlist.id);
      setWishlist(refreshed);
    }
  }

  const giftToDelete = useMemo(
    () => wishlist?.gifts.find((gift) => gift.id === giftToDeleteId) ?? null,
    [giftToDeleteId, wishlist],
  );

  async function handleDeleteGift() {
    if (!giftToDeleteId || !wishlist) return;

    setDeleteLoading(true);
    setError(null);
    setDeleteMessage(null);
    try {
      await deleteGift(giftToDeleteId);
      setWishlist({
        ...wishlist,
        gifts: wishlist.gifts.filter((gift) => gift.id !== giftToDeleteId),
      });
      setDeleteMessage(t("giftDelete.success"));
      setGiftToDeleteId(null);
    } catch {
      setError(t("giftDelete.error"));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-warm-500">{t("common.loading")}</p>;
  }

  if (error || !wishlist) {
    return (
      <EmptyState
        title={t("wishlist.notFoundTitle")}
        body={t("wishlist.notFoundBody")}
        branded
      />
    );
  }

  const summary = buildWishlistSummary(wishlist, locale, t);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[36px] bg-porcelain shadow-soft ring-1 ring-warm-100">
        <img
          src={wishlist.cover_image_url || fallbackCover}
          alt=""
          className="h-64 w-full object-cover"
        />
        <div className="grid gap-5 p-5">
          <div>
            <p className="text-sm font-semibold text-coral">
              {summary.occasionLabel} · {summary.dateLabel}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-warm-900">{wishlist.title}</h1>
            <p className="mt-3 rounded-[24px] bg-blush/55 p-4 text-sm leading-6 text-warm-700">
              {wishlist.message || t("wishlist.message")}
            </p>
            {shareMessage ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} aria-hidden="true" />
                {shareMessage}
              </p>
            ) : null}
            {deleteMessage ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} aria-hidden="true" />
                {deleteMessage}
              </p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <ShareButton onClick={() => void handleShare()} />
            <Link to={`/gift/new?wishlistId=${wishlist.id}`} className="contents">
              <SecondaryButton>
                <Plus size={17} aria-hidden="true" />
                {t("actions.addGift")}
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-warm-900">{t("wishlist.giftIdeas")}</h2>
          <p className="text-sm font-medium text-warm-500">
            {wishlist.gifts.length} {t("wishlist.items")}
          </p>
        </div>
        {wishlist.gifts.length ? (
          wishlist.gifts.map((gift: GiftRecord) => {
            const cardGift: GiftCardModel = {
              id: gift.id,
              name: gift.name,
              store: storeLabel(gift.store_url),
              priceLabel: formatGiftPrice(
                gift.estimated_price,
                locale,
                gift.currency,
                t("giftForm.estimated"),
              ),
              priority: mapGiftPriority(gift.priority),
              status: mapGiftStatus(gift.status),
              image: gift.image_url || fallbackCover,
              note: gift.description || undefined,
              groupGift: gift.purchase_type === "collective",
              storeUrl: gift.store_url,
              purchaseType: gift.purchase_type,
              funding:
                gift.purchase_type === "collective"
                  ? {
                      ...buildFundingSummary(gift, locale),
                      isFunded: gift.funding_status === "funded",
                    }
                  : undefined,
            };

            return (
              <GiftCard
                key={gift.id}
                gift={cardGift}
                ownerAction={
                  <>
                    {gift.status === "reserved" ? (
                      <SecondaryButton onClick={() => void handleMarkPurchased(gift.id)}>
                        {t("actions.markPurchased")}
                      </SecondaryButton>
                    ) : null}
                    <SecondaryButton onClick={() => setGiftToDeleteId(gift.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                      {t("actions.deleteGift")}
                    </SecondaryButton>
                  </>
                }
              />
            );
          })
        ) : (
          <EmptyState title={t("wishlist.emptyTitle")} body={t("wishlist.emptyBody")} />
        )}
      </section>

      <Modal
        title={t("giftDelete.title")}
        open={Boolean(giftToDelete)}
        onClose={() => {
          if (!deleteLoading) {
            setGiftToDeleteId(null);
          }
        }}
      >
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-warm-500">{t("giftDelete.body")}</p>
          {giftToDelete ? (
            <div className="rounded-[24px] bg-warm-50/70 p-4 text-sm text-warm-700">
              <p className="font-semibold text-warm-900">{giftToDelete.name}</p>
              <p className="mt-1">{storeLabel(giftToDelete.store_url)}</p>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryButton onClick={() => setGiftToDeleteId(null)} disabled={deleteLoading}>
              {t("actions.cancel")}
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void handleDeleteGift()}
              disabled={deleteLoading}
              className="border-terracotta/20 text-terracotta hover:border-terracotta hover:text-terracotta"
            >
              <Trash2 size={16} aria-hidden="true" />
              {deleteLoading ? t("common.loading") : t("actions.deleteGift")}
            </SecondaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
