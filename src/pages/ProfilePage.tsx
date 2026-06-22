import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SecondaryButton } from "../components/Buttons";
import { EmptyState } from "../components/States";
import { useTranslation } from "../i18n/useTranslation";
import { isAdminUser } from "../lib/admin";

export function ProfilePage() {
  const { t } = useTranslation();
  const { profile, signOutUser, session } = useAuth();

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
        <dl className="grid gap-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
              {t("auth.name")}
            </dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">
              {profile.name || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
              {t("auth.email")}
            </dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">{profile.email}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {isAdminUser(session?.user) ? (
            <Link to="/admin" className="contents">
              <SecondaryButton>{t("admin.admin")}</SecondaryButton>
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
