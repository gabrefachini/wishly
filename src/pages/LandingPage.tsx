import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Gift,
  HeartHandshake,
  Link2,
  ListChecks,
  Menu,
  Share2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { BentoCard, BentoGrid, PremiumPageShell, SectionHeader } from "../components/PremiumLayout";
import { WishlyLogo } from "../components/WishlyLogo";
import { updateMetadata } from "../lib/metadata";
import { useTranslation } from "../i18n/useTranslation";

type SectionLink = {
  href: string;
  label: string;
};

export function LandingPage() {
  const { t, locale } = useTranslation();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    updateMetadata({
      title: t("landing.metaTitle"),
      description: t("landing.metaDescription"),
      url: `${origin}/`,
      image: `${origin}/brand/wishly-logo-transparent.png`,
    });
  }, [locale, t]);

  const navLinks = useMemo<SectionLink[]>(
    () => [
      { href: "#how-it-works", label: t("landing.navHowItWorks") },
      { href: "#features", label: t("landing.navFeatures") },
      { href: "#use-cases", label: t("landing.navUseCases") },
      { href: "#faq", label: t("landing.navFaq") },
    ],
    [t],
  );

  const trustItems = useMemo(
    () => [
      t("landing.trustOne"),
      t("landing.trustTwo"),
      t("landing.trustThree"),
      t("landing.trustFour"),
    ],
    [t],
  );

  const featureCards = useMemo(
    () => [
      { icon: ListChecks, title: t("landing.featureAvoidTitle"), body: t("landing.featureAvoidBody") },
      { icon: Share2, title: t("landing.featureShareTitle"), body: t("landing.featureShareBody") },
      { icon: HeartHandshake, title: t("landing.featureGroupTitle"), body: t("landing.featureGroupBody") },
      { icon: Link2, title: t("landing.featureOneLinkTitle"), body: t("landing.featureOneLinkBody") },
    ],
    [t],
  );

  const useCases = useMemo(
    () => [
      { title: t("landing.useCaseBirthdayTitle"), body: t("landing.useCaseBirthdayBody") },
      { title: t("landing.useCaseBabyTitle"), body: t("landing.useCaseBabyBody") },
      { title: t("landing.useCaseWeddingTitle"), body: t("landing.useCaseWeddingBody") },
      { title: t("landing.useCaseHomeTitle"), body: t("landing.useCaseHomeBody") },
      { title: t("landing.useCaseChristmasTitle"), body: t("landing.useCaseChristmasBody") },
      { title: t("landing.useCaseSecretTitle"), body: t("landing.useCaseSecretBody") },
      { title: t("landing.useCaseGroupTitle"), body: t("landing.useCaseGroupBody") },
    ],
    [t],
  );

  const faqItems = useMemo(
    () => [
      { q: t("landing.faqFreeQ"), a: t("landing.faqFreeA") },
      { q: t("landing.faqAccountQ"), a: t("landing.faqAccountA") },
      { q: t("landing.faqReserveQ"), a: t("landing.faqReserveA") },
      { q: t("landing.faqStoreQ"), a: t("landing.faqStoreA") },
      { q: t("landing.faqContribQ"), a: t("landing.faqContribA") },
      { q: t("landing.faqPublicQ"), a: t("landing.faqPublicA") },
    ],
    [t],
  );

  return (
    <div className="min-h-screen bg-page text-warm-900">
      <header className="sticky top-0 z-30 border-b border-border bg-page">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-3 rounded-full focus:outline-none focus:ring-4 focus:ring-primary/15">
            <WishlyLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-warm-500 transition hover:text-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/15"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {session ? (
              <Link to="/app">
                <SecondaryButton>{t("landing.openApp")}</SecondaryButton>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <SecondaryButton>{t("landing.openApp")}</SecondaryButton>
                </Link>
                <Link to="/signup">
                  <PrimaryButton>
                    {t("actions.createWishlist")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </PrimaryButton>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label={menuOpen ? t("landing.closeMenu") : t("landing.openMenu")}
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface shadow-card focus:outline-none focus:ring-4 focus:ring-primary/15"
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-border bg-surface lg:hidden">
            <div className="mx-auto grid max-w-[1380px] gap-3 px-4 py-4 sm:px-6 lg:px-8">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-ctrl px-3 py-2 text-sm font-semibold text-warm-700 hover:bg-warm-50"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 grid gap-3">
                {session ? (
                  <Link to="/app" onClick={() => setMenuOpen(false)}>
                    <SecondaryButton className="w-full">{t("landing.openApp")}</SecondaryButton>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)}>
                      <SecondaryButton className="w-full">{t("landing.openApp")}</SecondaryButton>
                    </Link>
                    <Link to="/signup" onClick={() => setMenuOpen(false)}>
                      <PrimaryButton className="w-full">{t("actions.createWishlist")}</PrimaryButton>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <PremiumPageShell className="mx-auto max-w-[1380px] px-4 pb-16 pt-10 sm:px-6 md:pb-20 md:pt-14 lg:px-8">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <BentoCard tone="accent" className="grid gap-8 p-7 sm:p-8 lg:min-h-[540px] lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-warm-700 shadow-card">
                  <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />
                  {t("landing.eyebrow")}
                </div>
                <h1 className="mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.9rem)] font-bold leading-[0.98] tracking-[-0.05em] text-warm-900">
                  {t("landing.heroTitle")}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-8 text-warm-600 sm:text-lg">
                  {t("landing.heroBody")}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to={session ? "/app" : "/signup"}>
                    <PrimaryButton className="w-full sm:w-auto">
                      {session ? t("landing.openApp") : t("landing.heroPrimaryCta")}
                      <ArrowRight size={16} aria-hidden="true" />
                    </PrimaryButton>
                  </Link>
                  <a href="#how-it-works">
                    <SecondaryButton className="w-full sm:w-auto">{t("landing.heroSecondaryCta")}</SecondaryButton>
                  </a>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-primary-strong">{t("landing.heroMicrocopy")}</p>
                  <span className="hidden h-1 w-1 rounded-full bg-warm-300 sm:inline-flex" />
                  <p className="max-w-lg text-sm leading-6 text-warm-500">{t("landing.socialProof")}</p>
                </div>
              </div>

              <div className="grid gap-3">
                {trustItems.slice(0, 3).map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-modal border border-border bg-surface p-4 shadow-card ${
                      index === 0 ? "lg:translate-x-2" : index === 2 ? "lg:-translate-x-2" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-ctrl bg-sunken text-primary-strong">
                        <CheckCircle2 size={16} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold leading-6 text-warm-800">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>

            <BentoGrid className="grid-rows-[auto_auto]">
              <HeroMockup />
              <BentoCard tone="default" className="grid gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{t("landing.featuresEyebrow")}</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {featureCards.slice(0, 2).map((item) => (
                    <div key={item.title} className="rounded-card bg-sunken p-4 ring-1 ring-border">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-ctrl bg-info-soft text-warm-900">
                        <item.icon size={17} aria-hidden="true" />
                      </div>
                      <h3 className="mt-3 text-base font-bold tracking-[-0.02em] text-warm-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-warm-500">{item.body}</p>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </BentoGrid>
          </section>

          <section id="how-it-works" className="pt-4 md:pt-8">
            <SectionHeader eyebrow={t("landing.howEyebrow")} title={t("landing.howTitle")} body={t("landing.howBody")} />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Gift, step: "01", title: t("landing.stepOneTitle"), body: t("landing.stepOneBody") },
              { icon: Share2, step: "02", title: t("landing.stepTwoTitle"), body: t("landing.stepTwoBody") },
              { icon: Users, step: "03", title: t("landing.stepThreeTitle"), body: t("landing.stepThreeBody") },
            ].map((item) => (
              <BentoCard key={item.step} tone={item.step === "02" ? "accent" : "default"} className="grid gap-5 p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-ctrl bg-sunken text-primary-strong">
                    <item.icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-warm-300">{item.step}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-warm-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-warm-500">{item.body}</p>
              </BentoCard>
            ))}
            </div>
          </section>

          <section id="features" className="pt-2 md:pt-4">
            <SectionHeader eyebrow={t("landing.featuresEyebrow")} title={t("landing.featuresTitle")} body={t("landing.featuresBody")} />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((item) => (
                <BentoCard key={item.title} tone={item.title === featureCards[2].title ? "accent" : "default"} className="p-5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-ctrl bg-info-soft text-warm-900">
                    <item.icon size={18} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-warm-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-warm-500">{item.body}</p>
                </BentoCard>
              ))}
            </div>
          </section>

          <section id="use-cases" className="pt-2 md:pt-4">
            <SectionHeader eyebrow={t("landing.occasionsEyebrow")} title={t("landing.occasionsTitle")} body={t("landing.occasionsBody")} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {useCases.map((item) => (
              <BentoCard key={item.title} tone="default" className="p-6">
                <h3 className="text-lg font-bold text-warm-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-warm-500">{item.body}</p>
              </BentoCard>
            ))}
            </div>
          </section>

          <section id="faq" className="pt-2 md:pt-4">
            <SectionHeader eyebrow={t("landing.faqEyebrow")} title={t("landing.faqTitle")} body={t("landing.faqBody")} />
            <div className="mt-8 grid gap-3">
              {faqItems.map((item) => (
                <details key={item.q} className="group rounded-modal bg-surface p-5 shadow-card ring-1 ring-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold text-warm-900">
                    <span>{item.q}</span>
                    <ChevronDown size={18} className="text-warm-400 transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-warm-500">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="pt-2 md:pt-4">
          <BentoCard tone="dark" className="p-8 text-center md:p-10">
            <h2 className="text-3xl font-bold text-white">{t("landing.finalTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-warm-100/80">{t("landing.finalBody")}</p>
            <div className="mt-8 flex justify-center">
              <Link to={session ? "/app" : "/signup"}>
                <PrimaryButton>
                  {session ? t("landing.openApp") : t("landing.finalCta")}
                  <ArrowRight size={16} aria-hidden="true" />
                </PrimaryButton>
              </Link>
            </div>
          </BentoCard>
          </section>
        </PremiumPageShell>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
          <div>
            <WishlyLogo size="sm" />
            <p className="mt-4 max-w-md text-sm leading-7 text-warm-500">{t("landing.footerTagline")}</p>
          </div>
          <nav className="grid gap-3 text-sm font-semibold text-warm-600 sm:grid-cols-5 sm:gap-6">
            <Link to="/login" className="transition hover:text-primary-strong">{t("landing.openApp")}</Link>
            <Link to="/signup" className="transition hover:text-primary-strong">{t("actions.createWishlist")}</Link>
            <Link to="/privacy" className="transition hover:text-primary-strong">{t("landing.footerPrivacy")}</Link>
            <Link to="/terms" className="transition hover:text-primary-strong">{t("landing.footerTerms")}</Link>
            <Link to="/contact" className="transition hover:text-primary-strong">{t("landing.footerContact")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function HeroMockup() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto w-full">
      <div className="relative overflow-hidden rounded-modal bg-surface p-4 shadow-soft ring-1 ring-border sm:p-5">
        <div className="overflow-hidden rounded-modal border border-border bg-white">
          <div className="h-44 bg-sunken p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-strong">{t("landing.mockupLabel")}</p>
                <h3 className="mt-2 text-2xl font-bold text-warm-900">{t("landing.mockupTitle")}</h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-warm-700">
                  {t("landing.mockupBody")}
                </p>
              </div>
              <div className="rounded-full bg-surface px-3 py-2 text-xs font-semibold text-warm-700 shadow-card">
                {t("landing.mockupShare")}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4">
            <MockGiftRow
              title={t("landing.mockupGiftOneTitle")}
              price={t("landing.mockupGiftOnePrice")}
              status={t("landing.mockupAvailable")}
              tone="available"
            />
            <MockGiftRow
              title={t("landing.mockupGiftTwoTitle")}
              price={t("landing.mockupGiftTwoPrice")}
              status={t("landing.mockupReserved")}
              tone="reserved"
            />
            <div className="rounded-card border border-border bg-sunken p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-warm-900">{t("landing.mockupGiftThreeTitle")}</p>
                  <p className="mt-1 text-xs font-medium text-warm-500">{t("landing.mockupGiftThreeMeta")}</p>
                </div>
                <span className="rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-warm-900">
                  {t("landing.mockupGroupGift")}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-warm-100">
                <div className="h-full w-1/2 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockGiftRow({
  title,
  price,
  status,
  tone,
}: {
  title: string;
  price: string;
  status: string;
  tone: "available" | "reserved";
}) {
  return (
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-card border border-border bg-surface p-3">
      <div className="h-16 rounded-card bg-sunken" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-warm-900">{title}</p>
        <p className="mt-1 text-xs font-medium text-warm-500">{price}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone === "reserved" ? "bg-info-soft text-warm-900" : "bg-sunken text-primary-strong"}`}>
        {status}
      </span>
    </div>
  );
}
