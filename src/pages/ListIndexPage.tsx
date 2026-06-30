import { Archive, Link2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { CreateButton, SecondaryButton } from "../components/Buttons";
import { EmptyState } from "../components/States";
import { buildWishlistSummary } from "../lib/presenters";
import { useTranslation } from "../i18n/useTranslation";
import { archiveWishlist, listMyWishlists, restoreWishlist } from "../services/wishlists";
import type { WishlistWithGifts } from "../types/domain";
import { updateMetadata } from "../lib/metadata";

type FilterMode = "active" | "archived" | "all";

export function ListIndexPage() {
  const { t, locale } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<WishlistWithGifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("active");
  const [query, setQuery] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    updateMetadata({
      title: `${t("lists.title")} — Wishly`,
      description: t("lists.body"),
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
  }, [authLoading, session?.user?.id, t]);

  const filteredWishlists = useMemo(() => {
    return wishlists.filter((wishlist) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" ? wishlist.archived_at === null : wishlist.archived_at !== null);
      const matchesQuery = wishlist.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, wishlists]);

  async function handleShare(shareId: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/w/${shareId}`);
    setActionMessage(t("wishlist.linkCopied"));
  }

  async function handleArchive(wishlist: WishlistWithGifts) {
    try {
      if (wishlist.archived_at) {
        await restoreWishlist(wishlist.id);
      } else {
        await archiveWishlist(wishlist.id);
      }

      setWishlists((current) =>
        current.map((item) =>
          item.id === wishlist.id
            ? { ...item, archived_at: wishlist.archived_at ? null : new Date().toISOString() }
            : item,
        ),
      );
      setActionMessage(wishlist.archived_at ? t("lists.restored") : t("lists.archived"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("common.error"));
    }
  }

  return (
    <div className="grid gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-coral">{t("lists.eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("lists.title")}</h1>
          <p className="mt-3 text-sm leading-6 text-warm-500">{t("lists.body")}</p>
        </div>
        <Link to="/create">
          <CreateButton className="px-4" />
        </Link>
      </header>

      <section className="grid gap-3 rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
        <div className="flex flex-wrap gap-2">
          {(["active", "archived", "all"] as FilterMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === item ? "bg-blush text-terracotta" : "bg-warm-50 text-warm-600"
              }`}
            >
              {t(`lists.filters.${item}`)}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
            aria-hidden="true"
          />
          <input
            className="min-h-12 w-full rounded-2xl border border-warm-100 bg-porcelain pl-11 pr-4 text-base text-warm-900 outline-none transition placeholder:text-warm-300 focus:border-coral focus:ring-4 focus:ring-coral/15"
            placeholder={t("lists.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      {loading ? <p className="text-sm text-warm-500">{t("common.loading")}</p> : null}
      {error ? <p className="text-sm text-terracotta">{error}</p> : null}
      {actionMessage ? <p className="text-sm text-emerald-700">{actionMessage}</p> : null}

      {!loading && !error && filteredWishlists.length === 0 ? (
        <EmptyState
          title={t("lists.emptyTitle")}
          body={t("lists.emptyBody")}
          action={t("lists.newList")}
          onAction={() => navigate("/create")}
          branded
        />
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {filteredWishlists.map((wishlist) => {
          const summary = buildWishlistSummary(wishlist, locale, t);
          return (
            <section
              key={wishlist.id}
              className="rounded-[28px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">
                    {summary.occasionLabel}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-warm-900">{wishlist.title}</h2>
                  <p className="mt-2 text-sm text-warm-500">{summary.dateLabel}</p>
                </div>
                <span className="rounded-full bg-warm-50 px-3 py-1 text-xs font-semibold text-warm-600">
                  {wishlist.archived_at ? t("lists.filters.archived") : t("lists.filters.active")}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-warm-600">
                <span className="rounded-full bg-warm-50 px-3 py-1">{summary.giftCountLabel}</span>
                <span className="rounded-full bg-warm-50 px-3 py-1">{summary.reservedCountLabel}</span>
                <span className="rounded-full bg-warm-50 px-3 py-1">{summary.visibilityLabel}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={`/lists/${wishlist.id}`}>
                  <SecondaryButton>{t("lists.edit")}</SecondaryButton>
                </Link>
                <SecondaryButton type="button" onClick={() => void handleShare(wishlist.share_id)}>
                  <Link2 size={16} aria-hidden="true" />
                  {t("lists.share")}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => void handleArchive(wishlist)}>
                  <Archive size={16} aria-hidden="true" />
                  {wishlist.archived_at ? t("lists.restore") : t("lists.archive")}
                </SecondaryButton>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
