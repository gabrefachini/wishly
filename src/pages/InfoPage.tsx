import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LanguageSelector } from "../components/LanguageSelector";
import { SecondaryButton } from "../components/Buttons";
import { WishlyLogo } from "../components/WishlyLogo";
import { updateMetadata } from "../lib/metadata";
import { useTranslation } from "../i18n/useTranslation";

const contentByPath = {
  "/privacy": {
    titleKey: "info.privacyTitle",
    bodyKey: "info.privacyBody",
  },
  "/terms": {
    titleKey: "info.termsTitle",
    bodyKey: "info.termsBody",
  },
  "/contact": {
    titleKey: "info.contactTitle",
    bodyKey: "info.contactBody",
  },
} as const;

export function InfoPage() {
  const { pathname } = useLocation();
  const { t, locale } = useTranslation();
  const content = contentByPath[pathname as keyof typeof contentByPath] ?? contentByPath["/privacy"];

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    updateMetadata({
      title: `${t(content.titleKey)} — Wishly`,
      description: t(content.bodyKey),
      url: `${origin}${pathname}`,
      image: `${origin}/brand/wishly-logo-transparent.png`,
    });
  }, [content.bodyKey, content.titleKey, locale, pathname, t]);

  return (
    <main className="min-h-screen bg-cream px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex rounded-full bg-porcelain px-4 py-3 shadow-card ring-1 ring-warm-100 focus:outline-none focus:ring-4 focus:ring-coral/15">
            <WishlyLogo size="sm" />
          </Link>
          <LanguageSelector />
        </div>

        <section className="rounded-[36px] bg-porcelain p-6 shadow-soft ring-1 ring-warm-100">
          <p className="text-sm font-semibold text-coral">{t("app.promise")}</p>
          <h1 className="mt-2 text-3xl font-bold text-warm-900">{t(content.titleKey)}</h1>
          <p className="mt-4 text-base leading-8 text-warm-500">{t(content.bodyKey)}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <SecondaryButton>{t("actions.createWishlist")}</SecondaryButton>
            </Link>
            <Link to="/login">
              <SecondaryButton>{t("actions.logIn")}</SecondaryButton>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
