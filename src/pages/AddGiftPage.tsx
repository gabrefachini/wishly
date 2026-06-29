import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { AddGiftForm } from "../components/Forms";
import { EmptyState } from "../components/States";
import { SetupNotice } from "../components/SetupNotice";
import { hasSupabaseEnv } from "../lib/env";
import { giftSchema } from "../lib/validation";
import { useTranslation } from "../i18n/useTranslation";
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
    currency: "USD",
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

  if (!hasSupabaseEnv) {
    return <SetupNotice />;
  }

  const selectedWishlist = wishlists.find((wishlist) => wishlist.id === values.wishlist_id);
  const selectedTrackedGiftCount = selectedWishlist?.gifts.filter((gift) => gift.price_tracking_enabled).length ?? 0;
  const priceTrackingAllowed = Boolean(selectedWishlist?.type === "wishlist" && selectedWishlist?.is_price_radar_enabled) && selectedTrackedGiftCount < 2;

  async function handleSubmit() {
    setSubmitError(null);
    const parsed = giftSchema.safeParse(values);
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
        wishlist_id: values.wishlist_id,
        name: values.name,
        description: values.description,
        store_url: values.store_url,
        image_url: values.image_url,
        estimated_price: values.estimated_price ? Number(values.estimated_price) : undefined,
        currency: values.currency,
        priority: values.priority,
        purchase_type: values.purchase_type,
        funding_goal_amount:
          values.purchase_type === "collective" && values.funding_goal_amount
            ? Number(values.funding_goal_amount)
            : undefined,
        funding_currency: values.currency,
        price_tracking_enabled: values.price_tracking_enabled,
        current_price: values.current_price ? Number(values.current_price) : undefined,
        target_price: values.target_price ? Number(values.target_price) : undefined,
        price_radar_priority: values.price_radar_priority,
        price_alert_preferences: values.price_alert_preferences,
      });
      navigate(`/lists/${values.wishlist_id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (loadingWishlists) {
    return <p className="text-sm text-warm-500">{t("common.loading")}</p>;
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
        <p className="text-sm font-semibold text-coral">{t("giftForm.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("giftForm.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-warm-500">{t("giftForm.body")}</p>
      </header>
      <section className="rounded-[36px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
        {submitError ? <p className="mb-4 text-sm text-terracotta">{submitError}</p> : null}
        <AddGiftForm
          values={values}
          wishlistOptions={wishlists.map((wishlist) => ({
            id: wishlist.id,
            title: wishlist.title,
            type: wishlist.type,
            is_price_radar_enabled: wishlist.is_price_radar_enabled,
          }))}
          errors={errors}
          loading={loading}
          t={t}
          onChange={(name, value) =>
            setValues((current) => {
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
