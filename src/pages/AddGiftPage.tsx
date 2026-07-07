import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { AddGiftForm } from "../components/Forms";
import { EmptyState } from "../components/States";
import { SetupNotice } from "../components/SetupNotice";
import { LoadingState } from "../components/LoadingState";
import { hasSupabaseEnv, isDemoMode } from "../lib/env";
import { normalizeMonetaryInput } from "../lib/money";
import { normalizeProductUrl } from "../lib/productPreview";
import { giftSchema } from "../lib/validation";
import { useTranslation } from "../i18n/useTranslation";
import { fetchProductPreview } from "../services/productPreview";
import { createGift, listMyWishlists } from "../services/wishlists";
import type { WishlistWithGifts } from "../types/domain";

export function AddGiftPage() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loadingWishlists, setLoadingWishlists] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [productLookupState, setProductLookupState] = useState<"idle" | "loading" | "success" | "fallback">("idle");
  const [productLookupMessage, setProductLookupMessage] = useState<string | null>(null);
  const [values, setValues] = useState<{
    wishlist_id: string;
    name: string;
    store_url: string;
    estimated_price: string;
    currency: string;
    priority: "must_have" | "nice_to_have" | "surprise_me";
    purchase_type: "individual" | "collective";
    funding_goal_amount: string;
    image_url: string;
    description: string;
    price_tracking_enabled: boolean;
    current_price: string;
    target_price: string;
    price_radar_priority: "must_buy" | "maybe_buy" | "sale_only" | "future_gift";
    price_alert_preferences: Array<
      "any_drop" | "drop_5" | "drop_10" | "below_target" | "back_to_low" | "weekly_summary" | "relevant_only"
    >;
  }>({
    wishlist_id: "",
    name: "",
    store_url: "",
    estimated_price: "",
    currency: "BRL",
    priority: "must_have",
    purchase_type: "individual",
    funding_goal_amount: "",
    image_url: "",
    description: "",
    price_tracking_enabled: false,
    current_price: "",
    target_price: "",
    price_radar_priority: "must_buy",
    price_alert_preferences: [],
  });
  const lastPreviewedUrlRef = useRef<string | null>(null);
  const lookupRunIdRef = useRef(0);
  const fieldTouchedRef = useRef({
    name: false,
    estimated_price: false,
    image_url: false,
  });

  useEffect(() => {
    let active = true;
    if (authLoading) {
      return () => {
        active = false;
      };
    }

    setLoadingWishlists(true);
    setWishlists([]);

    listMyWishlists()
      .then((data) => {
        if (!active) return;
        setWishlists(data);
        const preferredId = searchParams.get("wishlistId") || data[0]?.id || "";
        setValues((current) => ({
          ...current,
          wishlist_id: preferredId,
          name: searchParams.get("name") || current.name,
          store_url: searchParams.get("storeUrl") || current.store_url,
          estimated_price: searchParams.get("estimatedPrice") || current.estimated_price,
          image_url: searchParams.get("imageUrl") || current.image_url,
          description: searchParams.get("description") || current.description,
        }));
      })
      .finally(() => {
        if (active) {
          setLoadingWishlists(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, searchParams, session?.user?.id]);

  useEffect(() => {
    const normalizedUrl = normalizeProductUrl(values.store_url);

    if (!normalizedUrl) {
      lastPreviewedUrlRef.current = null;
      setProductLookupState("idle");
      setProductLookupMessage(null);
      return;
    }

    if (normalizedUrl === lastPreviewedUrlRef.current) {
      return;
    }

    const runId = ++lookupRunIdRef.current;
    const controller = new AbortController();
    lastPreviewedUrlRef.current = normalizedUrl;
    const timeoutId = window.setTimeout(() => {
      setProductLookupState("loading");
      setProductLookupMessage(null);

      void fetchProductPreview(normalizedUrl, controller.signal)
        .then((preview) => {
          if (runId !== lookupRunIdRef.current) {
            return;
          }

          setValues((current) => ({
            ...current,
            store_url: preview.sourceUrl,
            name: fieldTouchedRef.current.name ? current.name : preview.title || current.name,
            estimated_price:
              !fieldTouchedRef.current.estimated_price && preview.price !== null
                ? preview.price.toFixed(2)
                : current.estimated_price,
            image_url:
              !fieldTouchedRef.current.image_url && preview.imageUrl ? preview.imageUrl : current.image_url,
            currency: "BRL",
          }));
          setProductLookupState("success");
          setProductLookupMessage(
            preview.storeName
              ? t("giftPreview.successWithStore", { store: preview.storeName })
              : t("giftPreview.success"),
          );
        })
        .catch((error) => {
          if (controller.signal.aborted || runId !== lookupRunIdRef.current) {
            return;
          }

          const message = error instanceof Error ? error.message : "";
          setProductLookupState("fallback");
          setProductLookupMessage(
            message === "invalid_product_url" || message === "product_preview_unavailable"
              ? t("giftPreview.fallback")
              : t("giftPreview.fallback"),
          );
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [t, values.store_url]);

  if (!hasSupabaseEnv && !isDemoMode) {
    return <SetupNotice />;
  }

  const selectedWishlist = wishlists.find((wishlist) => wishlist.id === values.wishlist_id);
  const selectedTrackedGiftCount = selectedWishlist?.gifts.filter((gift) => gift.price_tracking_enabled).length ?? 0;
  const priceTrackingAllowed = Boolean(selectedWishlist?.type === "wishlist" && selectedWishlist?.is_price_radar_enabled) && selectedTrackedGiftCount < 2;

  async function handleSubmit() {
    setSubmitError(null);
    const normalizedValues = {
      ...values,
      estimated_price: normalizeMonetaryInput(values.estimated_price),
      funding_goal_amount: normalizeMonetaryInput(values.funding_goal_amount),
      current_price: normalizeMonetaryInput(values.current_price),
      target_price: normalizeMonetaryInput(values.target_price),
    };
    const parsed = giftSchema.safeParse(normalizedValues);
    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
        await createGift({
        wishlist_id: normalizedValues.wishlist_id,
        name: normalizedValues.name,
        description: normalizedValues.description,
        store_url: normalizedValues.store_url,
        image_url: normalizedValues.image_url,
        estimated_price: normalizedValues.estimated_price ? Number(normalizedValues.estimated_price) : undefined,
        currency: normalizedValues.currency,
        priority: normalizedValues.priority,
        purchase_type: normalizedValues.purchase_type,
        funding_goal_amount:
          normalizedValues.purchase_type === "collective" && normalizedValues.funding_goal_amount
            ? Number(normalizedValues.funding_goal_amount)
            : undefined,
        funding_currency: normalizedValues.currency,
        price_tracking_enabled: normalizedValues.price_tracking_enabled,
        current_price: normalizedValues.current_price ? Number(normalizedValues.current_price) : undefined,
        target_price: normalizedValues.target_price ? Number(normalizedValues.target_price) : undefined,
        price_radar_priority: normalizedValues.price_radar_priority,
        price_alert_preferences: normalizedValues.price_alert_preferences,
      });
      navigate(`/lists/${normalizedValues.wishlist_id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (loadingWishlists) {
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

  if (wishlists.length === 0) {
    return (
      <EmptyState
        title={t("home.emptyTitle")}
        body={t("home.emptyBody")}
        action={t("actions.createWishlist")}
        onAction={() => navigate("/create")}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold text-primary">{t("giftForm.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("giftForm.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-warm-500">{t("giftForm.bodySmart")}</p>
      </header>
      <section className="rounded-modal bg-surface p-5 shadow-card ring-1 ring-border">
        {submitError ? <p className="mb-4 text-sm text-primary-strong">{submitError}</p> : null}
        <AddGiftForm
          values={values}
          wishlistOptions={wishlists.map((wishlist) => ({
            id: wishlist.id,
            title: wishlist.title,
            type: wishlist.type,
            is_price_radar_enabled: wishlist.is_price_radar_enabled,
          }))}
          errors={errors}
          productLookupState={productLookupState}
          productLookupMessage={productLookupMessage}
          loading={loading}
          t={t}
          onChange={(name, value) =>
            setValues((current) => {
              if (name === "name") {
                fieldTouchedRef.current.name = true;
              }

              if (name === "estimated_price") {
                fieldTouchedRef.current.estimated_price = true;
              }

              if (name === "image_url") {
                fieldTouchedRef.current.image_url = true;
              }

              if (name === "price_alert_preferences" && Array.isArray(value)) {
                return { ...current, price_alert_preferences: value as typeof current.price_alert_preferences };
              }

              if (name === "price_tracking_enabled") {
                return { ...current, price_tracking_enabled: Boolean(value) };
              }

              return { ...current, [name]: value };
            })
          }
          onSubmit={() => void handleSubmit()}
          priceTrackingAllowed={priceTrackingAllowed}
        />
      </section>
    </div>
  );
}
