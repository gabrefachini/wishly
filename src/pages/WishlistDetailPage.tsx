import { CheckCircle2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { GiftCard, type GiftCardModel } from "../components/GiftCard";
import { SecondaryButton, ShareButton } from "../components/Buttons";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/States";
import { buildFundingSummary, buildWishlistSummary, formatGiftPrice, mapGiftPriority, mapGiftStatus } from "../lib/presenters";
import { useTranslation } from "../i18n/useTranslation";
import { updateGiftSchema, updateWishlistSchema } from "../lib/validation";
import { uploadWishlistCover } from "../services/storage";
import { deleteGift, getMyWishlist, updateGift, updateGiftStatus, updateWishlist } from "../services/wishlists";
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
  const { session } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistWithGifts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [giftToDeleteId, setGiftToDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [wishlistEditOpen, setWishlistEditOpen] = useState(false);
  const [wishlistEditLoading, setWishlistEditLoading] = useState(false);
  const [wishlistCoverUploading, setWishlistCoverUploading] = useState(false);
  const [wishlistEditErrors, setWishlistEditErrors] = useState<Record<string, string | undefined>>({});
  const [wishlistValues, setWishlistValues] = useState({
    title: "",
    occasion: "birthday",
    event_date: "",
    message: "",
    cover_image_url: "",
    visibility: "public_link" as "private" | "public_link",
  });
  const [giftEditLoading, setGiftEditLoading] = useState(false);
  const [giftEditErrors, setGiftEditErrors] = useState<Record<string, string | undefined>>({});
  const [giftToEditId, setGiftToEditId] = useState<string | null>(null);
  const [giftValues, setGiftValues] = useState({
    name: "",
    store_url: "",
    estimated_price: "",
    currency: "USD",
    priority: "must_have" as "must_have" | "nice_to_have" | "surprise_me",
    purchase_type: "individual" as "individual" | "collective",
    funding_goal_amount: "",
    image_url: "",
    description: "",
  });

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    getMyWishlist(id)
      .then((data) => {
        if (active) {
          setWishlist(data);
          if (data) {
            setWishlistValues({
              title: data.title,
              occasion: data.occasion,
              event_date: data.event_date || "",
              message: data.message || "",
              cover_image_url: data.cover_image_url || "",
              visibility: data.visibility,
            });
          }
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

  function openWishlistEditor() {
    if (!wishlist) return;
    setWishlistEditErrors({});
    setWishlistValues({
      title: wishlist.title,
      occasion: wishlist.occasion,
      event_date: wishlist.event_date || "",
      message: wishlist.message || "",
      cover_image_url: wishlist.cover_image_url || "",
      visibility: wishlist.visibility,
    });
    setWishlistEditOpen(true);
  }

  async function handleWishlistCoverUpload(file: File | null) {
    if (!file || !wishlist || !session?.user) return;
    setWishlistCoverUploading(true);
    setWishlistEditErrors((current) => ({ ...current, cover_image_url: undefined }));
    try {
      const uploadedUrl = await uploadWishlistCover(file, session.user.id);
      setWishlistValues((current) => ({ ...current, cover_image_url: uploadedUrl }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setWishlistEditErrors((current) => ({
        ...current,
        cover_image_url:
          message === "invalid_image_type"
            ? t("create.errors.coverFileType")
            : message === "image_too_large"
              ? t("create.errors.coverFileSize")
              : t("wishlist.editCoverError"),
      }));
    } finally {
      setWishlistCoverUploading(false);
    }
  }

  async function handleWishlistSave() {
    if (!wishlist) return;
    setError(null);
    setEditMessage(null);
    const parsed = updateWishlistSchema.safeParse(wishlistValues);
    if (!parsed.success) {
      setWishlistEditErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
      );
      return;
    }

    setWishlistEditErrors({});
    setWishlistEditLoading(true);
    try {
      await updateWishlist({
        id: wishlist.id,
        ...parsed.data,
      });
      const refreshed = await getMyWishlist(wishlist.id);
      setWishlist(refreshed);
      setWishlistEditOpen(false);
      setEditMessage(t("wishlist.updated"));
    } catch {
      setError(t("wishlist.updateError"));
    } finally {
      setWishlistEditLoading(false);
    }
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

  const giftToEdit = useMemo(
    () => wishlist?.gifts.find((gift) => gift.id === giftToEditId) ?? null,
    [giftToEditId, wishlist],
  );

  function openGiftEditor(gift: GiftRecord) {
    setGiftEditErrors({});
    setGiftValues({
      name: gift.name,
      store_url: gift.store_url || "",
      estimated_price: gift.estimated_price?.toString() || "",
      currency: gift.currency,
      priority: gift.priority,
      purchase_type: gift.purchase_type,
      funding_goal_amount: gift.funding_goal_amount?.toString() || "",
      image_url: gift.image_url || "",
      description: gift.description || "",
    });
    setGiftToEditId(gift.id);
  }

  async function handleGiftSave() {
    if (!giftToEditId || !wishlist) return;
    setError(null);
    setEditMessage(null);
    const parsed = updateGiftSchema.safeParse(giftValues);
    if (!parsed.success) {
      setGiftEditErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
      );
      return;
    }

    setGiftEditErrors({});
    setGiftEditLoading(true);
    try {
      await updateGift({
        id: giftToEditId,
        name: parsed.data.name,
        description: parsed.data.description,
        store_url: parsed.data.store_url,
        image_url: parsed.data.image_url,
        estimated_price: parsed.data.estimated_price ? Number(parsed.data.estimated_price) : undefined,
        currency: parsed.data.currency,
        priority: parsed.data.priority,
        purchase_type: parsed.data.purchase_type,
        funding_goal_amount:
          parsed.data.purchase_type === "collective" && parsed.data.funding_goal_amount
            ? Number(parsed.data.funding_goal_amount)
            : undefined,
      });
      const refreshed = await getMyWishlist(wishlist.id);
      setWishlist(refreshed);
      setGiftToEditId(null);
      setEditMessage(t("wishlist.giftUpdated"));
    } catch {
      setError(t("wishlist.giftUpdateError"));
    } finally {
      setGiftEditLoading(false);
    }
  }

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
  const isPrivateWishlist = wishlist.visibility === "private";

  async function handleGiftStatusChange(giftId: string, status: "available" | "purchased") {
    if (!wishlist) return;
    const currentWishlistId = wishlist.id;
    setError(null);
    setEditMessage(null);
    try {
      await updateGiftStatus(giftId, status);
      const refreshed = await getMyWishlist(currentWishlistId);
      setWishlist(refreshed);
      setEditMessage(
        status === "purchased" ? t("wishlist.privateGiftPurchased") : t("wishlist.privateGiftAvailable"),
      );
    } catch {
      setError(t("wishlist.giftUpdateError"));
    }
  }

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
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-warm-100 px-3 py-1 text-xs font-semibold text-warm-700">
                {summary.visibilityLabel}
              </span>
              <span className="rounded-full bg-warm-100 px-3 py-1 text-xs font-semibold text-warm-700">
                {summary.giftCountLabel}
              </span>
              {!isPrivateWishlist ? (
                <span className="rounded-full bg-warm-100 px-3 py-1 text-xs font-semibold text-warm-700">
                  {summary.reservedCountLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-3 rounded-[24px] bg-blush/55 p-4 text-sm leading-6 text-warm-700">
              {wishlist.message || t("wishlist.message")}
            </p>
            {isPrivateWishlist ? (
              <p className="mt-3 text-sm leading-6 text-warm-600">{t("wishlist.privateOwnerHint")}</p>
            ) : null}
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
            {editMessage ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} aria-hidden="true" />
                {editMessage}
              </p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
          </div>
          <div className={`grid gap-3 ${isPrivateWishlist ? "sm:grid-cols-[auto_auto]" : "sm:grid-cols-[1fr_auto_auto]"}`}>
            {!isPrivateWishlist ? <ShareButton onClick={() => void handleShare()} /> : null}
            <SecondaryButton onClick={openWishlistEditor}>
              <Pencil size={17} aria-hidden="true" />
              {t("wishlist.editDetails")}
            </SecondaryButton>
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
                suppressOwnerStatusNote={isPrivateWishlist}
                ownerAction={
                  <>
                    {isPrivateWishlist && gift.status !== "purchased" ? (
                      <SecondaryButton onClick={() => void handleGiftStatusChange(gift.id, "purchased")}>
                        {t("actions.markPurchased")}
                      </SecondaryButton>
                    ) : null}
                    {isPrivateWishlist && gift.status === "purchased" ? (
                      <SecondaryButton onClick={() => void handleGiftStatusChange(gift.id, "available")}>
                        {t("actions.markAvailable")}
                      </SecondaryButton>
                    ) : null}
                    {!isPrivateWishlist && gift.status === "reserved" ? (
                      <SecondaryButton onClick={() => void handleMarkPurchased(gift.id)}>
                        {t("actions.markPurchased")}
                      </SecondaryButton>
                    ) : null}
                    <SecondaryButton onClick={() => openGiftEditor(gift)}>
                      <Pencil size={16} aria-hidden="true" />
                      {t("wishlist.editGift")}
                    </SecondaryButton>
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
        title={t("wishlist.editDetails")}
        open={wishlistEditOpen}
        onClose={() => {
          if (!wishlistEditLoading && !wishlistCoverUploading) {
            setWishlistEditOpen(false);
          }
        }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("create.wishlistName")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.title}
              onChange={(event) => setWishlistValues((current) => ({ ...current, title: event.target.value }))}
            />
            {wishlistEditErrors.title ? <span className="text-xs text-terracotta">{wishlistEditErrors.title}</span> : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("create.occasion")}</span>
              <select
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={wishlistValues.occasion}
                onChange={(event) => setWishlistValues((current) => ({ ...current, occasion: event.target.value }))}
              >
                <option value="birthday">{t("occasions.birthday")}</option>
                <option value="babyShower">{t("occasions.babyShower")}</option>
                <option value="wedding">{t("occasions.wedding")}</option>
                <option value="christmas">{t("occasions.christmas")}</option>
                <option value="newHome">{t("occasions.newHome")}</option>
                <option value="secretSanta">{t("occasions.secretSanta")}</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("create.eventDate")}</span>
              <input
                type="date"
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={wishlistValues.event_date}
                onChange={(event) => setWishlistValues((current) => ({ ...current, event_date: event.target.value }))}
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("create.message")}</span>
            <textarea
              className="min-h-28 rounded-2xl border border-warm-100 bg-porcelain px-4 py-3 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.message}
              onChange={(event) => setWishlistValues((current) => ({ ...current, message: event.target.value }))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("actions.chooseCover")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.cover_image_url}
              onChange={(event) => setWishlistValues((current) => ({ ...current, cover_image_url: event.target.value }))}
            />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-warm-100 bg-porcelain px-5 py-3 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta">
              <Upload size={17} aria-hidden="true" />
              {wishlistCoverUploading ? t("create.coverUploading") : t("create.coverUploadAction")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleWishlistCoverUpload(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {wishlistEditErrors.cover_image_url ? <span className="text-xs text-terracotta">{wishlistEditErrors.cover_image_url}</span> : null}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("create.visibility")}</span>
            <select
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.visibility}
              onChange={(event) => setWishlistValues((current) => ({ ...current, visibility: event.target.value as "private" | "public_link" }))}
            >
              <option value="public_link">{t("common.publicLink")}</option>
              <option value="private">{t("common.private")}</option>
            </select>
            <span className="text-xs leading-6 text-warm-500">
              {wishlistValues.visibility === "private"
                ? t("create.visibilityPrivateHint")
                : t("create.visibilityPublicHint")}
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryButton onClick={() => setWishlistEditOpen(false)} disabled={wishlistEditLoading || wishlistCoverUploading}>
              {t("actions.cancel")}
            </SecondaryButton>
            <SecondaryButton onClick={() => void handleWishlistSave()} disabled={wishlistEditLoading || wishlistCoverUploading}>
              <Pencil size={16} aria-hidden="true" />
              {wishlistEditLoading ? t("common.loading") : t("wishlist.saveDetails")}
            </SecondaryButton>
          </div>
        </div>
      </Modal>

      <Modal
        title={t("wishlist.editGift")}
        open={Boolean(giftToEdit)}
        onClose={() => {
          if (!giftEditLoading) {
            setGiftToEditId(null);
          }
        }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("giftForm.giftName")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={giftValues.name}
              onChange={(event) => setGiftValues((current) => ({ ...current, name: event.target.value }))}
            />
            {giftEditErrors.name ? <span className="text-xs text-terracotta">{giftEditErrors.name}</span> : null}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("giftForm.storeLink")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={giftValues.store_url}
              onChange={(event) => setGiftValues((current) => ({ ...current, store_url: event.target.value }))}
            />
            {giftEditErrors.store_url ? <span className="text-xs text-terracotta">{giftEditErrors.store_url}</span> : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("giftForm.estimatedPrice")}</span>
              <input
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={giftValues.estimated_price}
                onChange={(event) => setGiftValues((current) => ({ ...current, estimated_price: event.target.value }))}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("common.currency")}</span>
              <select
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={giftValues.currency}
                onChange={(event) => setGiftValues((current) => ({ ...current, currency: event.target.value }))}
              >
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("giftForm.priority")}</span>
              <select
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={giftValues.priority}
                onChange={(event) => setGiftValues((current) => ({ ...current, priority: event.target.value as typeof current.priority }))}
              >
                <option value="must_have">{t("priority.mustHave")}</option>
                <option value="nice_to_have">{t("priority.niceToHave")}</option>
                <option value="surprise_me">{t("priority.surpriseMe")}</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("giftForm.purchaseType")}</span>
              <select
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={giftValues.purchase_type}
                onChange={(event) => setGiftValues((current) => ({ ...current, purchase_type: event.target.value as typeof current.purchase_type }))}
              >
                <option value="individual">{t("giftForm.individualGift")}</option>
                <option value="collective">{t("giftFunding.groupGift")}</option>
              </select>
            </label>
          </div>
          {giftValues.purchase_type === "collective" ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("giftFunding.goal")}</span>
              <input
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                value={giftValues.funding_goal_amount}
                onChange={(event) => setGiftValues((current) => ({ ...current, funding_goal_amount: event.target.value }))}
              />
              {giftEditErrors.funding_goal_amount ? <span className="text-xs text-terracotta">{giftEditErrors.funding_goal_amount}</span> : null}
            </label>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("giftForm.productImage")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={giftValues.image_url}
              onChange={(event) => setGiftValues((current) => ({ ...current, image_url: event.target.value }))}
            />
            {giftEditErrors.image_url ? <span className="text-xs text-terracotta">{giftEditErrors.image_url}</span> : null}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("giftForm.optionalNote")}</span>
            <textarea
              className="min-h-28 rounded-2xl border border-warm-100 bg-porcelain px-4 py-3 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={giftValues.description}
              onChange={(event) => setGiftValues((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryButton onClick={() => setGiftToEditId(null)} disabled={giftEditLoading}>
              {t("actions.cancel")}
            </SecondaryButton>
            <SecondaryButton onClick={() => void handleGiftSave()} disabled={giftEditLoading}>
              <Pencil size={16} aria-hidden="true" />
              {giftEditLoading ? t("common.loading") : t("wishlist.saveGift")}
            </SecondaryButton>
          </div>
        </div>
      </Modal>

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
