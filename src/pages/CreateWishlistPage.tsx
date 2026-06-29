import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { CreateWishlistForm } from "../components/Forms";
import { SetupNotice } from "../components/SetupNotice";
import { getCreateWishlistErrorMessage } from "../lib/errors";
import { hasSupabaseEnv, isDemoMode } from "../lib/env";
import { createWishlistSchema } from "../lib/validation";
import { useTranslation } from "../i18n/useTranslation";
import { WISHLIST_THEME_PRESETS } from "../lib/wishlistAppearance";
import { ensureProfile } from "../services/auth";
import { uploadWishlistCover } from "../services/storage";
import { createWishlist } from "../services/wishlists";
import type { WishlistThemePreset, WishlistType } from "../types/domain";

export function CreateWishlistPage() {
  const { t, locale } = useTranslation();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<{
    title: string;
    type: WishlistType;
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
    message: t("wishlist.message"),
    cover_image_url: "",
    visibility: "public_link" as const,
    theme_preset: "default" as const,
    theme_primary_color: WISHLIST_THEME_PRESETS.default.primary,
    theme_secondary_color: WISHLIST_THEME_PRESETS.default.secondary,
    use_custom_theme: false,
    is_price_radar_enabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!hasSupabaseEnv && !isDemoMode) {
    return <SetupNotice />;
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (!session?.user) {
      setSubmitError(t("create.errors.auth"));
      return;
    }

    const parsed = createWishlistSchema.safeParse(values);
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
      const ownerProfile = profile ?? (await ensureProfile(session, locale));
      if (!ownerProfile) {
        setSubmitError(t("create.errors.auth"));
        return;
      }

      const wishlist = await createWishlist({
        owner_id: ownerProfile.id,
        title: values.title,
        type: values.type,
        occasion: values.occasion,
        event_date: values.event_date,
        message: values.message,
        cover_image_url: values.cover_image_url,
        visibility: values.visibility,
        theme_preset: values.theme_preset,
        theme_primary_color: values.theme_primary_color,
        theme_secondary_color: values.theme_secondary_color,
        use_custom_theme: values.use_custom_theme,
        is_price_radar_enabled: values.is_price_radar_enabled,
        locale,
      });
      navigate(`/lists/${wishlist.id}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("wishlist_create_failed", error);
      }
      setSubmitError(getCreateWishlistErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  }

  async function handleCoverUpload(file: File | null) {
    if (!file) {
      return;
    }

    if (!session?.user) {
      setSubmitError(t("create.errors.auth"));
      return;
    }

    setSubmitError(null);
    setErrors((current) => ({ ...current, cover_image_url: undefined }));
    setCoverUploading(true);

    try {
      const uploadedUrl = await uploadWishlistCover(file, session.user.id);
      setValues((current) => ({ ...current, cover_image_url: uploadedUrl }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message === "invalid_image_type") {
        setErrors((current) => ({
          ...current,
          cover_image_url: t("create.errors.coverFileType"),
        }));
      } else if (message === "image_too_large") {
        setErrors((current) => ({
          ...current,
          cover_image_url: t("create.errors.coverFileSize"),
        }));
      } else if (message === "storage_bucket_not_found") {
        setErrors((current) => ({
          ...current,
          cover_image_url: t("create.errors.coverBucket"),
        }));
      } else if (message === "storage_permission_denied") {
        setErrors((current) => ({
          ...current,
          cover_image_url: t("create.errors.coverPermission"),
        }));
      } else {
        setErrors((current) => ({
          ...current,
          cover_image_url: t("create.errors.coverUpload"),
        }));
      }
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold text-coral">{t("create.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("create.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-warm-500">{t("create.body")}</p>
      </header>
      <section className="rounded-[36px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
        {submitError ? <p className="mb-4 text-sm text-terracotta">{submitError}</p> : null}
        <CreateWishlistForm
          values={values}
          errors={errors}
          loading={loading}
          coverUploading={coverUploading}
          t={t}
          onChange={(name, value) =>
            setValues((current) => {
              if (name === "type") {
                const type = value === "wishlist" ? "wishlist" : "event";
                return {
                  ...current,
                  type,
                  occasion: type === "wishlist" ? "wishlist" : current.occasion === "wishlist" ? "birthday" : current.occasion,
                  visibility: type === "wishlist" ? "private" : current.visibility,
                  is_price_radar_enabled: type === "wishlist" ? current.is_price_radar_enabled : false,
                };
              }

              if (name === "is_price_radar_enabled") {
                return { ...current, is_price_radar_enabled: Boolean(value) };
              }

              return { ...current, [name]: value };
            })
          }
          onCoverUpload={(file) => void handleCoverUpload(file)}
          onSubmit={() => void handleSubmit()}
        />
      </section>
    </div>
  );
}
