import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreateButton } from "../components/Buttons";
import { EmptyState } from "../components/States";
import { WishlistCard } from "../components/WishlistCard";
import { buildWishlistSummary } from "../lib/presenters";
import { useTranslation } from "../i18n/useTranslation";
import { listMyWishlists } from "../services/wishlists";
import type { WishlistWithGifts } from "../types/domain";

const fallbackCover =
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80";

export function ListIndexPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listMyWishlists()
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
  }, [t]);

  return (
    <div className="grid gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-coral">{t("lists.allOccasions")}</p>
          <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("nav.lists")}</h1>
        </div>
        <Link to="/create">
          <CreateButton className="px-4" />
        </Link>
      </header>

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
        {wishlists.map((wishlist) => {
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
    </div>
  );
}
