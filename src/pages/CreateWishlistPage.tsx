import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { CreateWishlistForm } from "../components/Forms";
import { SetupNotice } from "../components/SetupNotice";
import { getCreateWishlistErrorMessage } from "../lib/errors";
import { hasSupabaseEnv } from "../lib/env";
import { wishlistSchema } from "../lib/validation";
import { useTranslation } from "../i18n/useTranslation";
import { ensureProfile } from "../services/auth";
import { createWishlist } from "../services/wishlists";

export function CreateWishlistPage() {
  const { t, locale } = useTranslation();
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    title: "",
    occasion: "birthday",
    event_date: "",
    message: t("wishlist.message"),
    cover_image_url: "",
    visibility: "public_link" as const,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!hasSupabaseEnv) {
    return <SetupNotice />;
  }

  async function handleSubmit() {
    setSubmitError(null);
    const parsed = wishlistSchema.safeParse(values);
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

      await refreshProfile();
      const wishlist = await createWishlist({
        owner_id: ownerProfile.id,
        title: values.title,
        occasion: values.occasion,
        event_date: values.event_date,
        message: values.message,
        cover_image_url: values.cover_image_url,
        visibility: values.visibility,
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
          t={t}
          onChange={(name, value) =>
            setValues((current) => ({ ...current, [name]: value }))
          }
          onSubmit={() => void handleSubmit()}
        />
      </section>
    </div>
  );
}
