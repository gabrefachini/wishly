import { CheckCircle2, Pencil, Plus, Radar, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { GiftCard, type GiftCardModel } from "../components/GiftCard";
import { SecondaryButton, ShareButton } from "../components/Buttons";
import { CardMenu } from "../components/CardMenu";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/States";
import { LoadingState } from "../components/LoadingState";
import { BentoCard, PremiumPageShell, SectionHeader } from "../components/PremiumLayout";
import { WishlistThemeSection } from "../components/WishlistThemeSection";
import { PriceRadarFields } from "../components/Forms";
import { PriceRadarBoard } from "../components/PriceRadarBoard";
import { buildFundingSummary, buildWishlistSummary, formatGiftPrice, mapGiftPriority, mapGiftStatus } from "../lib/presenters";
import { getPriceRecommendation } from "../lib/priceRadar";
import { useTranslation } from "../i18n/useTranslation";
import { normalizeMonetaryInput } from "../lib/money";
import { updateGiftSchema, updateWishlistSchema } from "../lib/validation";
import { WISHLIST_THEME_PRESETS } from "../lib/wishlistAppearance";
import { uploadWishlistCover } from "../services/storage";
import { deleteGift, getMyWishlist, updateGift, updateGiftRadarSettings, updateGiftStatus, updateWishlist } from "../services/wishlists";
import type { GiftRecord, WishlistThemePreset, WishlistWithGifts } from "../types/domain";

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
  const [wishlistValues, setWishlistValues] = useState<{
    title: string;
    type: "event" | "wishlist";
    occasion: string;
    event_date: string;
    message: string;
    cover_image_url: string;
    visibility: "private" | "public_link";
    theme_preset: WishlistThemePreset;
    theme_primary_color: string;
    theme_secondary_color: string;
    use_custom_theme: boolean;
    is_price_radar_enabled: boolean;
  }>({
    title: "",
    type: "event",
    occasion: "birthday",
    event_date: "",
    message: "",
    cover_image_url: "",
    visibility: "public_link" as "private" | "public_link",
    theme_preset: "default" as const,
    theme_primary_color: WISHLIST_THEME_PRESETS.default.primary,
    theme_secondary_color: WISHLIST_THEME_PRESETS.default.secondary,
    use_custom_theme: false,
    is_price_radar_enabled: false,
  });
  const [giftEditLoading, setGiftEditLoading] = useState(false);
  const [giftEditErrors, setGiftEditErrors] = useState<Record<string, string | undefined>>({});
  const [giftToEditId, setGiftToEditId] = useState<string | null>(null);
  const [giftValues, setGiftValues] = useState({
    name: "",
    store_url: "",
    estimated_price: "",
    currency: "BRL",
    priority: "must_have" as "must_have" | "nice_to_have" | "surprise_me",
    purchase_type: "individual" as "individual" | "collective",
    funding_goal_amount: "",
    image_url: "",
    description: "",
    price_tracking_enabled: false,
    current_price: "",
    target_price: "",
    price_radar_priority: "must_buy" as "must_buy" | "maybe_buy" | "sale_only" | "future_gift",
    price_alert_preferences: [] as Array<
      "any_drop" | "drop_5" | "drop_10" | "below_target" | "back_to_low" | "weekly_summary" | "relevant_only"
    >,
  });
  const wishlistCoverFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    getMyWishlist(id)
      .then((data) => {
        if (active) {
          setWishlist(data);
          if (data) {
            const presetKey = data.theme_preset || "default";
            setWishlistValues({
              title: data.title,
              type: data.type || "event",
              occasion: data.occasion,
              event_date: data.event_date || "",
              message: data.message || "",
              cover_image_url: data.cover_image_url || "",
              visibility: data.visibility,
              theme_preset: presetKey,
              theme_primary_color: data.theme_primary_color || WISHLIST_THEME_PRESETS[presetKey].primary,
              theme_secondary_color: data.theme_secondary_color || WISHLIST_THEME_PRESETS[presetKey].secondary,
              use_custom_theme: data.use_custom_theme ?? false,
              is_price_radar_enabled: data.is_price_radar_enabled ?? false,
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
    const presetKey = wishlist.theme_preset || "default";
    setWishlistEditErrors({});
    setWishlistValues({
      title: wishlist.title,
      type: wishlist.type || "event",
      occasion: wishlist.occasion,
      event_date: wishlist.event_date || "",
      message: wishlist.message || "",
      cover_image_url: wishlist.cover_image_url || "",
      visibility: wishlist.visibility,
      theme_preset: presetKey,
      theme_primary_color: wishlist.theme_primary_color || WISHLIST_THEME_PRESETS[presetKey].primary,
      theme_secondary_color: wishlist.theme_secondary_color || WISHLIST_THEME_PRESETS[presetKey].secondary,
      use_custom_theme: wishlist.use_custom_theme ?? false,
      is_price_radar_enabled: wishlist.is_price_radar_enabled ?? false,
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
              : message === "storage_bucket_not_found"
                ? t("create.errors.coverBucket")
                : message === "storage_permission_denied"
                  ? t("create.errors.coverPermission")
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
      price_tracking_enabled: gift.price_tracking_enabled ?? false,
      current_price: gift.current_price?.toString() || "",
      target_price: gift.target_price?.toString() || "",
      price_radar_priority: gift.price_radar_priority || "must_buy",
      price_alert_preferences: gift.price_alert_preferences ?? [],
    });
    setGiftToEditId(gift.id);
  }

  async function handleGiftSave() {
    if (!giftToEditId || !wishlist) return;
    setError(null);
    setEditMessage(null);
    const normalizedGiftValues = {
      ...giftValues,
      estimated_price: normalizeMonetaryInput(giftValues.estimated_price),
      funding_goal_amount: normalizeMonetaryInput(giftValues.funding_goal_amount),
      current_price: normalizeMonetaryInput(giftValues.current_price),
      target_price: normalizeMonetaryInput(giftValues.target_price),
    };
    const parsed = updateGiftSchema.safeParse(normalizedGiftValues);
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
        price_tracking_enabled: parsed.data.price_tracking_enabled,
        current_price: parsed.data.current_price ? Number(parsed.data.current_price) : undefined,
        target_price: parsed.data.target_price ? Number(parsed.data.target_price) : undefined,
        price_radar_priority: parsed.data.price_radar_priority,
        price_alert_preferences: parsed.data.price_alert_preferences,
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
    return (
      <LoadingState
        title={t("common.loadingTitle")}
        body={t("common.loadingBody")}
        timeoutTitle={t("common.loadingTimeoutTitle")}
        timeoutBody={t("common.loadingTimeoutBody")}
        retryLabel={t("common.retry")}
        redirectTo="/lists"
        redirectLabel={t("nav.lists")}
        onRetry={() => window.location.reload()}
      />
    );
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
  const isPersonalWishlist = wishlist.type === "wishlist";
  const canUseRadar = isPersonalWishlist && wishlist.is_price_radar_enabled;
  const trackedGifts = wishlist.gifts.filter((gift) => gift.price_tracking_enabled);
  const radarOpportunities = trackedGifts.filter((gift) => {
    const recommendation = getPriceRecommendation(
      {
        currentPrice: gift.current_price ?? gift.estimated_price ?? null,
        averagePrice: gift.average_price,
        lowestPrice: gift.lowest_price,
        highestPrice: gift.highest_price,
        lastPrice: gift.original_price ?? gift.current_price ?? null,
        priceHistory: gift.price_history,
        targetPrice: gift.target_price,
        currency: gift.currency,
      },
      locale,
    );

    return recommendation.status === "buy_now" || recommendation.status === "good_price";
  });
  const potentialSavings = trackedGifts.reduce((total, gift) => {
    const current = gift.current_price ?? gift.estimated_price ?? 0;
    const target = gift.target_price ?? gift.lowest_price ?? gift.average_price ?? current;
    return total + Math.max(current - target, 0);
  }, 0);
  const dashboardMetrics = [
    { label: summary.giftCountLabel, value: String(wishlist.gifts.length) },
    { label: summary.reservedCountLabel, value: String(wishlist.gifts.filter((gift) => gift.status === "reserved").length) },
    { label: t("wishlist.visibility"), value: summary.visibilityLabel },
  ];

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

  async function handleToggleGiftRadar(gift: GiftRecord, enabled: boolean) {
    if (!wishlist || !canUseRadar) {
      return;
    }

    setError(null);
    try {
      await updateGiftRadarSettings(gift.id, {
        price_tracking_enabled: enabled,
        current_price: gift.current_price ?? gift.estimated_price,
        target_price: gift.target_price,
        price_radar_priority: gift.price_radar_priority || "must_buy",
        price_alert_preferences: gift.price_alert_preferences ?? [],
      });
      const refreshed = await getMyWishlist(wishlist.id);
      setWishlist(refreshed);
    } catch {
      setError(t("priceRadar.updateError"));
    }
  }

  return (
    <PremiumPageShell className="grid gap-6 xl:grid-cols-[minmax(0,1.38fr)_minmax(340px,0.62fr)] xl:items-start">
      <div className="grid gap-6">
      <section className="overflow-hidden rounded-[38px] bg-surface shadow-soft ring-1 ring-border">
        <img
          src={wishlist.cover_image_url || fallbackCover}
          alt=""
          className="h-64 w-full object-cover lg:h-72"
        />
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-coral">
              {summary.occasionLabel} · {summary.dateLabel}
            </p>
            <h1 className="mt-2 text-[clamp(2rem,4vw,3.3rem)] font-bold tracking-[-0.05em] text-warm-900">{wishlist.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-warm-700">
                {summary.visibilityLabel}
              </span>
              <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-warm-700">
                {summary.giftCountLabel}
              </span>
              {!isPrivateWishlist ? (
                <span className="rounded-full bg-blush px-3 py-1 text-xs font-semibold text-terracotta">
                  {summary.reservedCountLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-4 rounded-[28px] bg-surface-alt p-4 text-sm leading-7 text-warm-700">
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
            <div className="grid gap-3 rounded-[28px] bg-surface-alt p-4 ring-1 ring-border">
              {dashboardMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[22px] bg-surface p-4 ring-1 ring-border">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warm-500">{metric.label}</p>
                  <p className="mt-2 text-sm font-semibold text-warm-900">{metric.value}</p>
                </div>
              ))}
              <div className="rounded-[22px] bg-surface p-4 ring-1 ring-border">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">
                  {canUseRadar ? t("priceRadar.enabled") : t("priceRadar.disabled")}
                </p>
                <p className="mt-2 text-sm font-semibold text-warm-900">
                  {canUseRadar ? t("priceRadar.dashboardTitle") : t("priceRadar.paywallBody")}
                </p>
              </div>
            </div>
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

      {isPersonalWishlist ? (
        <PriceRadarBoard
          wishlist={wishlist}
          trackedGifts={trackedGifts}
          radarOpportunities={radarOpportunities}
          potentialSavings={potentialSavings}
          canUseRadar={canUseRadar}
          fallbackImageUrl={fallbackCover}
          locale={locale}
          t={t}
          onToggleGiftRadar={(gift, enabled) => void handleToggleGiftRadar(gift, enabled)}
          onOpenGiftEditor={openGiftEditor}
        />
      ) : null}

      <section className="grid gap-3">
        <SectionHeader
          title={t("wishlist.giftIdeas")}
          body={`${wishlist.gifts.length} ${t("wishlist.items")}`}
        />
        {wishlist.gifts.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
          {wishlist.gifts.map((gift: GiftRecord) => {
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
              <div key={gift.id} className="grid gap-3">
                <GiftCard
                  gift={cardGift}
                  suppressOwnerStatusNote={isPrivateWishlist}
                  onOpenDetails={() => openGiftEditor(gift)}
                  menu={
                    <CardMenu
                      ariaLabel={t("common.moreOptions")}
                      items={[
                        {
                          label: t("wishlist.editGift"),
                          onSelect: () => openGiftEditor(gift),
                        },
                        ...(isPrivateWishlist && gift.status !== "purchased"
                          ? [{
                              label: t("actions.markPurchased"),
                              onSelect: () => void handleGiftStatusChange(gift.id, "purchased"),
                            }]
                          : []),
                        ...(isPrivateWishlist && gift.status === "purchased"
                          ? [{
                              label: t("actions.markAvailable"),
                              onSelect: () => void handleGiftStatusChange(gift.id, "available"),
                            }]
                          : []),
                        ...(!isPrivateWishlist && gift.status === "reserved"
                          ? [{
                              label: t("actions.markPurchased"),
                              onSelect: () => void handleMarkPurchased(gift.id),
                            }]
                          : []),
                        ...(canUseRadar
                          ? gift.price_tracking_enabled
                            ? [
                                {
                                  label: t("priceRadar.setTarget"),
                                  onSelect: () => openGiftEditor(gift),
                                },
                                {
                                  label: t("priceRadar.disable"),
                                  onSelect: () => void handleToggleGiftRadar(gift, false),
                                },
                              ]
                            : [
                                {
                                  label: t("priceRadar.activate"),
                                  onSelect: () => void handleToggleGiftRadar(gift, true),
                                },
                              ]
                          : []),
                        {
                          label: t("actions.deleteGift"),
                          onSelect: () => setGiftToDeleteId(gift.id),
                          tone: "danger",
                        },
                      ]}
                    />
                  }
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
                    </>
                  }
                />
              </div>
            );
          })}
          </div>
        ) : (
          <EmptyState title={t("wishlist.emptyTitle")} body={t("wishlist.emptyBody")} />
        )}
      </section>
      </div>

      <aside className="grid gap-4 xl:sticky xl:top-6">
        <BentoCard tone="default" className="p-5">
          <p className="text-sm font-semibold text-coral">{t("wishlist.summaryTitle")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {dashboardMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[22px] bg-surface-alt p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warm-500">{metric.label}</p>
                <p className="mt-2 text-sm font-semibold text-warm-900">{metric.value}</p>
              </div>
            ))}
            <div className="rounded-[22px] bg-blush p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">
                {canUseRadar ? t("priceRadar.enabled") : t("priceRadar.disabled")}
              </p>
              <p className="mt-2 text-sm font-semibold text-warm-900">
                {canUseRadar ? t("priceRadar.dashboardTitle") : t("priceRadar.paywallBody")}
              </p>
            </div>
          </div>
          {isPrivateWishlist ? (
            <p className="mt-4 text-sm leading-6 text-warm-600">{t("wishlist.privateOwnerHint")}</p>
          ) : null}
        </BentoCard>
      </aside>

      <Modal
        title={t("wishlist.editDetails")}
        open={wishlistEditOpen}
        size="2xl"
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
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("create.listType")}</span>
            <select
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.type}
              onChange={(event) =>
                setWishlistValues((current) => {
                  const nextType = event.target.value === "wishlist" ? "wishlist" : "event";
                  return {
                    ...current,
                    type: nextType,
                    occasion: nextType === "wishlist" ? "wishlist" : current.occasion === "wishlist" ? "birthday" : current.occasion,
                    visibility: nextType === "wishlist" ? "private" : current.visibility,
                    is_price_radar_enabled: nextType === "wishlist" ? current.is_price_radar_enabled : false,
                  };
                })
              }
            >
              <option value="event">{t("wishlistType.event")}</option>
              <option value="wishlist">{t("wishlistType.wishlist")}</option>
            </select>
            <span className="text-xs leading-6 text-warm-500">{t("create.listTypeHint")}</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {wishlistValues.type === "event" ? (
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
            ) : (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-warm-700">{t("create.occasion")}</span>
                <div className="inline-flex min-h-12 items-center rounded-2xl border border-warm-100 bg-warm-50 px-4 text-base font-semibold text-warm-700">
                  {t("wishlistType.wishlist")}
                </div>
              </label>
            )}
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
          {wishlistValues.type === "wishlist" ? (
            <label className="grid gap-3 rounded-[28px] border border-warm-100 bg-warm-50/60 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blush text-terracotta">
                  <Radar size={18} aria-hidden="true" />
                </span>
                <div className="grid gap-1">
                  <span className="text-sm font-semibold text-warm-800">{t("create.radarTitle")}</span>
                  <span className="text-xs leading-6 text-warm-500">{t("create.radarHint")}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-warm-700">{t("create.radarToggle")}</span>
                <button
                  type="button"
                  aria-pressed={wishlistValues.is_price_radar_enabled}
                  onClick={() =>
                    setWishlistValues((current) => ({
                      ...current,
                      is_price_radar_enabled: !current.is_price_radar_enabled,
                    }))
                  }
                  className={`relative inline-flex h-10 w-[72px] items-center rounded-full border transition ${
                    wishlistValues.is_price_radar_enabled
                      ? "border-coral bg-coral/15"
                      : "border-warm-200 bg-white"
                  }`}
                >
                  <span
                    className={`inline-block h-8 w-8 rounded-full bg-white shadow-sm transition ${
                      wishlistValues.is_price_radar_enabled ? "translate-x-8 bg-coral" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs leading-6 text-warm-500">{t("create.radarToggleHint")}</p>
            </label>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("create.message")}</span>
            <textarea
              className="min-h-28 rounded-2xl border border-warm-100 bg-porcelain px-4 py-3 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.message}
              onChange={(event) => setWishlistValues((current) => ({ ...current, message: event.target.value }))}
            />
          </label>
          <div className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("actions.chooseCover")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={wishlistValues.cover_image_url}
              onChange={(event) => setWishlistValues((current) => ({ ...current, cover_image_url: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <button
                type="button"
                onClick={() => wishlistCoverFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-warm-100 bg-porcelain px-5 py-3 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta"
              >
                <Upload size={17} aria-hidden="true" />
                {wishlistCoverUploading ? t("create.coverUploading") : t("create.coverUploadAction")}
              </button>
              <input
                ref={wishlistCoverFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  void handleWishlistCoverUpload(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              <span className="text-xs leading-6 text-warm-500">{t("create.coverUploadHint")}</span>
            </div>
            {wishlistEditErrors.cover_image_url ? (
              <span className="text-xs text-terracotta">{wishlistEditErrors.cover_image_url}</span>
            ) : null}
          </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("create.visibility")}</span>
              {wishlistValues.type === "wishlist" ? (
                <>
                  <div className="inline-flex min-h-12 items-center rounded-2xl border border-warm-100 bg-warm-50 px-4 text-base font-semibold text-warm-700">
                    {t("common.private")}
                  </div>
                  <span className="text-xs leading-6 text-warm-500">{t("create.visibilityPrivateHint")}</span>
                </>
              ) : (
                <>
                  <select
                    className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
                    value={wishlistValues.visibility}
                    onChange={(event) =>
                      setWishlistValues((current) => ({ ...current, visibility: event.target.value as "private" | "public_link" }))
                    }
                  >
                    <option value="public_link">{t("common.publicLink")}</option>
                    <option value="private">{t("common.private")}</option>
                  </select>
                  <span className="text-xs leading-6 text-warm-500">
                    {wishlistValues.visibility === "private"
                      ? t("create.visibilityPrivateHint")
                      : t("create.visibilityPublicHint")}
                  </span>
                </>
              )}
            </label>
          <WishlistThemeSection
            values={{
              theme_preset: wishlistValues.theme_preset,
              theme_primary_color: wishlistValues.theme_primary_color,
              theme_secondary_color: wishlistValues.theme_secondary_color,
              use_custom_theme: wishlistValues.use_custom_theme,
            }}
            t={t}
            onChange={(name, value) =>
              setWishlistValues((current) => {
                if (name === "theme_preset") {
                  return { ...current, theme_preset: value as typeof current.theme_preset };
                }

                if (name === "use_custom_theme") {
                  return { ...current, use_custom_theme: Boolean(value) };
                }

                return { ...current, [name]: value };
              })
            }
            layout="split"
          />
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
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-warm-700">{t("giftForm.estimatedPrice")}</span>
            <input
              className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/15"
              value={giftValues.estimated_price}
              onChange={(event) => setGiftValues((current) => ({ ...current, estimated_price: event.target.value }))}
            />
          </label>
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
          {wishlistValues.type === "wishlist" ? (
              <PriceRadarFields
                enabled={giftValues.price_tracking_enabled}
                priceTrackingAllowed={
                trackedGifts.length < 2 ||
                giftValues.price_tracking_enabled
              }
              values={{
                price_tracking_enabled: giftValues.price_tracking_enabled,
                current_price: giftValues.current_price,
                target_price: giftValues.target_price,
                price_radar_priority: giftValues.price_radar_priority,
                price_alert_preferences: giftValues.price_alert_preferences,
              }}
              errors={giftEditErrors}
              t={t}
              onChange={(name, value) =>
                setGiftValues((current) => {
                  if (name === "price_tracking_enabled") {
                    return { ...current, price_tracking_enabled: Boolean(value) };
                  }
                  if (name === "price_alert_preferences" && Array.isArray(value)) {
                    return { ...current, price_alert_preferences: value as typeof current.price_alert_preferences };
                  }
                  return { ...current, [name]: value };
                })
              }
            />
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
    </PremiumPageShell>
  );
}
