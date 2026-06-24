import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";
import { listDiscoverSponsoredItems, listMyWishlists } from "../services/wishlists";
import type { SponsoredItemRecord, WishlistWithGifts } from "../types/domain";
import { EmptyState } from "../components/States";
import { Modal } from "../components/Modal";
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
  }, [t]);

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
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold text-coral">{t("nav.discover")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("discover.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-warm-500">{t("discover.body")}</p>
      </header>

      <section className="grid gap-3 rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
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
      </section>

      {loading ? <p className="text-sm text-warm-500">{t("common.loading")}</p> : null}
      {error ? <p className="text-sm text-terracotta">{error}</p> : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <EmptyState
          title={t("discover.emptyTitle")}
          body={t("discover.emptyBody")}
          action={wishlists.length === 0 ? t("actions.createWishlist") : undefined}
          onAction={wishlists.length === 0 ? () => navigate("/create") : undefined}
        />
      ) : null}

      <div className="grid gap-4">
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
              className="rounded-[24px] border border-warm-100 bg-warm-50/70 px-4 py-4 text-left transition hover:border-coral/35 hover:bg-blush/40"
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
    </div>
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
        active ? "bg-blush text-terracotta" : "bg-warm-50 text-warm-600 hover:bg-warm-100"
      }`}
    >
      {label}
    </button>
  );
}
