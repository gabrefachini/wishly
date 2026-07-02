import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { listDiscoverSponsoredItems, listMyWishlists } from "../services/wishlists";
import type { SponsoredItemRecord, WishlistWithGifts } from "../types/domain";
import { EmptyState } from "../components/States";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { BentoCard, PremiumPageShell } from "../components/PremiumLayout";
import { SecondaryButton } from "../components/Buttons";
import { SponsoredItemCard } from "../components/SponsoredItemCard";
import { updateMetadata } from "../lib/metadata";

const occasionKeys = [
  "birthday",
  "babyShower",
  "wedding",
  "newHome",
  "christmas",
  "secretSanta",
] as const;

const priceFilters = [
  { key: "under50", max: 50 },
  { key: "under100", max: 100 },
  { key: "under200", max: 200 },
  { key: "group", min: 201 },
] as const;

export function DiscoverPage() {
  const { t, locale } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SponsoredItemRecord[]>([]);
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [pendingItem, setPendingItem] = useState<SponsoredItemRecord | null>(null);

  useEffect(() => {
    updateMetadata({
      title: `${t("discover.title")} — Wishly`,
      description: t("discover.body"),
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
    setItems([]);
    setWishlists([]);

    Promise.all([listDiscoverSponsoredItems(), listMyWishlists()])
      .then(([nextItems, nextWishlists]) => {
        if (!active) return;
        setItems(nextItems);
        setWishlists(nextWishlists);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : t("common.error"));
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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesOccasion = occasion === "all" || item.occasion === occasion;
      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "group" ? (item.price ?? 0) >= 200 : (item.price ?? Number.POSITIVE_INFINITY) <= Number(priceFilter));

      return matchesOccasion && matchesPrice;
    });
  }, [items, occasion, priceFilter]);

  function handleAdd(item: SponsoredItemRecord) {
    if (wishlists.length === 0) {
      navigate("/create");
      return;
    }

    if (wishlists.length === 1) {
      const wishlistId = wishlists[0].id;
      const params = new URLSearchParams({
        wishlistId,
        name: item.title,
        imageUrl: item.image_url || "",
        storeUrl: item.destination_url,
        estimatedPrice: item.price?.toString() || "",
        description: item.description || "",
      });
      navigate(`/gift/new?${params.toString()}`);
      return;
    }

    setPendingItem(item);
  }

  function goToGiftCreation(wishlistId: string) {
    if (!pendingItem) return;

    const params = new URLSearchParams({
      wishlistId,
      name: pendingItem.title,
      imageUrl: pendingItem.image_url || "",
      storeUrl: pendingItem.destination_url,
      estimatedPrice: pendingItem.price?.toString() || "",
      description: pendingItem.description || "",
    });
    navigate(`/gift/new?${params.toString()}`);
  }

  return (
    <PremiumPageShell>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{t("nav.discover")}</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,3.3rem)] font-bold tracking-[-0.05em] text-warm-900">{t("discover.title")}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-warm-500">{t("discover.body")}</p>
      </header>

      <BentoCard tone="accent" className="grid gap-5">
        <div>
          <p className="text-sm font-semibold text-warm-700">{t("discover.byOccasion")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip label={t("discover.allOccasions")} active={occasion === "all"} onClick={() => setOccasion("all")} />
            {occasionKeys.map((key) => (
              <FilterChip
                key={key}
                label={t(`occasions.${key}`)}
                active={occasion === key}
                onClick={() => setOccasion(key)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-warm-700">{t("discover.byPrice")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip label={t("discover.allPrices")} active={priceFilter === "all"} onClick={() => setPriceFilter("all")} />
            {priceFilters.map((filter) => (
              <FilterChip
                key={filter.key}
                label={t(`discover.${filter.key}`)}
                active={priceFilter === (filter.key === "group" ? "group" : String(filter.max))}
                onClick={() =>
                  setPriceFilter(filter.key === "group" ? "group" : String(filter.max))
                }
              />
            ))}
          </div>
        </div>
      </BentoCard>

      {loading ? (
        <LoadingState
          title={t("common.loadingTitle")}
          body={t("common.loadingBody")}
          timeoutTitle={t("common.loadingTimeoutTitle")}
          timeoutBody={t("common.loadingTimeoutBody")}
          retryLabel={t("common.retry")}
          redirectTo="/app"
          redirectLabel={t("nav.home")}
          onRetry={() => window.location.reload()}
        />
      ) : null}
      {error ? <p className="text-sm text-primary-strong">{error}</p> : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <EmptyState
          title={t("discover.emptyTitle")}
          body={t("discover.emptyBody")}
          action={wishlists.length === 0 ? t("actions.createWishlist") : undefined}
          onAction={wishlists.length === 0 ? () => navigate("/create") : undefined}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <SponsoredItemCard
            key={item.id}
            item={item}
            locale={locale}
            sponsoredLabel={t("discover.sponsored")}
            occasionLabel={item.occasion ? t(`occasions.${item.occasion}`) : undefined}
            addLabel={t("discover.addToMyList")}
            openLabel={t("discover.openStore")}
            onAdd={() => handleAdd(item)}
          />
        ))}
      </div>

      <Modal
        title={t("discover.chooseList")}
        open={Boolean(pendingItem)}
        onClose={() => setPendingItem(null)}
      >
        <div className="grid gap-3">
          <p className="text-sm leading-6 text-warm-500">{t("discover.chooseListBody")}</p>
          {wishlists.map((wishlist) => (
            <button
              key={wishlist.id}
              type="button"
              onClick={() => goToGiftCreation(wishlist.id)}
              className="rounded-card border border-border bg-sunken px-4 py-4 text-left transition hover:border-primary/35 hover:bg-sunken"
            >
              <p className="font-semibold text-warm-900">{wishlist.title}</p>
              <p className="mt-1 text-sm text-warm-500">{t(`occasions.${wishlist.occasion}`)}</p>
            </button>
          ))}
          <SecondaryButton type="button" onClick={() => setPendingItem(null)}>
            {t("actions.cancel")}
          </SecondaryButton>
        </div>
      </Modal>
    </PremiumPageShell>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-surface text-primary-strong shadow-card ring-1 ring-border"
          : "bg-sunken text-warm-600 ring-1 ring-border hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );
}
