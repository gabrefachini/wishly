import { ArrowRight, Bell, CalendarDays, Gift, HandCoins, Plus, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SecondaryButton } from "../components/Buttons";
import { EmptyState } from "../components/States";
import { WishlistCard } from "../components/WishlistCard";
import { buildWishlistSummary } from "../lib/presenters";
import { useTranslation } from "../i18n/useTranslation";
import { listActiveWishlists } from "../services/wishlists";
import type { WishlistWithGifts } from "../types/domain";
import { updateMetadata } from "../lib/metadata";

const fallbackCover =
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80";

export function HomePage() {
  const { t, locale } = useTranslation();
  const { profile, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateMetadata({
      title: `${t("home.title")} — Wishly`,
      description: t("home.heroBody"),
    });
  }, [t]);

  useEffect(() => {
    let active = true;
    if (authLoading) {
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    setWishlists([]);

    listActiveWishlists()
      .then((data) => {
        if (active) {
          setWishlists(data);
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
  }, [authLoading, session?.user?.id, t]);

  const firstWishlist = wishlists[0];
  const previewHref = firstWishlist ? `/w/${firstWishlist.share_id}` : "/create";
  const addGiftHref = firstWishlist
    ? `/gift/new?wishlistId=${firstWishlist.id}`
    : "/create";
  const activeListCount = wishlists.length;
  const reservedGiftCount = wishlists.reduce(
    (total, wishlist) => total + wishlist.gifts.filter((gift) => gift.status === "reserved").length,
    0,
  );
  const fundedAmount = wishlists.reduce(
    (total, wishlist) =>
      total +
      wishlist.gifts.reduce((giftTotal, gift) => giftTotal + (gift.funding_received_amount ?? 0), 0),
    0,
  );
  const upcomingCount = wishlists.filter((wishlist) => wishlist.event_date).length;

  return (
    <div className="grid gap-7">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-warm-500">
            {t("home.greetingPrefix")}, {profile?.name || "Gabriel"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-warm-900">
            {t("home.title")}
          </h1>
        </div>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-porcelain text-warm-700 shadow-card ring-1 ring-warm-100 focus:outline-none focus:ring-4 focus:ring-coral/15"
          aria-label={t("home.notifications")}
        >
          <Bell size={20} aria-hidden="true" />
        </button>
      </header>

      <section className="overflow-hidden rounded-[36px] bg-warm-900 text-white shadow-soft">
        <div className="grid gap-5 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
          <div>
            <p className="text-sm font-semibold text-blush">{t("home.question")}</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight">{t("home.heroTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-warm-100">{t("home.heroBody")}</p>
            <Link to="/create" className="mt-5 inline-flex">
              <SecondaryButton className="border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                {t("home.createNew")}
              </SecondaryButton>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-[30px] bg-white/10 p-4">
            <SummaryCard icon={Gift} label={t("home.activeLists")} value={String(activeListCount)} />
            <SummaryCard icon={Share2} label={t("home.reservedGifts")} value={String(reservedGiftCount)} />
            <SummaryCard icon={HandCoins} label={t("home.receivedContributions")} value={String(fundedAmount)} />
            <SummaryCard icon={CalendarDays} label={t("home.upcomingEvents")} value={String(upcomingCount)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-warm-900">{t("home.upcomingLists")}</h2>
          <Link
            to="/lists"
            className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta focus:outline-none focus:ring-4 focus:ring-coral/15"
          >
            {t("actions.viewAll")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {loading ? <p className="text-sm text-warm-500">{t("common.loading")}</p> : null}
        {error ? <p className="text-sm text-terracotta">{error}</p> : null}

        {!loading && !error && wishlists.length === 0 ? (
          <EmptyState
            title={t("home.emptyTitle")}
            body={t("home.emptyBody")}
            action={t("home.emptyAction")}
            onAction={() => navigate("/create")}
            branded
          />
        ) : null}

        <div className="grid gap-3">
          {wishlists.slice(0, 4).map((wishlist) => {
            const summary = buildWishlistSummary(wishlist, locale, t);
            return (
              <WishlistCard
                key={wishlist.id}
                to={`/lists/${wishlist.id}`}
                cover={wishlist.cover_image_url || fallbackCover}
                occasionLabel={summary.occasionLabel}
                title={wishlist.title}
                dateLabel={summary.dateLabel}
                giftCountLabel={summary.giftCountLabel}
                reservedCountLabel={summary.reservedCountLabel}
                visibilityLabel={summary.visibilityLabel}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link to="/create" className="contents">
          <SecondaryButton className="w-full">
            <Plus size={17} aria-hidden="true" />
            {t("home.createNew")}
          </SecondaryButton>
        </Link>
        <Link to={addGiftHref} className="contents">
          <SecondaryButton className="w-full">
            <Plus size={17} aria-hidden="true" />
            {t("actions.addGift")}
          </SecondaryButton>
        </Link>
        <Link to={firstWishlist ? `/lists/${firstWishlist.id}` : previewHref} className="contents">
          <SecondaryButton className="w-full">{t("home.shareList")}</SecondaryButton>
        </Link>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gift;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] bg-white/10 p-4">
      <Icon size={18} aria-hidden="true" className="text-blush" />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-warm-100">{label}</p>
    </div>
  );
}
