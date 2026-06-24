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
import { LanguageSelector } from "../components/LanguageSelector";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
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
    <div className="min-h-screen bg-cream text-warm-900">
      <header className="sticky top-0 z-30 border-b border-warm-100/80 bg-cream/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-3 rounded-full focus:outline-none focus:ring-4 focus:ring-coral/15">
            <WishlyLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-warm-500 transition hover:text-terracotta focus:outline-none focus:ring-4 focus:ring-coral/15"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSelector />
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
            <LanguageSelector />
            <button
              type="button"
              aria-label={menuOpen ? t("landing.closeMenu") : t("landing.openMenu")}
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-warm-100 bg-porcelain shadow-card focus:outline-none focus:ring-4 focus:ring-coral/15"
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-warm-100 bg-porcelain lg:hidden">
            <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 sm:px-6">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl px-3 py-2 text-sm font-semibold text-warm-700 hover:bg-warm-50"
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
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-warm-100 bg-porcelain px-4 py-2 text-sm font-semibold text-warm-700 shadow-card">
              <CheckCircle2 size={16} className="text-coral" aria-hidden="true" />
              {t("landing.eyebrow")}
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight text-warm-900 sm:text-5xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-warm-500">
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
            <p className="mt-4 text-sm font-semibold text-coral">{t("landing.heroMicrocopy")}</p>
            <p className="mt-6 max-w-lg text-sm leading-6 text-warm-500">
              {t("landing.socialProof")}
            </p>
          </div>

          <HeroMockup />
        </section>

        <section className="border-y border-warm-100/80 bg-porcelain/75">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item} className="inline-flex items-center gap-2 rounded-2xl bg-porcelain px-4 py-3 text-sm font-semibold text-warm-700 shadow-card ring-1 ring-warm-100/80">
                <CheckCircle2 size={16} className="text-coral" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <SectionIntro eyebrow={t("landing.howEyebrow")} title={t("landing.howTitle")} body={t("landing.howBody")} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Gift, step: "01", title: t("landing.stepOneTitle"), body: t("landing.stepOneBody") },
              { icon: Share2, step: "02", title: t("landing.stepTwoTitle"), body: t("landing.stepTwoBody") },
              { icon: Users, step: "03", title: t("landing.stepThreeTitle"), body: t("landing.stepThreeBody") },
            ].map((item) => (
              <article key={item.step} className="rounded-[30px] bg-porcelain p-6 shadow-card ring-1 ring-warm-100">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blush text-terracotta">
                    <item.icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-warm-300">{item.step}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-warm-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-warm-500">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="bg-porcelain/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <SectionIntro eyebrow={t("landing.featuresEyebrow")} title={t("landing.featuresTitle")} body={t("landing.featuresBody")} />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((item) => (
                <article key={item.title} className="rounded-[28px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender/80 text-warm-900">
                    <item.icon size={18} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-warm-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-warm-500">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <SectionIntro eyebrow={t("landing.occasionsEyebrow")} title={t("landing.occasionsTitle")} body={t("landing.occasionsBody")} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {useCases.map((item) => (
              <article key={item.title} className="rounded-[28px] bg-porcelain p-6 shadow-card ring-1 ring-warm-100">
                <h3 className="text-lg font-bold text-warm-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-warm-500">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-20">
          <div className="overflow-hidden rounded-[34px] bg-warm-900 text-white shadow-soft">
            <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-8">
              <div>
                <p className="text-sm font-semibold text-blush">{t("landing.brazilEyebrow")}</p>
                <h2 className="mt-3 text-3xl font-bold">{t("landing.brazilTitle")}</h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-warm-100">{t("landing.brazilBody")}</p>
              </div>
              <div className="grid gap-3 rounded-[28px] bg-white/10 p-4">
                <ValueChip label={t("landing.brazilChipOne")} />
                <ValueChip label={t("landing.brazilChipTwo")} />
                <ValueChip label={t("landing.brazilChipThree")} />
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-porcelain/65">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <SectionIntro eyebrow={t("landing.faqEyebrow")} title={t("landing.faqTitle")} body={t("landing.faqBody")} />
            <div className="mt-8 grid gap-3">
              {faqItems.map((item) => (
                <details key={item.q} className="group rounded-[28px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold text-warm-900">
                    <span>{item.q}</span>
                    <ChevronDown size={18} className="text-warm-400 transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-warm-500">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="rounded-[34px] bg-porcelain p-8 text-center shadow-card ring-1 ring-warm-100">
            <h2 className="text-3xl font-bold text-warm-900">{t("landing.finalTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-warm-500">{t("landing.finalBody")}</p>
            <div className="mt-8 flex justify-center">
              <Link to={session ? "/app" : "/signup"}>
                <PrimaryButton>
                  {session ? t("landing.openApp") : t("landing.finalCta")}
                  <ArrowRight size={16} aria-hidden="true" />
                </PrimaryButton>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-warm-100 bg-porcelain/85">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <WishlyLogo size="sm" />
            <p className="mt-4 max-w-md text-sm leading-7 text-warm-500">{t("landing.footerTagline")}</p>
          </div>
          <nav className="grid gap-3 text-sm font-semibold text-warm-600 sm:grid-cols-5 sm:gap-6">
            <Link to="/login" className="transition hover:text-terracotta">{t("landing.openApp")}</Link>
            <Link to="/signup" className="transition hover:text-terracotta">{t("actions.createWishlist")}</Link>
            <Link to="/privacy" className="transition hover:text-terracotta">{t("landing.footerPrivacy")}</Link>
            <Link to="/terms" className="transition hover:text-terracotta">{t("landing.footerTerms")}</Link>
            <Link to="/contact" className="transition hover:text-terracotta">{t("landing.footerContact")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-coral">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-warm-900">{title}</h2>
      <p className="mt-4 text-base leading-8 text-warm-500">{body}</p>
    </div>
  );
}

function ValueChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
      <CheckCircle2 size={16} className="text-blush" aria-hidden="true" />
      {label}
    </div>
  );
}

function HeroMockup() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div className="absolute -left-6 top-10 hidden h-36 w-36 rounded-full bg-lavender/50 blur-3xl sm:block" />
      <div className="absolute -bottom-6 right-0 hidden h-40 w-40 rounded-full bg-blush/70 blur-3xl sm:block" />
      <div className="relative overflow-hidden rounded-[36px] bg-porcelain p-4 shadow-soft ring-1 ring-warm-100 sm:p-5">
        <div className="overflow-hidden rounded-[28px] border border-warm-100 bg-white">
          <div className="h-44 bg-[linear-gradient(135deg,#f6ded7_0%,#ece7f9_52%,#dcecf5_100%)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">{t("landing.mockupLabel")}</p>
                <h3 className="mt-2 text-2xl font-bold text-warm-900">{t("landing.mockupTitle")}</h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-warm-700">
                  {t("landing.mockupBody")}
                </p>
              </div>
              <div className="rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-warm-700 shadow-card">
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
            <div className="rounded-[22px] border border-warm-100 bg-warm-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-warm-900">{t("landing.mockupGiftThreeTitle")}</p>
                  <p className="mt-1 text-xs font-medium text-warm-500">{t("landing.mockupGiftThreeMeta")}</p>
                </div>
                <span className="rounded-full bg-lavender px-3 py-1 text-xs font-semibold text-warm-900">
                  {t("landing.mockupGroupGift")}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-warm-100">
                <div className="h-full w-1/2 rounded-full bg-coral" />
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
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[22px] border border-warm-100 bg-porcelain p-3">
      <div className="h-16 rounded-[18px] bg-[linear-gradient(145deg,#f2ece4_0%,#fffdf9_100%)]" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-warm-900">{title}</p>
        <p className="mt-1 text-xs font-medium text-warm-500">{price}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone === "reserved" ? "bg-lavender text-warm-900" : "bg-blush text-terracotta"}`}>
        {status}
      </span>
    </div>
  );
}
