import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SecondaryButton } from "../components/Buttons";
import { EmptyState } from "../components/States";
import { useTranslation } from "../i18n/useTranslation";
import { isAdminUser } from "../lib/admin";
import { listMyWishlists } from "../services/wishlists";
import { useEffect, useState } from "react";
import { updateMetadata } from "../lib/metadata";

export function ProfilePage() {
  const { t, locale } = useTranslation();
  const { profile, signOutUser, session } = useAuth();
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);

  useEffect(() => {
    updateMetadata({
      title: `${t("lists.profileTitle")} — Wishly`,
      description: t("lists.profileBody"),
    });
  }, [t]);

  useEffect(() => {
    let active = true;

    listMyWishlists()
      .then((items) => {
        if (active) {
          setWishlistCount(items.length);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  if (!profile) {
    return (
      <EmptyState
        title={t("lists.profileEmptyTitle")}
        body={t("lists.profileEmptyBody")}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-coral">{t("lists.profileEyebrow")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("lists.profileTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-warm-500">{t("lists.profileBody")}</p>
      </header>
      <section className="rounded-[36px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
        <dl className="grid gap-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
              {t("profile.account")}
            </dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">
              {profile.name || "-"}
            </dd>
            <p className="mt-1 text-sm text-warm-500">{profile.email}</p>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
              {t("profile.preferences")}
            </dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">
              {t("profile.language")}: {locale}
            </dd>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] bg-warm-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
                {t("profile.createdLists")}
              </p>
              <p className="mt-2 text-2xl font-bold text-warm-900">
                {wishlistCount ?? "—"}
              </p>
            </div>
            <div className="rounded-[24px] bg-warm-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
                {t("profile.currentLanguage")}
              </p>
              <p className="mt-2 text-2xl font-bold text-warm-900">{locale}</p>
            </div>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {isAdminUser(session?.user) ? (
            <Link to="/admin" className="contents">
              <SecondaryButton>{t("profile.adminArea")}</SecondaryButton>
            </Link>
          ) : null}
          <SecondaryButton onClick={() => void signOutUser()}>
            {t("actions.logOut")}
          </SecondaryButton>
        </div>
      </section>
    </div>
  );
}
