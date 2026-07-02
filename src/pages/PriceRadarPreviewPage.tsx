import { useState } from "react";
import { PriceRadarBoard } from "../components/PriceRadarBoard";
import { SecondaryButton } from "../components/Buttons";
import { useTranslation } from "../i18n/useTranslation";
import type { GiftRecord, WishlistWithGifts } from "../types/domain";

function previewCover(label: string, primary: string, secondary: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" rx="96" fill="url(#bg)" />
      <circle cx="225" cy="235" r="88" fill="rgba(255,255,255,0.45)" />
      <rect x="140" y="455" width="520" height="26" rx="13" fill="rgba(255,255,255,0.62)" />
      <rect x="140" y="502" width="360" height="26" rx="13" fill="rgba(255,255,255,0.48)" />
      <rect x="140" y="549" width="430" height="26" rx="13" fill="rgba(255,255,255,0.38)" />
    </svg>
  `)}`;
}

const previewWishlist: WishlistWithGifts = {
  id: "preview-wishlist",
  owner_id: "preview-owner",
  type: "wishlist",
  title: "Wishlist de Exemplo",
  occasion: "birthday",
  event_date: "2026-09-18",
  message: "Acompanhamento visual do Radar de Preços para validar hierarquia, espaço e estados sem histórico.",
  cover_image_url: null,
  theme_color: "coral",
  theme_preset: "default",
  theme_primary_color: "#de7762",
  theme_secondary_color: "#dcd2ff",
  use_custom_theme: false,
  is_price_radar_enabled: true,
  slug: null,
  visibility: "private",
  share_id: "preview-radar",
  locale: "pt-BR",
  rsvp_enabled: false,
  event_location: null,
  event_time: null,
  max_guests: null,
  created_at: "2026-06-20T10:00:00.000Z",
  updated_at: "2026-06-29T10:00:00.000Z",
  archived_at: null,
  gifts: [
    {
      id: "gift-preview-1",
      wishlist_id: "preview-wishlist",
      name: "Fone Bluetooth ANC",
      description: "Modelo premium para trabalho e viagem.",
      store_url: "https://www.mercadolivre.com.br/fone-bluetooth-anc",
      image_url: previewCover("Fone Bluetooth ANC", "#F6DAD2", "#DE7762"),
      estimated_price: 399.9,
      currency: "BRL",
      priority: "must_have",
      status: "available",
      purchase_type: "individual",
      funding_goal_amount: null,
      funding_currency: "BRL",
      funding_received_amount: 0,
      funding_status: "not_started",
      price_tracking_enabled: true,
      current_price: 379.9,
      original_price: 449.9,
      lowest_price: 359.9,
      highest_price: 459.9,
      average_price: 398.3,
      target_price: 359.9,
      last_checked_at: "2026-06-29T08:30:00.000Z",
      price_change_percentage: -4.5,
      price_trend: "down",
      opportunity_score: 88,
      recommendation_status: "good_price",
      price_radar_priority: "must_buy",
      price_alert_preferences: ["any_drop", "below_target"],
      price_history: [
        { checked_at: "2026-06-20T08:30:00.000Z", price: 449.9, currency: "BRL", store_name: "Mercado Livre", source_url: null },
        { checked_at: "2026-06-24T08:30:00.000Z", price: 409.9, currency: "BRL", store_name: "Mercado Livre", source_url: null },
        { checked_at: "2026-06-29T08:30:00.000Z", price: 379.9, currency: "BRL", store_name: "Mercado Livre", source_url: null },
      ],
      price_offers: [],
      source_sponsored_item_id: null,
      deleted_at: null,
      created_at: "2026-06-20T08:30:00.000Z",
      updated_at: "2026-06-29T08:30:00.000Z",
    } satisfies GiftRecord,
    {
      id: "gift-preview-2",
      wishlist_id: "preview-wishlist",
      name: "Abajur Minimalista",
      description: "Peça decorativa para o quarto.",
      store_url: "https://www.magazineluiza.com.br/abajur-minimalista",
      image_url: previewCover("Abajur Minimalista", "#DCD2FF", "#A7C7E7"),
      estimated_price: 219.9,
      currency: "BRL",
      priority: "nice_to_have",
      status: "reserved",
      purchase_type: "individual",
      funding_goal_amount: null,
      funding_currency: "BRL",
      funding_received_amount: 0,
      funding_status: "not_started",
      price_tracking_enabled: true,
      current_price: 219.9,
      original_price: 219.9,
      lowest_price: null,
      highest_price: null,
      average_price: null,
      target_price: 199.9,
      last_checked_at: "2026-06-29T09:15:00.000Z",
      price_change_percentage: null,
      price_trend: "stable",
      opportunity_score: 52,
      recommendation_status: "normal_price",
      price_radar_priority: "maybe_buy",
      price_alert_preferences: ["below_target"],
      price_history: [
        { checked_at: "2026-06-29T09:15:00.000Z", price: 219.9, currency: "BRL", store_name: "Magalu", source_url: null },
      ],
      price_offers: [],
      source_sponsored_item_id: null,
      deleted_at: null,
      created_at: "2026-06-29T09:00:00.000Z",
      updated_at: "2026-06-29T09:15:00.000Z",
    } satisfies GiftRecord,
  ],
};

export function PriceRadarPreviewPage() {
  const { t, locale } = useTranslation();
  const [showSecondItem, setShowSecondItem] = useState(false);
  const previewGifts = showSecondItem ? previewWishlist.gifts : previewWishlist.gifts.slice(0, 1);
  const trackedGifts = previewGifts.filter((gift) => gift.price_tracking_enabled);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-2">
        <p className="text-sm font-semibold text-primary">{t("priceRadar.eyebrow")}</p>
        <h1 className="text-3xl font-bold text-warm-900">Preview do Radar de Preços</h1>
        <p className="max-w-3xl text-sm leading-6 text-warm-600">
          Página de desenvolvimento para validar a densidade do radar, o estado sem histórico e a leitura do preço
          atual.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <SecondaryButton type="button" onClick={() => setShowSecondItem((current) => !current)}>
            {showSecondItem ? "Ver estado com 1 item" : "Ver estado com 2 itens"}
          </SecondaryButton>
        </div>
      </div>

      <PriceRadarBoard
        wishlist={{ ...previewWishlist, gifts: previewGifts }}
        trackedGifts={trackedGifts}
        radarOpportunities={trackedGifts.filter((gift) => gift.recommendation_status === "good_price")}
        potentialSavings={trackedGifts.reduce((total, gift) => total + Math.max((gift.current_price ?? 0) - (gift.target_price ?? 0), 0), 0)}
        canUseRadar
        fallbackImageUrl="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80"
        locale={locale}
        t={t}
        onToggleGiftRadar={() => undefined}
        onOpenGiftEditor={() => undefined}
      />
    </div>
  );
}
