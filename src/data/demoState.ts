import type {
  AdminAuditLogRecord,
  AffiliateMerchantRecord,
  AffiliateStrategy,
  AffiliateLinkRecord,
  GiftContributionRecord,
  GiftPriceHistoryEntry,
  GiftPriceOffer,
  GiftPurchaseType,
  GiftRecord,
  GiftStatus,
  Locale,
  Profile,
  ReservationRecord,
  SponsoredItemLocale,
  SponsoredItemRecord,
  SponsoredItemStatus,
  WishlistThemePreset,
  WishlistType,
  WishlistVisibility,
  WishlistWithGifts,
  PriceAlertPreference,
  PriceRadarPriority,
  PriceTrend,
  PriceRecommendationStatus,
  PriceRadarTier,
} from "../types/domain";
import { getPriceRecommendation, getPriceTrend } from "../lib/priceRadar";

type DemoSessionUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
};

type DemoSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: "bearer";
  user: DemoSessionUser;
} & Record<string, unknown>;

type DemoWishlistSeed = {
  id: string;
  shareId: string;
  title: string;
  occasion: string;
  type: WishlistType;
  eventDate: string;
  message: string;
  coverImageUrl: string;
  visibility: WishlistVisibility;
  themePreset: WishlistThemePreset;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  useCustomTheme: boolean;
  isPriceRadarEnabled: boolean;
  createdAt: string;
  gifts: DemoGiftSeed[];
};

type DemoGiftSeed = {
  id: string;
  name: string;
  description?: string;
  storeName: string;
  storeUrl: string;
  imageUrl: string;
  estimatedPrice: number;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  targetPrice: number;
  currency: string;
  priority: GiftRecord["priority"];
  status: GiftStatus;
  purchaseType: GiftPurchaseType;
  fundingGoalAmount?: number;
  fundingCurrency?: string;
  fundingReceivedAmount?: number;
  priceTrackingEnabled: boolean;
  priceRadarPriority: PriceRadarPriority;
  priceAlertPreferences: PriceAlertPreference[];
  priceHistory: GiftPriceHistoryEntry[];
  priceOffers: GiftPriceOffer[];
  sourceSponsoredItemId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoNotificationRecord = {
  id: string;
  title: string;
  body: string;
  kind: "price_drop" | "stock" | "alert" | "activity";
  created_at: string;
  read_at: string | null;
};

type DemoAlertRecord = {
  id: string;
  title: string;
  body: string;
  icon: string;
  created_at: string;
};

type DemoActivityRecord = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type DemoState = {
  session: DemoSession;
  profile: Profile;
  wishlists: WishlistWithGifts[];
  affiliateMerchants: AffiliateMerchantRecord[];
  sponsoredItems: SponsoredItemRecord[];
  adminAuditLogs: AdminAuditLogRecord[];
  reservations: ReservationRecord[];
  contributions: GiftContributionRecord[];
  affiliateLinks: AffiliateLinkRecord[];
  notifications: DemoNotificationRecord[];
  alerts: DemoAlertRecord[];
  feed: DemoActivityRecord[];
};

const STORAGE_KEY = "wishly-demo-state-v1";
const DEMO_USER_ID = "demo-auth-user-gabriel";
const DEMO_PROFILE_ID = "demo-profile-gabriel";
const DEMO_EMAIL = "gabriel@wishlyapp.com.br";
const DEMO_NAME = "Gabriel";
const DEMO_LOCALE: Locale = "pt-BR";
const DEMO_PRICE_RADAR_TIER: PriceRadarTier = "premium";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(offsetMinutes = 0) {
  return new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();
}

function dateAt(day: string, time = "09:30:00.000Z") {
  return `${day}T${time}`;
}

function uuid(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function buildSession(): DemoSession {
  return {
    access_token: "demo-access-token",
    refresh_token: "demo-refresh-token",
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: "bearer",
    user: {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      user_metadata: {
        name: DEMO_NAME,
        locale: DEMO_LOCALE,
      },
    },
  };
}

function buildProfile(): Profile {
  return {
    id: DEMO_PROFILE_ID,
    auth_user_id: DEMO_USER_ID,
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    avatar_url:
      "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' rx='128' fill='%23DE7762'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-size='112' font-weight='700' fill='white'%3EG%3C/text%3E%3C/svg%3E",
    locale: DEMO_LOCALE,
    price_radar_tier: DEMO_PRICE_RADAR_TIER,
    created_at: "2025-10-18T14:20:00.000Z",
    updated_at: "2026-06-28T18:15:00.000Z",
  };
}

function historyEntry(
  checkedAt: string,
  price: number,
  storeName: string,
  sourceUrl: string,
): GiftPriceHistoryEntry {
  return {
    checked_at: checkedAt,
    price,
    currency: "BRL",
    store_name: storeName,
    source_url: sourceUrl,
  };
}

function offer(storeName: string, price: number, url: string, availability = "Em estoque") {
  return {
    store_name: storeName,
    price,
    url,
    availability,
    last_checked_at: nowIso(180 - Math.round(price / 100)),
  } satisfies GiftPriceOffer;
}

function deriveRecommendation(
  currentPrice: number,
  averagePrice: number,
  lowestPrice: number,
  highestPrice: number,
  lastPrice: number,
  priceHistory: GiftPriceHistoryEntry[],
  targetPrice: number,
): {
  priceTrend: PriceTrend;
  recommendationStatus: PriceRecommendationStatus;
} {
  const recommendation = getPriceRecommendation(
    {
      currentPrice,
      averagePrice,
      lowestPrice,
      highestPrice,
      lastPrice,
      priceHistory,
      targetPrice,
      currency: "BRL",
    },
    DEMO_LOCALE,
  );

  return {
    priceTrend: getPriceTrend(currentPrice, lastPrice, averagePrice, priceHistory),
    recommendationStatus: recommendation.status,
  };
}

function buildGift(seed: DemoGiftSeed, wishlistId: string): GiftRecord {
  const history = seed.priceHistory.slice().sort((left, right) => left.checked_at.localeCompare(right.checked_at));
  const currentPrice = seed.currentPrice;
  const averagePrice = Math.round(
    history.reduce((total, entry) => total + entry.price, 0) / Math.max(history.length, 1),
  );
  const lastPrice = history.at(-2)?.price ?? history.at(-1)?.price ?? currentPrice;
  const derived = deriveRecommendation(
    currentPrice,
    averagePrice,
    seed.lowestPrice,
    seed.highestPrice,
    lastPrice,
    history,
    seed.targetPrice,
  );

  return {
    id: seed.id,
    wishlist_id: wishlistId,
    name: seed.name,
    description: seed.description || null,
    store_url: seed.storeUrl,
    image_url: seed.imageUrl,
    estimated_price: seed.estimatedPrice,
    currency: seed.currency,
    priority: seed.priority,
    status: seed.status,
    purchase_type: seed.purchaseType,
    funding_goal_amount: seed.fundingGoalAmount ?? null,
    funding_currency: seed.fundingCurrency || seed.currency,
    funding_received_amount: seed.fundingReceivedAmount ?? 0,
    funding_status:
      seed.purchaseType === "collective"
        ? seed.fundingReceivedAmount && seed.fundingGoalAmount && seed.fundingReceivedAmount >= seed.fundingGoalAmount
          ? "funded"
          : seed.fundingReceivedAmount && seed.fundingReceivedAmount > 0
            ? "active"
            : "not_started"
        : "not_started",
    price_tracking_enabled: seed.priceTrackingEnabled,
    current_price: seed.currentPrice,
    original_price: seed.highestPrice,
    lowest_price: seed.lowestPrice,
    highest_price: seed.highestPrice,
    average_price: averagePrice,
    target_price: seed.targetPrice,
    last_checked_at: history.at(-1)?.checked_at ?? seed.updatedAt,
    price_change_percentage:
      lastPrice > 0 ? Number((((currentPrice - lastPrice) / lastPrice) * 100).toFixed(1)) : null,
    price_trend: derived.priceTrend,
    opportunity_score:
      derived.recommendationStatus === "buy_now"
        ? 96
        : derived.recommendationStatus === "good_price"
          ? 84
          : derived.recommendationStatus === "normal_price"
            ? 68
            : derived.recommendationStatus === "wait"
              ? 38
              : 20,
    recommendation_status: derived.recommendationStatus,
    price_radar_priority: seed.priceRadarPriority,
    price_alert_preferences: seed.priceAlertPreferences,
    price_history: history,
    price_offers: seed.priceOffers,
    source_sponsored_item_id: seed.sourceSponsoredItemId ?? null,
    deleted_at: null,
    created_at: seed.createdAt,
    updated_at: seed.updatedAt,
  };
}

function buildWishlist(seed: DemoWishlistSeed): WishlistWithGifts {
  const gifts = seed.gifts.map((gift) => buildGift(gift, seed.id));

  return {
    id: seed.id,
    owner_id: DEMO_PROFILE_ID,
    type: seed.type,
    title: seed.title,
    occasion: seed.occasion,
    event_date: seed.eventDate,
    message: seed.message,
    cover_image_url: seed.coverImageUrl,
    theme_color: null,
    theme_preset: seed.themePreset,
    theme_primary_color: seed.useCustomTheme ? seed.themePrimaryColor : null,
    theme_secondary_color: seed.useCustomTheme ? seed.themeSecondaryColor : null,
    use_custom_theme: seed.useCustomTheme,
    is_price_radar_enabled: seed.isPriceRadarEnabled,
    slug: null,
    visibility: seed.visibility,
    share_id: seed.shareId,
    locale: DEMO_LOCALE,
    rsvp_enabled: false,
    event_location: null,
    event_time: null,
    max_guests: null,
    created_at: seed.createdAt,
    updated_at: seed.createdAt,
    archived_at: null,
    gifts,
  };
}

function buildMerchants(): AffiliateMerchantRecord[] {
  return [
    {
      id: "merchant-mercado-livre",
      name: "Mercado Livre",
      domain: "mercadolivre.com.br",
      status: "active",
      strategy: "deeplink_template",
      deeplink_template: "https://www.mercadolivre.com.br/%s",
      tracking_param_name: "matt_tool",
      tracking_param_value_env_key: "MELI_AFFILIATE_ID",
      notes: "Primary marketplace for high-intent electronics and home goods.",
      created_at: "2025-10-20T12:00:00.000Z",
      updated_at: "2026-06-26T11:00:00.000Z",
    },
    {
      id: "merchant-amazon",
      name: "Amazon Brasil",
      domain: "amazon.com.br",
      status: "active",
      strategy: "query_param",
      deeplink_template: null,
      tracking_param_name: "tag",
      tracking_param_value_env_key: "AMAZON_ASSOCIATE_TAG",
      notes: "Fastest fallback coverage for tech, books, and household items.",
      created_at: "2025-10-21T12:00:00.000Z",
      updated_at: "2026-06-27T09:40:00.000Z",
    },
    {
      id: "merchant-kabum",
      name: "KaBuM!",
      domain: "kabum.com.br",
      status: "active",
      strategy: "query_param",
      deeplink_template: null,
      tracking_param_name: "utm_source",
      tracking_param_value_env_key: "KABUM_AFFILIATE_SOURCE",
      notes: "Best for PC upgrades and component-heavy wishlists.",
      created_at: "2025-11-02T12:00:00.000Z",
      updated_at: "2026-06-25T16:20:00.000Z",
    },
    {
      id: "merchant-magalu",
      name: "Magalu",
      domain: "magazineluiza.com.br",
      status: "active",
      strategy: "manual",
      deeplink_template: null,
      tracking_param_name: null,
      tracking_param_value_env_key: null,
      notes: "Good coverage for appliances and household items.",
      created_at: "2025-11-10T12:00:00.000Z",
      updated_at: "2026-06-24T08:30:00.000Z",
    },
    {
      id: "merchant-fast-shop",
      name: "Fast Shop",
      domain: "fastshop.com.br",
      status: "manual",
      strategy: "passthrough",
      deeplink_template: null,
      tracking_param_name: null,
      tracking_param_value_env_key: null,
      notes: "Premium electronics and appliances with cleaner branding.",
      created_at: "2025-11-18T12:00:00.000Z",
      updated_at: "2026-06-22T14:00:00.000Z",
    },
  ];
}

function buildSponsoredItems(): SponsoredItemRecord[] {
  return [
    {
      id: "sponsored-airfryer",
      title: "Philips Airfryer Série 5000",
      description: "Quick dinner ideas for a home setup wishlist.",
      image_url:
        "https://images.unsplash.com/photo-1608039525955-0b1e5fd0b4b3?auto=format&fit=crop&w=900&q=80",
      destination_url: "https://www.philips.com.br/c-p/HD9202_90/airfryer",
      merchant_id: "merchant-magalu",
      category: "home",
      occasion: "housewarming",
      price: 629.9,
      currency: "BRL",
      locale: "pt-BR",
      status: "active",
      priority: 95,
      starts_at: "2026-06-12T00:00:00.000Z",
      ends_at: "2026-07-25T23:59:59.000Z",
      created_at: "2026-06-01T10:00:00.000Z",
      updated_at: "2026-06-26T12:00:00.000Z",
    },
    {
      id: "sponsored-ps5",
      title: "PlayStation 5 Slim",
      description: "High-intent gaming item with strong performance.",
      image_url:
        "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80",
      destination_url: "https://www.playstation.com/pt-br/ps5/",
      merchant_id: "merchant-amazon",
      category: "gaming",
      occasion: "birthday",
      price: 3499.9,
      currency: "BRL",
      locale: "all",
      status: "active",
      priority: 90,
      starts_at: "2026-06-10T00:00:00.000Z",
      ends_at: "2026-08-15T23:59:59.000Z",
      created_at: "2026-05-20T10:00:00.000Z",
      updated_at: "2026-06-24T12:30:00.000Z",
    },
    {
      id: "sponsored-monitor",
      title: "Monitor LG UltraGear 27\"",
      description: "A frequent piece on Gabriel's upgrade shortlist.",
      image_url:
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80",
      destination_url: "https://www.lg.com/br/monitores",
      merchant_id: "merchant-kabum",
      category: "tech",
      occasion: "wishlist",
      price: 1899.9,
      currency: "BRL",
      locale: "pt-BR",
      status: "active",
      priority: 84,
      starts_at: "2026-05-18T00:00:00.000Z",
      ends_at: "2026-07-15T23:59:59.000Z",
      created_at: "2026-05-18T10:00:00.000Z",
      updated_at: "2026-06-20T13:10:00.000Z",
    },
    {
      id: "sponsored-nespresso",
      title: "Cafeteira Nespresso Vertuo",
      description: "Housewarming favorite with an easy conversion path.",
      image_url:
        "https://images.unsplash.com/photo-1515825295580-5bb9e9a1a54f?auto=format&fit=crop&w=900&q=80",
      destination_url: "https://www.nespresso.com/br/pt/",
      merchant_id: "merchant-fast-shop",
      category: "home",
      occasion: "newHome",
      price: 749.9,
      currency: "BRL",
      locale: "all",
      status: "paused",
      priority: 72,
      starts_at: "2026-04-28T00:00:00.000Z",
      ends_at: "2026-07-01T23:59:59.000Z",
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: "2026-06-10T12:00:00.000Z",
    },
    {
      id: "sponsored-switch",
      title: "Nintendo Switch 2",
      description: "A highly watched wish item with strong social pull.",
      image_url:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
      destination_url: "https://www.nintendo.com/pt-br/store/",
      merchant_id: "merchant-mercado-livre",
      category: "gaming",
      occasion: "birthday",
      price: 4299.9,
      currency: "BRL",
      locale: "pt-BR",
      status: "active",
      priority: 98,
      starts_at: "2026-06-01T00:00:00.000Z",
      ends_at: "2026-08-30T23:59:59.000Z",
      created_at: "2026-06-01T09:00:00.000Z",
      updated_at: "2026-06-27T19:40:00.000Z",
    },
  ];
}

function buildNotifications(): DemoNotificationRecord[] {
  return [
    {
      id: "notif-1",
      title: "Seu iPhone 17 Pro caiu R$ 280",
      body: "O radar detectou queda na Amazon Brasil e marcou como oportunidade boa.",
      kind: "price_drop",
      created_at: "2026-06-29T07:40:00.000Z",
      read_at: null,
    },
    {
      id: "notif-2",
      title: "O PlayStation 5 Slim atingiu o preço desejado",
      body: "Acompanhamos a queda para R$ 3.459 no Mercado Livre.",
      kind: "price_drop",
      created_at: "2026-06-28T18:14:00.000Z",
      read_at: null,
    },
    {
      id: "notif-3",
      title: "Encontramos um cupom de R$ 120",
      body: "Cupom aplicado em um item da lista Tecnologia.",
      kind: "alert",
      created_at: "2026-06-28T11:05:00.000Z",
      read_at: null,
    },
    {
      id: "notif-4",
      title: "RTX 6080 atingiu o menor preço histórico",
      body: "O monitoramento mostrou a primeira faixa abaixo de R$ 9.000.",
      kind: "price_drop",
      created_at: "2026-06-27T16:20:00.000Z",
      read_at: "2026-06-28T09:10:00.000Z",
    },
    {
      id: "notif-5",
      title: "Seu produto voltou ao estoque",
      body: "O Kindle Paperwhite voltou a aparecer com frete previsível.",
      kind: "stock",
      created_at: "2026-06-27T08:55:00.000Z",
      read_at: "2026-06-27T09:10:00.000Z",
    },
    {
      id: "notif-6",
      title: "Acompanhe o preço do Apple Watch Ultra",
      body: "O item está em queda gradual há três semanas.",
      kind: "activity",
      created_at: "2026-06-26T13:45:00.000Z",
      read_at: "2026-06-26T14:10:00.000Z",
    },
    {
      id: "notif-7",
      title: "Novo histórico disponível",
      body: "Atualizamos o gráfico do Samsung OLED com mais duas leituras.",
      kind: "activity",
      created_at: "2026-06-26T08:05:00.000Z",
      read_at: "2026-06-26T08:15:00.000Z",
    },
    {
      id: "notif-8",
      title: "Sua lista Black Friday ganhou atenção",
      body: "Quatro produtos dessa lista voltaram a ficar abaixo da média.",
      kind: "alert",
      created_at: "2026-06-25T20:25:00.000Z",
      read_at: "2026-06-25T20:40:00.000Z",
    },
  ];
}

function buildAlerts(): DemoAlertRecord[] {
  return [
    {
      id: "alert-1",
      title: "🎉 Novo menor preço",
      body: "Nintendo Switch 2 caiu 9% em relação ao último registro.",
      icon: "sparkle",
      created_at: "2026-06-29T07:25:00.000Z",
    },
    {
      id: "alert-2",
      title: "⬇ Produto caiu 14%",
      body: "O Echo Dot voltou para a faixa promocional da Amazon.",
      icon: "arrow-down",
      created_at: "2026-06-28T18:40:00.000Z",
    },
    {
      id: "alert-3",
      title: "🔥 Promoção por tempo limitado",
      body: "KaBuM! sinalizou desconto no SSD Samsung 990 Pro.",
      icon: "flame",
      created_at: "2026-06-28T14:00:00.000Z",
    },
    {
      id: "alert-4",
      title: "📈 Produto voltou a subir",
      body: "O Galaxy S26 recuperou parte do preço após a última ação.",
      icon: "arrow-up",
      created_at: "2026-06-28T08:30:00.000Z",
    },
    {
      id: "alert-5",
      title: "⚠ Estoque quase acabando",
      body: "A TV Samsung OLED aparece com poucas unidades em dois varejistas.",
      icon: "warning",
      created_at: "2026-06-27T19:20:00.000Z",
    },
    {
      id: "alert-6",
      title: "🏷 Cupom encontrado",
      body: "Encontramos um desconto adicional na Cafeteira Nespresso.",
      icon: "tag",
      created_at: "2026-06-27T10:05:00.000Z",
    },
    {
      id: "alert-7",
      title: "🎉 Novo menor preço",
      body: "O Kindle Paperwhite atingiu a menor marca dos últimos 90 dias.",
      icon: "sparkle",
      created_at: "2026-06-26T15:20:00.000Z",
    },
    {
      id: "alert-8",
      title: "⬇ Produto caiu 14%",
      body: "A furadeira Bosch caiu em duas lojas no mesmo dia.",
      icon: "arrow-down",
      created_at: "2026-06-26T10:40:00.000Z",
    },
    {
      id: "alert-9",
      title: "🔥 Promoção por tempo limitado",
      body: "Cadeira gamer com cupom de fim de semana.",
      icon: "flame",
      created_at: "2026-06-25T21:10:00.000Z",
    },
    {
      id: "alert-10",
      title: "📈 Produto voltou a subir",
      body: "O MacBook Air retomou a curva de alta após o estoque secar.",
      icon: "arrow-up",
      created_at: "2026-06-25T16:55:00.000Z",
    },
    {
      id: "alert-11",
      title: "⚠ Estoque quase acabando",
      body: "O Apple Watch Ultra aparece com oferta limitada na Fast Shop.",
      icon: "warning",
      created_at: "2026-06-25T09:30:00.000Z",
    },
    {
      id: "alert-12",
      title: "🏷 Cupom encontrado",
      body: "Aperfeiçoamos o rastreio do monitor LG UltraGear.",
      icon: "tag",
      created_at: "2026-06-24T19:15:00.000Z",
    },
    {
      id: "alert-13",
      title: "🎉 Novo menor preço",
      body: "O RTX 6080 bateu uma nova mínima nesta semana.",
      icon: "sparkle",
      created_at: "2026-06-24T08:30:00.000Z",
    },
    {
      id: "alert-14",
      title: "⬇ Produto caiu 14%",
      body: "A cafeteira passou a faixa de R$ 700 em dois varejistas.",
      icon: "arrow-down",
      created_at: "2026-06-23T18:45:00.000Z",
    },
    {
      id: "alert-15",
      title: "🔥 Promoção por tempo limitado",
      body: "Casa Nova ganhou um desconto útil na lava e seca LG.",
      icon: "flame",
      created_at: "2026-06-23T11:05:00.000Z",
    },
  ];
}

function buildFeed(): DemoActivityRecord[] {
  return [
    {
      id: "feed-1",
      title: "Você adicionou Nintendo Switch 2",
      body: "Lista Tecnologia · há 12 minutos",
      created_at: "2026-06-29T07:55:00.000Z",
    },
    {
      id: "feed-2",
      title: "Novo alerta recebido",
      body: "RTX 6080 atingiu menor preço histórico.",
      created_at: "2026-06-29T07:25:00.000Z",
    },
    {
      id: "feed-3",
      title: "Cupom aplicado",
      body: "Cafeteira Nespresso recebeu R$ 80 de desconto.",
      created_at: "2026-06-28T18:20:00.000Z",
    },
    {
      id: "feed-4",
      title: "Preço caiu",
      body: "Apple Watch Ultra começou uma queda gradual.",
      created_at: "2026-06-28T12:35:00.000Z",
    },
    {
      id: "feed-5",
      title: "Novo histórico disponível",
      body: "TV Samsung OLED recebeu duas leituras novas hoje.",
      created_at: "2026-06-27T19:30:00.000Z",
    },
    {
      id: "feed-6",
      title: "Você atualizou a lista Casa Nova",
      body: "Incluiu um novo filtro de estoque e reorganizou os itens.",
      created_at: "2026-06-26T16:55:00.000Z",
    },
    {
      id: "feed-7",
      title: "Lista reservada",
      body: "O presente de Sofia foi reservado por Ana Paula.",
      created_at: "2026-06-25T20:10:00.000Z",
    },
    {
      id: "feed-8",
      title: "Você salvou uma nova meta",
      body: "iPhone 17 Pro agora alerta abaixo de R$ 8.850.",
      created_at: "2026-06-25T08:45:00.000Z",
    },
  ];
}

function buildAuditLogs(): AdminAuditLogRecord[] {
  return [
    {
      id: "audit-1",
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "wishlist.created",
      entity_type: "wishlist",
      entity_id: "upgrade-pc",
      before_data: null,
      after_data: { title: "Upgrade PC" },
      created_at: "2026-06-12T10:00:00.000Z",
    },
    {
      id: "audit-2",
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "gift.updated",
      entity_type: "gift",
      entity_id: "gift-iphone-17-pro",
      before_data: { status: "available" },
      after_data: { status: "reserved" },
      created_at: "2026-06-23T19:25:00.000Z",
    },
    {
      id: "audit-3",
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "affiliate_merchant.updated",
      entity_type: "affiliate_merchant",
      entity_id: "merchant-amazon",
      before_data: { strategy: "manual" },
      after_data: { strategy: "query_param" },
      created_at: "2026-06-20T08:20:00.000Z",
    },
    {
      id: "audit-4",
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "sponsored_item.created",
      entity_type: "sponsored_item",
      entity_id: "sponsored-switch",
      before_data: null,
      after_data: { title: "Nintendo Switch 2" },
      created_at: "2026-06-18T12:00:00.000Z",
    },
  ];
}

const wishlistSeeds: DemoWishlistSeed[] = [
  {
    id: "upgrade-pc",
    shareId: "tech-upgrade",
    title: "Upgrade PC",
    occasion: "wishlist",
    type: "wishlist",
    eventDate: "2026-08-18",
    message: "Minha lista principal de upgrades para acompanhar preço e comprar na hora certa.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=80",
    visibility: "private",
    themePreset: "minimal",
    themePrimaryColor: "#241815",
    themeSecondaryColor: "#EFE4DA",
    useCustomTheme: false,
    isPriceRadarEnabled: true,
    createdAt: "2025-10-18T14:20:00.000Z",
    gifts: [
      {
        id: "gift-iphone-17-pro",
        name: "iPhone 17 Pro",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=iPhone+17+Pro",
        imageUrl:
          "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 9499,
        currentPrice: 8799,
        lowestPrice: 8599,
        highestPrice: 9799,
        targetPrice: 8790,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-05-02"), 9499, "Magazine Luiza", "https://www.magazineluiza.com.br/iphone-17-pro"),
          historyEntry(dateAt("2026-05-18"), 9249, "Amazon Brasil", "https://www.amazon.com.br/s?k=iPhone+17+Pro"),
          historyEntry(dateAt("2026-06-04"), 8999, "Mercado Livre", "https://www.mercadolivre.com.br/iphone-17-pro"),
          historyEntry(dateAt("2026-06-18"), 8929, "KaBuM!", "https://www.kabum.com.br/busca/iphone-17-pro"),
          historyEntry(dateAt("2026-06-27"), 8799, "Amazon Brasil", "https://www.amazon.com.br/s?k=iPhone+17+Pro"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 8799, "https://www.amazon.com.br/s?k=iPhone+17+Pro"),
          offer("Mercado Livre", 8859, "https://www.mercadolivre.com.br/iphone-17-pro"),
          offer("Magalu", 8999, "https://www.magazineluiza.com.br/iphone-17-pro"),
        ],
        createdAt: "2026-04-29T10:00:00.000Z",
        updatedAt: "2026-06-27T12:00:00.000Z",
      },
      {
        id: "gift-ps5-slim",
        name: "PlayStation 5 Slim",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/playstation-5-slim",
        imageUrl:
          "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 3699,
        currentPrice: 3459,
        lowestPrice: 3399,
        highestPrice: 3899,
        targetPrice: 3499,
        currency: "BRL",
        priority: "must_have",
        status: "reserved",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["below_target", "back_to_low"],
        priceHistory: [
          historyEntry(dateAt("2026-03-08"), 3799, "Mercado Livre", "https://www.mercadolivre.com.br/playstation-5-slim"),
          historyEntry(dateAt("2026-04-15"), 3699, "Amazon Brasil", "https://www.amazon.com.br/ps5-slim"),
          historyEntry(dateAt("2026-05-20"), 3599, "KaBuM!", "https://www.kabum.com.br/busca/ps5-slim"),
          historyEntry(dateAt("2026-06-11"), 3499, "Magazine Luiza", "https://www.magazineluiza.com.br/playstation-5-slim"),
          historyEntry(dateAt("2026-06-28"), 3459, "Mercado Livre", "https://www.mercadolivre.com.br/playstation-5-slim"),
        ],
        priceOffers: [
          offer("Mercado Livre", 3459, "https://www.mercadolivre.com.br/playstation-5-slim"),
          offer("Amazon Brasil", 3499, "https://www.amazon.com.br/ps5-slim"),
          offer("KaBuM!", 3529, "https://www.kabum.com.br/busca/ps5-slim"),
        ],
        createdAt: "2026-04-10T09:00:00.000Z",
        updatedAt: "2026-06-28T18:14:00.000Z",
      },
      {
        id: "gift-switch-2",
        name: "Nintendo Switch 2",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/nintendo-switch-2",
        imageUrl:
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 4499,
        currentPrice: 4299,
        lowestPrice: 4199,
        highestPrice: 4699,
        targetPrice: 4299,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "maybe_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-05-18"), 4699, "KaBuM!", "https://www.kabum.com.br/busca/nintendo-switch-2"),
          historyEntry(dateAt("2026-05-28"), 4599, "Mercado Livre", "https://www.mercadolivre.com.br/nintendo-switch-2"),
          historyEntry(dateAt("2026-06-09"), 4499, "Amazon Brasil", "https://www.amazon.com.br/s?k=Nintendo+Switch+2"),
          historyEntry(dateAt("2026-06-18"), 4399, "Magazine Luiza", "https://www.magazineluiza.com.br/nintendo-switch-2"),
          historyEntry(dateAt("2026-06-29"), 4299, "KaBuM!", "https://www.kabum.com.br/busca/nintendo-switch-2"),
        ],
        priceOffers: [
          offer("KaBuM!", 4299, "https://www.kabum.com.br/busca/nintendo-switch-2"),
          offer("Amazon Brasil", 4349, "https://www.amazon.com.br/s?k=Nintendo+Switch+2"),
          offer("Mercado Livre", 4399, "https://www.mercadolivre.com.br/nintendo-switch-2"),
        ],
        createdAt: "2026-05-18T08:30:00.000Z",
        updatedAt: "2026-06-29T07:55:00.000Z",
      },
      {
        id: "gift-apple-watch-ultra",
        name: "Apple Watch Ultra",
        storeName: "Fast Shop",
        storeUrl: "https://www.fastshop.com.br/apple-watch-ultra",
        imageUrl:
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 6999,
        currentPrice: 6599,
        lowestPrice: 6499,
        highestPrice: 7299,
        targetPrice: 6490,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-04-05"), 7299, "Fast Shop", "https://www.fastshop.com.br/apple-watch-ultra"),
          historyEntry(dateAt("2026-05-01"), 7099, "Amazon Brasil", "https://www.amazon.com.br/s?k=Apple+Watch+Ultra"),
          historyEntry(dateAt("2026-05-24"), 6899, "Mercado Livre", "https://www.mercadolivre.com.br/apple-watch-ultra"),
          historyEntry(dateAt("2026-06-12"), 6699, "Magazine Luiza", "https://www.magazineluiza.com.br/apple-watch-ultra"),
          historyEntry(dateAt("2026-06-28"), 6599, "Fast Shop", "https://www.fastshop.com.br/apple-watch-ultra"),
        ],
        priceOffers: [
          offer("Fast Shop", 6599, "https://www.fastshop.com.br/apple-watch-ultra"),
          offer("Amazon Brasil", 6649, "https://www.amazon.com.br/s?k=Apple+Watch+Ultra"),
          offer("Mercado Livre", 6699, "https://www.mercadolivre.com.br/apple-watch-ultra"),
        ],
        createdAt: "2026-04-05T11:15:00.000Z",
        updatedAt: "2026-06-28T09:50:00.000Z",
      },
      {
        id: "gift-galaxy-s26-tech",
        name: "Galaxy S26",
        storeName: "Samsung",
        storeUrl: "https://www.samsung.com/br/smartphones/galaxy-s26/",
        imageUrl:
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 6299,
        currentPrice: 6099,
        lowestPrice: 5899,
        highestPrice: 6499,
        targetPrice: 5999,
        currency: "BRL",
        priority: "nice_to_have",
        status: "purchased",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "maybe_buy",
        priceAlertPreferences: ["below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-05-14"), 6499, "Samsung", "https://www.samsung.com/br/smartphones/galaxy-s26/"),
          historyEntry(dateAt("2026-05-29"), 6299, "Amazon Brasil", "https://www.amazon.com.br/s?k=Galaxy+S26"),
          historyEntry(dateAt("2026-06-10"), 6199, "Mercado Livre", "https://www.mercadolivre.com.br/galaxy-s26"),
          historyEntry(dateAt("2026-06-20"), 6149, "KaBuM!", "https://www.kabum.com.br/busca/galaxy-s26"),
          historyEntry(dateAt("2026-06-28"), 6099, "Samsung", "https://www.samsung.com/br/smartphones/galaxy-s26/"),
        ],
        priceOffers: [
          offer("Samsung", 6099, "https://www.samsung.com/br/smartphones/galaxy-s26/"),
          offer("Amazon Brasil", 6149, "https://www.amazon.com.br/s?k=Galaxy+S26"),
          offer("Mercado Livre", 6199, "https://www.mercadolivre.com.br/galaxy-s26"),
        ],
        createdAt: "2026-04-19T09:10:00.000Z",
        updatedAt: "2026-06-28T11:15:00.000Z",
      },
    ],
  },
  {
    id: "laura-baby-shower",
    shareId: "baby-laura",
    title: "Laura's Baby Shower",
    occasion: "babyShower",
    type: "event",
    eventDate: "2026-09-12",
    message: "Uma lista carinhosa para as primeiras semanas em casa.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1400&q=80",
    visibility: "public_link",
    themePreset: "baby",
    themePrimaryColor: "#A7C7E7",
    themeSecondaryColor: "#F6DAD2",
    useCustomTheme: false,
    isPriceRadarEnabled: false,
    createdAt: "2026-02-02T14:30:00.000Z",
    gifts: [
      {
        id: "gift-baby-blanket",
        name: "Baby Blanket",
        storeName: "Nest & Co.",
        storeUrl: "https://www.amazon.com.br/s?k=baby+blanket",
        imageUrl:
          "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 129,
        currentPrice: 118,
        lowestPrice: 109,
        highestPrice: 139,
        targetPrice: 119,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-03"), 129, "Amazon Brasil", "https://www.amazon.com.br/s?k=baby+blanket"),
          historyEntry(dateAt("2026-05-29"), 123, "Mercado Livre", "https://www.mercadolivre.com.br/baby-blanket"),
          historyEntry(dateAt("2026-06-12"), 118, "Nest & Co.", "https://www.amazon.com.br/s?k=baby+blanket"),
        ],
        priceOffers: [
          offer("Nest & Co.", 118, "https://www.amazon.com.br/s?k=baby+blanket"),
          offer("Mercado Livre", 121, "https://www.mercadolivre.com.br/baby-blanket"),
        ],
        createdAt: "2026-02-05T10:00:00.000Z",
        updatedAt: "2026-06-12T12:00:00.000Z",
      },
      {
        id: "gift-stroller",
        name: "Carrinho compacto",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/carrinho-bebe",
        imageUrl:
          "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 1480,
        currentPrice: 1399,
        lowestPrice: 1329,
        highestPrice: 1549,
        targetPrice: 1390,
        currency: "BRL",
        priority: "must_have",
        status: "reserved",
        purchaseType: "collective",
        fundingGoalAmount: 1480,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 860,
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-10"), 1549, "Magalu", "https://www.magazineluiza.com.br/carrinho-bebe"),
          historyEntry(dateAt("2026-05-11"), 1499, "Amazon Brasil", "https://www.amazon.com.br/s?k=carrinho+compacto"),
          historyEntry(dateAt("2026-06-08"), 1429, "Mercado Livre", "https://www.mercadolivre.com.br/carrinho-bebe"),
          historyEntry(dateAt("2026-06-26"), 1399, "Magalu", "https://www.magazineluiza.com.br/carrinho-bebe"),
        ],
        priceOffers: [
          offer("Magalu", 1399, "https://www.magazineluiza.com.br/carrinho-bebe"),
          offer("Mercado Livre", 1429, "https://www.mercadolivre.com.br/carrinho-bebe"),
          offer("Amazon Brasil", 1449, "https://www.amazon.com.br/s?k=carrinho+compacto"),
        ],
        createdAt: "2026-02-11T10:30:00.000Z",
        updatedAt: "2026-06-26T10:45:00.000Z",
      },
      {
        id: "gift-diaper-bag",
        name: "Mochila maternidade",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/mochila-maternidade",
        imageUrl:
          "https://images.unsplash.com/photo-1527506933980-63f1b21c4e2f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 289,
        currentPrice: 269,
        lowestPrice: 249,
        highestPrice: 309,
        targetPrice: 259,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-22"), 309, "Mercado Livre", "https://www.mercadolivre.com.br/mochila-maternidade"),
          historyEntry(dateAt("2026-05-16"), 299, "Amazon Brasil", "https://www.amazon.com.br/s?k=mochila+maternidade"),
          historyEntry(dateAt("2026-06-04"), 279, "Magalu", "https://www.magazineluiza.com.br/mochila-maternidade"),
          historyEntry(dateAt("2026-06-24"), 269, "Mercado Livre", "https://www.mercadolivre.com.br/mochila-maternidade"),
        ],
        priceOffers: [
          offer("Mercado Livre", 269, "https://www.mercadolivre.com.br/mochila-maternidade"),
          offer("Magalu", 279, "https://www.magazineluiza.com.br/mochila-maternidade"),
        ],
        createdAt: "2026-03-01T09:20:00.000Z",
        updatedAt: "2026-06-24T09:40:00.000Z",
      },
      {
        id: "gift-bottle-warmer",
        name: "Aquecedor de mamadeira",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=aquecedor+mamadeira",
        imageUrl:
          "https://images.unsplash.com/photo-1512042374741-0c7a5f3c4f2d?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 219,
        currentPrice: 199,
        lowestPrice: 189,
        highestPrice: 239,
        targetPrice: 199,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-10"), 239, "Amazon Brasil", "https://www.amazon.com.br/s?k=aquecedor+mamadeira"),
          historyEntry(dateAt("2026-05-28"), 219, "Magalu", "https://www.magazineluiza.com.br/aquecedor-mamadeira"),
          historyEntry(dateAt("2026-06-18"), 199, "Amazon Brasil", "https://www.amazon.com.br/s?k=aquecedor+mamadeira"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 199, "https://www.amazon.com.br/s?k=aquecedor+mamadeira"),
          offer("Magalu", 205, "https://www.magazineluiza.com.br/aquecedor-mamadeira"),
        ],
        createdAt: "2026-03-12T12:00:00.000Z",
        updatedAt: "2026-06-18T14:10:00.000Z",
      },
      {
        id: "gift-mobile",
        name: "Móbile de berço",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/mobile-berco",
        imageUrl:
          "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 169,
        currentPrice: 159,
        lowestPrice: 149,
        highestPrice: 189,
        targetPrice: 159,
        currency: "BRL",
        priority: "surprise_me",
        status: "purchased",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-22"), 189, "KaBuM!", "https://www.kabum.com.br/busca/mobile-berco"),
          historyEntry(dateAt("2026-06-07"), 169, "Amazon Brasil", "https://www.amazon.com.br/s?k=mobile+berco"),
          historyEntry(dateAt("2026-06-25"), 159, "KaBuM!", "https://www.kabum.com.br/busca/mobile-berco"),
        ],
        priceOffers: [
          offer("KaBuM!", 159, "https://www.kabum.com.br/busca/mobile-berco"),
          offer("Amazon Brasil", 164, "https://www.amazon.com.br/s?k=mobile+berco"),
        ],
        createdAt: "2026-04-01T08:45:00.000Z",
        updatedAt: "2026-06-25T20:00:00.000Z",
      },
    ],
  },
  {
    id: "casa-nova",
    shareId: "casa-nova-gabriel",
    title: "Casa Nova",
    occasion: "newHome",
    type: "wishlist",
    eventDate: "2026-10-03",
    message: "Itens úteis para montar a casa sem pressa e comprar quando o preço ficar certo.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=1400&q=80",
    visibility: "private",
    themePreset: "newHome",
    themePrimaryColor: "#B98263",
    themeSecondaryColor: "#DDECF7",
    useCustomTheme: false,
    isPriceRadarEnabled: true,
    createdAt: "2026-01-14T11:10:00.000Z",
    gifts: [
      {
        id: "gift-lava-seca-lg",
        name: "Lava e seca LG",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/lava-e-seca-lg",
        imageUrl:
          "https://images.unsplash.com/photo-1610629064850-4412a3d4f9c7?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 4187,
        currentPrice: 3989,
        lowestPrice: 3799,
        highestPrice: 4299,
        targetPrice: 3890,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["below_target", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-03-12"), 4299, "Magalu", "https://www.magazineluiza.com.br/lava-e-seca-lg"),
          historyEntry(dateAt("2026-04-18"), 4199, "Amazon Brasil", "https://www.amazon.com.br/s?k=lava+e+seca+lg"),
          historyEntry(dateAt("2026-05-30"), 4049, "Mercado Livre", "https://www.mercadolivre.com.br/lava-e-seca-lg"),
          historyEntry(dateAt("2026-06-24"), 3989, "Magalu", "https://www.magazineluiza.com.br/lava-e-seca-lg"),
        ],
        priceOffers: [
          offer("Magalu", 3989, "https://www.magazineluiza.com.br/lava-e-seca-lg"),
          offer("Mercado Livre", 4049, "https://www.mercadolivre.com.br/lava-e-seca-lg"),
          offer("Amazon Brasil", 4099, "https://www.amazon.com.br/s?k=lava+e+seca+lg"),
        ],
        createdAt: "2026-02-05T10:15:00.000Z",
        updatedAt: "2026-06-24T14:10:00.000Z",
      },
      {
        id: "gift-air-fryer-philips",
        name: "Air Fryer Philips",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=airfryer+philips",
        imageUrl:
          "https://images.unsplash.com/photo-1608039525955-0b1e5fd0b4b3?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 629,
        currentPrice: 579,
        lowestPrice: 529,
        highestPrice: 659,
        targetPrice: 549,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-08"), 659, "Amazon Brasil", "https://www.amazon.com.br/s?k=airfryer+philips"),
          historyEntry(dateAt("2026-04-26"), 629, "Magalu", "https://www.magazineluiza.com.br/air-fryer-philips"),
          historyEntry(dateAt("2026-05-22"), 599, "Mercado Livre", "https://www.mercadolivre.com.br/air-fryer-philips"),
          historyEntry(dateAt("2026-06-27"), 579, "Amazon Brasil", "https://www.amazon.com.br/s?k=airfryer+philips"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 579, "https://www.amazon.com.br/s?k=airfryer+philips"),
          offer("Mercado Livre", 589, "https://www.mercadolivre.com.br/air-fryer-philips"),
          offer("Magalu", 599, "https://www.magazineluiza.com.br/air-fryer-philips"),
        ],
        createdAt: "2026-02-18T15:00:00.000Z",
        updatedAt: "2026-06-27T17:20:00.000Z",
      },
      {
        id: "gift-nespresso",
        name: "Cafeteira Nespresso",
        storeName: "Fast Shop",
        storeUrl: "https://www.fastshop.com.br/nespresso",
        imageUrl:
          "https://images.unsplash.com/photo-1515825295580-5bb9e9a1a54f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 799,
        currentPrice: 749,
        lowestPrice: 699,
        highestPrice: 829,
        targetPrice: 719,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "maybe_buy",
        priceAlertPreferences: ["weekly_summary", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-12"), 829, "Fast Shop", "https://www.fastshop.com.br/nespresso"),
          historyEntry(dateAt("2026-05-07"), 799, "Magalu", "https://www.magazineluiza.com.br/nespresso"),
          historyEntry(dateAt("2026-05-28"), 769, "Amazon Brasil", "https://www.amazon.com.br/s?k=nespresso"),
          historyEntry(dateAt("2026-06-22"), 749, "Fast Shop", "https://www.fastshop.com.br/nespresso"),
        ],
        priceOffers: [
          offer("Fast Shop", 749, "https://www.fastshop.com.br/nespresso"),
          offer("Amazon Brasil", 759, "https://www.amazon.com.br/s?k=nespresso"),
        ],
        createdAt: "2026-03-02T10:00:00.000Z",
        updatedAt: "2026-06-22T13:20:00.000Z",
      },
      {
        id: "gift-vacuum",
        name: "Robô aspirador",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/robo-aspirador",
        imageUrl:
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 1399,
        currentPrice: 1299,
        lowestPrice: 1249,
        highestPrice: 1499,
        targetPrice: 1249,
        currency: "BRL",
        priority: "nice_to_have",
        status: "reserved",
        purchaseType: "collective",
        fundingGoalAmount: 1399,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 540,
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-03-09"), 1499, "Mercado Livre", "https://www.mercadolivre.com.br/robo-aspirador"),
          historyEntry(dateAt("2026-04-17"), 1449, "Amazon Brasil", "https://www.amazon.com.br/s?k=robo+aspirador"),
          historyEntry(dateAt("2026-05-25"), 1349, "Magalu", "https://www.magazineluiza.com.br/robo-aspirador"),
          historyEntry(dateAt("2026-06-27"), 1299, "Mercado Livre", "https://www.mercadolivre.com.br/robo-aspirador"),
        ],
        priceOffers: [
          offer("Mercado Livre", 1299, "https://www.mercadolivre.com.br/robo-aspirador"),
          offer("Magalu", 1349, "https://www.magazineluiza.com.br/robo-aspirador"),
        ],
        createdAt: "2026-02-22T09:10:00.000Z",
        updatedAt: "2026-06-27T09:05:00.000Z",
      },
      {
        id: "gift-coffee-table",
        name: "Mesa lateral em madeira",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/mesa-lateral-madeira",
        imageUrl:
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 389,
        currentPrice: 359,
        lowestPrice: 349,
        highestPrice: 419,
        targetPrice: 349,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-08"), 419, "Magalu", "https://www.magazineluiza.com.br/mesa-lateral-madeira"),
          historyEntry(dateAt("2026-05-09"), 389, "Mercado Livre", "https://www.mercadolivre.com.br/mesa-lateral-madeira"),
          historyEntry(dateAt("2026-06-25"), 359, "Magalu", "https://www.magazineluiza.com.br/mesa-lateral-madeira"),
        ],
        priceOffers: [
          offer("Magalu", 359, "https://www.magazineluiza.com.br/mesa-lateral-madeira"),
          offer("Mercado Livre", 369, "https://www.mercadolivre.com.br/mesa-lateral-madeira"),
        ],
        createdAt: "2026-03-20T10:10:00.000Z",
        updatedAt: "2026-06-25T11:40:00.000Z",
      },
      {
        id: "gift-wall-frame",
        name: "Quadro botânico",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=quadro+botanico",
        imageUrl:
          "https://images.unsplash.com/photo-1517543835838-96c65e8c2a5d?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 149,
        currentPrice: 129,
        lowestPrice: 119,
        highestPrice: 159,
        targetPrice: 129,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-05"), 159, "Amazon Brasil", "https://www.amazon.com.br/s?k=quadro+botanico"),
          historyEntry(dateAt("2026-05-29"), 139, "Mercado Livre", "https://www.mercadolivre.com.br/quadro-botanico"),
          historyEntry(dateAt("2026-06-26"), 129, "Amazon Brasil", "https://www.amazon.com.br/s?k=quadro+botanico"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 129, "https://www.amazon.com.br/s?k=quadro+botanico"),
          offer("Mercado Livre", 135, "https://www.mercadolivre.com.br/quadro-botanico"),
        ],
        createdAt: "2026-04-15T10:25:00.000Z",
        updatedAt: "2026-06-26T10:05:00.000Z",
      },
    ],
  },
  {
    id: "tecnologia",
    shareId: "tec-gabriel",
    title: "Tecnologia",
    occasion: "wishlist",
    type: "wishlist",
    eventDate: "2026-11-15",
    message: "Itens de tecnologia que acompanho com radar e compro no ponto certo.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
    visibility: "private",
    themePreset: "birthday",
    themePrimaryColor: "#DE7762",
    themeSecondaryColor: "#DCD2FF",
    useCustomTheme: false,
    isPriceRadarEnabled: true,
    createdAt: "2025-12-09T16:10:00.000Z",
    gifts: [
      {
        id: "gift-macbook-air",
        name: "MacBook Air",
        storeName: "Apple",
        storeUrl: "https://www.apple.com/br/shop/buy-mac/macbook-air",
        imageUrl:
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 10999,
        currentPrice: 10499,
        lowestPrice: 10199,
        highestPrice: 11499,
        targetPrice: 10499,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["below_target", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-03-11"), 11499, "Apple", "https://www.apple.com/br/shop/buy-mac/macbook-air"),
          historyEntry(dateAt("2026-04-18"), 11199, "Amazon Brasil", "https://www.amazon.com.br/s?k=macbook+air"),
          historyEntry(dateAt("2026-05-21"), 10899, "Mercado Livre", "https://www.mercadolivre.com.br/macbook-air"),
          historyEntry(dateAt("2026-06-27"), 10499, "Apple", "https://www.apple.com/br/shop/buy-mac/macbook-air"),
        ],
        priceOffers: [
          offer("Apple", 10499, "https://www.apple.com/br/shop/buy-mac/macbook-air"),
          offer("Amazon Brasil", 10699, "https://www.amazon.com.br/s?k=macbook+air"),
          offer("Mercado Livre", 10749, "https://www.mercadolivre.com.br/macbook-air"),
        ],
        createdAt: "2026-01-02T10:00:00.000Z",
        updatedAt: "2026-06-27T20:10:00.000Z",
      },
      {
        id: "gift-kindle-paperwhite",
        name: "Kindle Paperwhite",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/kindle-paperwhite",
        imageUrl:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 799,
        currentPrice: 719,
        lowestPrice: 699,
        highestPrice: 849,
        targetPrice: 709,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-06"), 849, "Amazon Brasil", "https://www.amazon.com.br/kindle-paperwhite"),
          historyEntry(dateAt("2026-04-28"), 799, "Mercado Livre", "https://www.mercadolivre.com.br/kindle-paperwhite"),
          historyEntry(dateAt("2026-05-24"), 749, "Amazon Brasil", "https://www.amazon.com.br/kindle-paperwhite"),
          historyEntry(dateAt("2026-06-28"), 719, "Amazon Brasil", "https://www.amazon.com.br/kindle-paperwhite"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 719, "https://www.amazon.com.br/kindle-paperwhite"),
          offer("Mercado Livre", 729, "https://www.mercadolivre.com.br/kindle-paperwhite"),
        ],
        createdAt: "2026-01-18T11:30:00.000Z",
        updatedAt: "2026-06-28T09:20:00.000Z",
      },
      {
        id: "gift-echo-dot",
        name: "Echo Dot",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/echo-dot",
        imageUrl:
          "https://images.unsplash.com/photo-1582192496308-7ef02f7b2e78?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 399,
        currentPrice: 289,
        lowestPrice: 279,
        highestPrice: 419,
        targetPrice: 299,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-05-02"), 419, "Amazon Brasil", "https://www.amazon.com.br/echo-dot"),
          historyEntry(dateAt("2026-05-19"), 349, "Mercado Livre", "https://www.mercadolivre.com.br/echo-dot"),
          historyEntry(dateAt("2026-06-11"), 319, "Amazon Brasil", "https://www.amazon.com.br/echo-dot"),
          historyEntry(dateAt("2026-06-28"), 289, "Amazon Brasil", "https://www.amazon.com.br/echo-dot"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 289, "https://www.amazon.com.br/echo-dot"),
          offer("Mercado Livre", 299, "https://www.mercadolivre.com.br/echo-dot"),
        ],
        createdAt: "2026-02-12T10:05:00.000Z",
        updatedAt: "2026-06-28T07:05:00.000Z",
      },
      {
        id: "gift-galaxy-s26-dreams",
        name: "Galaxy S26",
        storeName: "Samsung",
        storeUrl: "https://www.samsung.com/br/smartphones/galaxy-s26/",
        imageUrl:
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 6299,
        currentPrice: 6099,
        lowestPrice: 5899,
        highestPrice: 6499,
        targetPrice: 5999,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "maybe_buy",
        priceAlertPreferences: ["below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-05-14"), 6499, "Samsung", "https://www.samsung.com/br/smartphones/galaxy-s26/"),
          historyEntry(dateAt("2026-05-29"), 6299, "Amazon Brasil", "https://www.amazon.com.br/s?k=Galaxy+S26"),
          historyEntry(dateAt("2026-06-10"), 6199, "Mercado Livre", "https://www.mercadolivre.com.br/galaxy-s26"),
          historyEntry(dateAt("2026-06-20"), 6149, "KaBuM!", "https://www.kabum.com.br/busca/galaxy-s26"),
          historyEntry(dateAt("2026-06-28"), 6099, "Samsung", "https://www.samsung.com/br/smartphones/galaxy-s26/"),
        ],
        priceOffers: [
          offer("Samsung", 6099, "https://www.samsung.com/br/smartphones/galaxy-s26/"),
          offer("Amazon Brasil", 6149, "https://www.amazon.com.br/s?k=Galaxy+S26"),
          offer("Mercado Livre", 6199, "https://www.mercadolivre.com.br/galaxy-s26"),
        ],
        createdAt: "2026-03-10T09:00:00.000Z",
        updatedAt: "2026-06-28T11:20:00.000Z",
      },
      {
        id: "gift-airpods-pro",
        name: "AirPods Pro",
        storeName: "Apple",
        storeUrl: "https://www.apple.com/br/shop/product/MQD83ZM/A",
        imageUrl:
          "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 2499,
        currentPrice: 2299,
        lowestPrice: 2199,
        highestPrice: 2599,
        targetPrice: 2199,
        currency: "BRL",
        priority: "surprise_me",
        status: "purchased",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-09"), 2599, "Apple", "https://www.apple.com/br/shop/product/MQD83ZM/A"),
          historyEntry(dateAt("2026-05-13"), 2499, "Amazon Brasil", "https://www.amazon.com.br/s?k=AirPods+Pro"),
          historyEntry(dateAt("2026-06-08"), 2399, "Mercado Livre", "https://www.mercadolivre.com.br/airpods-pro"),
          historyEntry(dateAt("2026-06-26"), 2299, "Apple", "https://www.apple.com/br/shop/product/MQD83ZM/A"),
        ],
        priceOffers: [
          offer("Apple", 2299, "https://www.apple.com/br/shop/product/MQD83ZM/A"),
          offer("Amazon Brasil", 2349, "https://www.amazon.com.br/s?k=AirPods+Pro"),
          offer("Mercado Livre", 2399, "https://www.mercadolivre.com.br/airpods-pro"),
        ],
        createdAt: "2026-03-28T15:00:00.000Z",
        updatedAt: "2026-06-26T12:30:00.000Z",
      },
      {
        id: "gift-dji-mini-4",
        name: "DJI Mini 4",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/dji-mini-4",
        imageUrl:
          "https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 4899,
        currentPrice: 4599,
        lowestPrice: 4399,
        highestPrice: 5099,
        targetPrice: 4499,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "collective",
        fundingGoalAmount: 4899,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 960,
        priceTrackingEnabled: true,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: ["back_to_low", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-04-01"), 5099, "Mercado Livre", "https://www.mercadolivre.com.br/dji-mini-4"),
          historyEntry(dateAt("2026-04-25"), 4999, "Amazon Brasil", "https://www.amazon.com.br/s?k=dji+mini+4"),
          historyEntry(dateAt("2026-05-20"), 4799, "KaBuM!", "https://www.kabum.com.br/busca/dji-mini-4"),
          historyEntry(dateAt("2026-06-28"), 4599, "Mercado Livre", "https://www.mercadolivre.com.br/dji-mini-4"),
        ],
        priceOffers: [
          offer("Mercado Livre", 4599, "https://www.mercadolivre.com.br/dji-mini-4"),
          offer("Amazon Brasil", 4699, "https://www.amazon.com.br/s?k=dji+mini+4"),
          offer("KaBuM!", 4749, "https://www.kabum.com.br/busca/dji-mini-4"),
        ],
        createdAt: "2026-03-24T09:50:00.000Z",
        updatedAt: "2026-06-28T10:00:00.000Z",
      },
      {
        id: "gift-ssd-990-pro",
        name: "SSD Samsung 990 Pro",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/ssd-990-pro",
        imageUrl:
          "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 699,
        currentPrice: 629,
        lowestPrice: 599,
        highestPrice: 729,
        targetPrice: 599,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-03"), 729, "KaBuM!", "https://www.kabum.com.br/busca/ssd-990-pro"),
          historyEntry(dateAt("2026-05-04"), 699, "Mercado Livre", "https://www.mercadolivre.com.br/ssd-990-pro"),
          historyEntry(dateAt("2026-05-30"), 659, "Amazon Brasil", "https://www.amazon.com.br/s?k=ssd+990+pro"),
          historyEntry(dateAt("2026-06-27"), 629, "KaBuM!", "https://www.kabum.com.br/busca/ssd-990-pro"),
        ],
        priceOffers: [
          offer("KaBuM!", 629, "https://www.kabum.com.br/busca/ssd-990-pro"),
          offer("Amazon Brasil", 639, "https://www.amazon.com.br/s?k=ssd+990+pro"),
          offer("Mercado Livre", 649, "https://www.mercadolivre.com.br/ssd-990-pro"),
        ],
        createdAt: "2026-02-26T13:45:00.000Z",
        updatedAt: "2026-06-27T08:40:00.000Z",
      },
    ],
  },
  {
    id: "black-friday",
    shareId: "black-friday-gabriel",
    title: "Black Friday",
    occasion: "holiday",
    type: "wishlist",
    eventDate: "2026-11-27",
    message: "Acompanhando ofertas do ano inteiro para comprar no menor preço.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=80",
    visibility: "private",
    themePreset: "christmas",
    themePrimaryColor: "#9F4F45",
    themeSecondaryColor: "#D9E5D6",
    useCustomTheme: false,
    isPriceRadarEnabled: true,
    createdAt: "2026-01-25T10:00:00.000Z",
    gifts: [
      {
        id: "gift-tv-samsung-oled",
        name: "TV Samsung OLED",
        storeName: "Fast Shop",
        storeUrl: "https://www.fastshop.com.br/tv-samsung-oled",
        imageUrl:
          "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 7499,
        currentPrice: 6999,
        lowestPrice: 6799,
        highestPrice: 7899,
        targetPrice: 6899,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "back_to_low"],
        priceHistory: [
          historyEntry(dateAt("2026-03-17"), 7899, "Fast Shop", "https://www.fastshop.com.br/tv-samsung-oled"),
          historyEntry(dateAt("2026-04-21"), 7699, "Magalu", "https://www.magazineluiza.com.br/tv-samsung-oled"),
          historyEntry(dateAt("2026-05-29"), 7199, "Amazon Brasil", "https://www.amazon.com.br/s?k=tv+samsung+oled"),
          historyEntry(dateAt("2026-06-27"), 6999, "Fast Shop", "https://www.fastshop.com.br/tv-samsung-oled"),
        ],
        priceOffers: [
          offer("Fast Shop", 6999, "https://www.fastshop.com.br/tv-samsung-oled"),
          offer("Magalu", 7099, "https://www.magazineluiza.com.br/tv-samsung-oled"),
          offer("Amazon Brasil", 7149, "https://www.amazon.com.br/s?k=tv+samsung+oled"),
        ],
        createdAt: "2026-01-31T10:00:00.000Z",
        updatedAt: "2026-06-27T19:00:00.000Z",
      },
      {
        id: "gift-lg-ultragear",
        name: "Monitor LG UltraGear",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/lg-ultragear",
        imageUrl:
          "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 2199,
        currentPrice: 1899,
        lowestPrice: 1799,
        highestPrice: 2299,
        targetPrice: 1849,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-03-05"), 2299, "KaBuM!", "https://www.kabum.com.br/busca/lg-ultragear"),
          historyEntry(dateAt("2026-04-03"), 2199, "Mercado Livre", "https://www.mercadolivre.com.br/lg-ultragear"),
          historyEntry(dateAt("2026-05-12"), 2049, "Amazon Brasil", "https://www.amazon.com.br/s?k=lg+ultragear"),
          historyEntry(dateAt("2026-06-28"), 1899, "KaBuM!", "https://www.kabum.com.br/busca/lg-ultragear"),
        ],
        priceOffers: [
          offer("KaBuM!", 1899, "https://www.kabum.com.br/busca/lg-ultragear"),
          offer("Amazon Brasil", 1949, "https://www.amazon.com.br/s?k=lg+ultragear"),
          offer("Mercado Livre", 1979, "https://www.mercadolivre.com.br/lg-ultragear"),
        ],
        createdAt: "2026-02-10T11:30:00.000Z",
        updatedAt: "2026-06-28T08:25:00.000Z",
      },
      {
        id: "gift-bosch-drill",
        name: "Furadeira Bosch",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/furadeira-bosch",
        imageUrl:
          "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 449,
        currentPrice: 389,
        lowestPrice: 359,
        highestPrice: 469,
        targetPrice: 369,
        currency: "BRL",
        priority: "nice_to_have",
        status: "purchased",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop"],
        priceHistory: [
          historyEntry(dateAt("2026-04-02"), 469, "Mercado Livre", "https://www.mercadolivre.com.br/furadeira-bosch"),
          historyEntry(dateAt("2026-05-06"), 439, "KaBuM!", "https://www.kabum.com.br/busca/furadeira-bosch"),
          historyEntry(dateAt("2026-05-29"), 409, "Amazon Brasil", "https://www.amazon.com.br/s?k=furadeira+bosch"),
          historyEntry(dateAt("2026-06-27"), 389, "Mercado Livre", "https://www.mercadolivre.com.br/furadeira-bosch"),
        ],
        priceOffers: [
          offer("Mercado Livre", 389, "https://www.mercadolivre.com.br/furadeira-bosch"),
          offer("Amazon Brasil", 399, "https://www.amazon.com.br/s?k=furadeira+bosch"),
        ],
        createdAt: "2026-02-18T08:40:00.000Z",
        updatedAt: "2026-06-27T09:00:00.000Z",
      },
      {
        id: "gift-chair-gamer",
        name: "Cadeira Gamer",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/cadeira-gamer",
        imageUrl:
          "https://images.unsplash.com/photo-1505843490701-5d8b6b28ce20?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 1299,
        currentPrice: 1199,
        lowestPrice: 1149,
        highestPrice: 1399,
        targetPrice: 1179,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "collective",
        fundingGoalAmount: 1299,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 540,
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-04-14"), 1399, "KaBuM!", "https://www.kabum.com.br/busca/cadeira-gamer"),
          historyEntry(dateAt("2026-05-08"), 1349, "Mercado Livre", "https://www.mercadolivre.com.br/cadeira-gamer"),
          historyEntry(dateAt("2026-05-29"), 1249, "Amazon Brasil", "https://www.amazon.com.br/s?k=cadeira+gamer"),
          historyEntry(dateAt("2026-06-29"), 1199, "KaBuM!", "https://www.kabum.com.br/busca/cadeira-gamer"),
        ],
        priceOffers: [
          offer("KaBuM!", 1199, "https://www.kabum.com.br/busca/cadeira-gamer"),
          offer("Mercado Livre", 1229, "https://www.mercadolivre.com.br/cadeira-gamer"),
          offer("Amazon Brasil", 1249, "https://www.amazon.com.br/s?k=cadeira+gamer"),
        ],
        createdAt: "2026-03-15T10:10:00.000Z",
        updatedAt: "2026-06-29T09:00:00.000Z",
      },
      {
        id: "gift-ryzen-9900x",
        name: "Ryzen 9900X",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/ryzen-9900x",
        imageUrl:
          "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 3499,
        currentPrice: 3249,
        lowestPrice: 3099,
        highestPrice: 3699,
        targetPrice: 3199,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["below_target", "back_to_low"],
        priceHistory: [
          historyEntry(dateAt("2026-03-22"), 3699, "KaBuM!", "https://www.kabum.com.br/busca/ryzen-9900x"),
          historyEntry(dateAt("2026-04-24"), 3549, "Mercado Livre", "https://www.mercadolivre.com.br/ryzen-9900x"),
          historyEntry(dateAt("2026-05-29"), 3349, "Amazon Brasil", "https://www.amazon.com.br/s?k=ryzen+9900x"),
          historyEntry(dateAt("2026-06-28"), 3249, "KaBuM!", "https://www.kabum.com.br/busca/ryzen-9900x"),
        ],
        priceOffers: [
          offer("KaBuM!", 3249, "https://www.kabum.com.br/busca/ryzen-9900x"),
          offer("Amazon Brasil", 3299, "https://www.amazon.com.br/s?k=ryzen+9900x"),
          offer("Mercado Livre", 3349, "https://www.mercadolivre.com.br/ryzen-9900x"),
        ],
        createdAt: "2026-02-26T09:25:00.000Z",
        updatedAt: "2026-06-28T17:10:00.000Z",
      },
      {
        id: "gift-logitech-gpro",
        name: "Mouse Logitech G Pro",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=logitech+g+pro+mouse",
        imageUrl:
          "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 799,
        currentPrice: 699,
        lowestPrice: 679,
        highestPrice: 829,
        targetPrice: 689,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop"],
        priceHistory: [
          historyEntry(dateAt("2026-04-12"), 829, "Amazon Brasil", "https://www.amazon.com.br/s?k=logitech+g+pro+mouse"),
          historyEntry(dateAt("2026-05-16"), 779, "KaBuM!", "https://www.kabum.com.br/busca/logitech-g-pro"),
          historyEntry(dateAt("2026-06-08"), 729, "Mercado Livre", "https://www.mercadolivre.com.br/logitech-g-pro"),
          historyEntry(dateAt("2026-06-27"), 699, "Amazon Brasil", "https://www.amazon.com.br/s?k=logitech+g+pro+mouse"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 699, "https://www.amazon.com.br/s?k=logitech+g+pro+mouse"),
          offer("KaBuM!", 709, "https://www.kabum.com.br/busca/logitech-g-pro"),
        ],
        createdAt: "2026-03-19T08:45:00.000Z",
        updatedAt: "2026-06-27T10:40:00.000Z",
      },
      {
        id: "gift-hyperx-headset",
        name: "Headset HyperX",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/headset-hyperx",
        imageUrl:
          "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 549,
        currentPrice: 499,
        lowestPrice: 479,
        highestPrice: 579,
        targetPrice: 489,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["below_target", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-04-20"), 579, "Mercado Livre", "https://www.mercadolivre.com.br/headset-hyperx"),
          historyEntry(dateAt("2026-05-21"), 549, "Amazon Brasil", "https://www.amazon.com.br/s?k=headset+hyperx"),
          historyEntry(dateAt("2026-06-10"), 519, "KaBuM!", "https://www.kabum.com.br/busca/headset-hyperx"),
          historyEntry(dateAt("2026-06-28"), 499, "Mercado Livre", "https://www.mercadolivre.com.br/headset-hyperx"),
        ],
        priceOffers: [
          offer("Mercado Livre", 499, "https://www.mercadolivre.com.br/headset-hyperx"),
          offer("KaBuM!", 509, "https://www.kabum.com.br/busca/headset-hyperx"),
        ],
        createdAt: "2026-03-28T09:20:00.000Z",
        updatedAt: "2026-06-28T11:10:00.000Z",
      },
    ],
  },
  {
    id: "escritorio",
    shareId: "office-gabriel",
    title: "Escritório",
    occasion: "wishlist",
    type: "wishlist",
    eventDate: "2026-12-12",
    message: "Melhorias que deixam o espaço de trabalho mais silencioso e produtivo.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
    visibility: "private",
    themePreset: "minimal",
    themePrimaryColor: "#241815",
    themeSecondaryColor: "#EFE4DA",
    useCustomTheme: false,
    isPriceRadarEnabled: true,
    createdAt: "2025-11-20T10:20:00.000Z",
    gifts: [
      {
        id: "gift-office-desk",
        name: "Mesa de trabalho",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/mesa-de-trabalho",
        imageUrl:
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 1299,
        currentPrice: 1199,
        lowestPrice: 1149,
        highestPrice: 1349,
        targetPrice: 1169,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop"],
        priceHistory: [
          historyEntry(dateAt("2026-03-18"), 1349, "Magalu", "https://www.magazineluiza.com.br/mesa-de-trabalho"),
          historyEntry(dateAt("2026-04-20"), 1299, "Amazon Brasil", "https://www.amazon.com.br/s?k=mesa+de+trabalho"),
          historyEntry(dateAt("2026-05-27"), 1249, "Mercado Livre", "https://www.mercadolivre.com.br/mesa-de-trabalho"),
          historyEntry(dateAt("2026-06-28"), 1199, "Magalu", "https://www.magazineluiza.com.br/mesa-de-trabalho"),
        ],
        priceOffers: [
          offer("Magalu", 1199, "https://www.magazineluiza.com.br/mesa-de-trabalho"),
          offer("Mercado Livre", 1229, "https://www.mercadolivre.com.br/mesa-de-trabalho"),
          offer("Amazon Brasil", 1249, "https://www.amazon.com.br/s?k=mesa+de+trabalho"),
        ],
        createdAt: "2026-01-11T09:10:00.000Z",
        updatedAt: "2026-06-28T13:00:00.000Z",
      },
      {
        id: "gift-office-lamp",
        name: "Luminária ajustável",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=luminaria+ajustavel",
        imageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 249,
        currentPrice: 219,
        lowestPrice: 199,
        highestPrice: 269,
        targetPrice: 209,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-11"), 269, "Amazon Brasil", "https://www.amazon.com.br/s?k=luminaria+ajustavel"),
          historyEntry(dateAt("2026-05-13"), 249, "Mercado Livre", "https://www.mercadolivre.com.br/luminaria-ajustavel"),
          historyEntry(dateAt("2026-06-27"), 219, "Amazon Brasil", "https://www.amazon.com.br/s?k=luminaria+ajustavel"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 219, "https://www.amazon.com.br/s?k=luminaria+ajustavel"),
          offer("Mercado Livre", 225, "https://www.mercadolivre.com.br/luminaria-ajustavel"),
        ],
        createdAt: "2026-02-03T13:30:00.000Z",
        updatedAt: "2026-06-27T09:55:00.000Z",
      },
      {
        id: "gift-office-webcam",
        name: "Webcam Full HD",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/webcam-full-hd",
        imageUrl:
          "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 329,
        currentPrice: 299,
        lowestPrice: 289,
        highestPrice: 349,
        targetPrice: 299,
        currency: "BRL",
        priority: "must_have",
        status: "reserved",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-16"), 349, "KaBuM!", "https://www.kabum.com.br/busca/webcam-full-hd"),
          historyEntry(dateAt("2026-05-17"), 329, "Mercado Livre", "https://www.mercadolivre.com.br/webcam-full-hd"),
          historyEntry(dateAt("2026-06-20"), 299, "KaBuM!", "https://www.kabum.com.br/busca/webcam-full-hd"),
        ],
        priceOffers: [
          offer("KaBuM!", 299, "https://www.kabum.com.br/busca/webcam-full-hd"),
          offer("Mercado Livre", 309, "https://www.mercadolivre.com.br/webcam-full-hd"),
        ],
        createdAt: "2026-03-13T12:40:00.000Z",
        updatedAt: "2026-06-20T12:00:00.000Z",
      },
      {
        id: "gift-office-keyboard",
        name: "Teclado mecânico",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/teclado-mecanico",
        imageUrl:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 589,
        currentPrice: 549,
        lowestPrice: 529,
        highestPrice: 629,
        targetPrice: 539,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["weekly_summary", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-04"), 629, "Mercado Livre", "https://www.mercadolivre.com.br/teclado-mecanico"),
          historyEntry(dateAt("2026-05-06"), 599, "Amazon Brasil", "https://www.amazon.com.br/s?k=teclado+mec%C3%A2nico"),
          historyEntry(dateAt("2026-06-05"), 569, "KaBuM!", "https://www.kabum.com.br/busca/teclado-mecanico"),
          historyEntry(dateAt("2026-06-28"), 549, "Mercado Livre", "https://www.mercadolivre.com.br/teclado-mecanico"),
        ],
        priceOffers: [
          offer("Mercado Livre", 549, "https://www.mercadolivre.com.br/teclado-mecanico"),
          offer("KaBuM!", 559, "https://www.kabum.com.br/busca/teclado-mecanico"),
        ],
        createdAt: "2026-03-29T10:00:00.000Z",
        updatedAt: "2026-06-28T10:35:00.000Z",
      },
      {
        id: "gift-office-mic",
        name: "Microfone USB",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=microfone+usb",
        imageUrl:
          "https://images.unsplash.com/photo-1558377899-3f4b7d0f0e07?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 459,
        currentPrice: 419,
        lowestPrice: 399,
        highestPrice: 489,
        targetPrice: 409,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-25"), 489, "Amazon Brasil", "https://www.amazon.com.br/s?k=microfone+usb"),
          historyEntry(dateAt("2026-05-27"), 449, "Mercado Livre", "https://www.mercadolivre.com.br/microfone-usb"),
          historyEntry(dateAt("2026-06-27"), 419, "Amazon Brasil", "https://www.amazon.com.br/s?k=microfone+usb"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 419, "https://www.amazon.com.br/s?k=microfone+usb"),
          offer("Mercado Livre", 429, "https://www.mercadolivre.com.br/microfone-usb"),
        ],
        createdAt: "2026-04-08T08:20:00.000Z",
        updatedAt: "2026-06-27T16:00:00.000Z",
      },
      {
        id: "gift-office-chair",
        name: "Apoio ergonômico",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/apoio-ergonomico",
        imageUrl:
          "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 219,
        currentPrice: 199,
        lowestPrice: 189,
        highestPrice: 239,
        targetPrice: 199,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-08"), 239, "Magalu", "https://www.magazineluiza.com.br/apoio-ergonomico"),
          historyEntry(dateAt("2026-05-30"), 219, "Amazon Brasil", "https://www.amazon.com.br/s?k=apoio+ergonomico"),
          historyEntry(dateAt("2026-06-27"), 199, "Magalu", "https://www.magazineluiza.com.br/apoio-ergonomico"),
        ],
        priceOffers: [
          offer("Magalu", 199, "https://www.magazineluiza.com.br/apoio-ergonomico"),
          offer("Amazon Brasil", 205, "https://www.amazon.com.br/s?k=apoio+ergonomico"),
        ],
        createdAt: "2026-04-26T09:00:00.000Z",
        updatedAt: "2026-06-27T09:30:00.000Z",
      },
    ],
  },
  {
    id: "sonhos",
    shareId: "dreams-gabriel",
    title: "Sonhos",
    occasion: "wishlist",
    type: "wishlist",
    eventDate: "2026-12-31",
    message: "Itens de desejo que acompanho há mais tempo e compro quando entra no radar certo.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1400&q=80",
    visibility: "private",
    themePreset: "default",
    themePrimaryColor: "#DE7762",
    themeSecondaryColor: "#DCD2FF",
    useCustomTheme: false,
    isPriceRadarEnabled: true,
    createdAt: "2026-02-28T12:30:00.000Z",
    gifts: [
      {
        id: "gift-rtx-6080",
        name: "RTX 6080",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/rtx-6080",
        imageUrl:
          "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 10999,
        currentPrice: 9499,
        lowestPrice: 8999,
        highestPrice: 11499,
        targetPrice: 9399,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["below_target", "back_to_low"],
        priceHistory: [
          historyEntry(dateAt("2026-04-02"), 11499, "KaBuM!", "https://www.kabum.com.br/busca/rtx-6080"),
          historyEntry(dateAt("2026-05-01"), 10899, "Mercado Livre", "https://www.mercadolivre.com.br/rtx-6080"),
          historyEntry(dateAt("2026-05-29"), 9999, "Amazon Brasil", "https://www.amazon.com.br/s?k=rtx+6080"),
          historyEntry(dateAt("2026-06-28"), 9499, "KaBuM!", "https://www.kabum.com.br/busca/rtx-6080"),
        ],
        priceOffers: [
          offer("KaBuM!", 9499, "https://www.kabum.com.br/busca/rtx-6080"),
          offer("Amazon Brasil", 9599, "https://www.amazon.com.br/s?k=rtx+6080"),
          offer("Mercado Livre", 9699, "https://www.mercadolivre.com.br/rtx-6080"),
        ],
        createdAt: "2026-03-05T10:30:00.000Z",
        updatedAt: "2026-06-28T11:40:00.000Z",
      },
      {
        id: "gift-mb-air",
        name: "MacBook Air M4",
        storeName: "Apple",
        storeUrl: "https://www.apple.com/br/shop/buy-mac/macbook-air",
        imageUrl:
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 9999,
        currentPrice: 9499,
        lowestPrice: 9299,
        highestPrice: 10499,
        targetPrice: 9399,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-03-15"), 10499, "Apple", "https://www.apple.com/br/shop/buy-mac/macbook-air"),
          historyEntry(dateAt("2026-04-17"), 10299, "Amazon Brasil", "https://www.amazon.com.br/s?k=macbook+air+m4"),
          historyEntry(dateAt("2026-05-23"), 9899, "Mercado Livre", "https://www.mercadolivre.com.br/macbook-air-m4"),
          historyEntry(dateAt("2026-06-28"), 9499, "Apple", "https://www.apple.com/br/shop/buy-mac/macbook-air"),
        ],
        priceOffers: [
          offer("Apple", 9499, "https://www.apple.com/br/shop/buy-mac/macbook-air"),
          offer("Amazon Brasil", 9599, "https://www.amazon.com.br/s?k=macbook+air+m4"),
          offer("Mercado Livre", 9699, "https://www.mercadolivre.com.br/macbook-air-m4"),
        ],
        createdAt: "2026-03-17T10:50:00.000Z",
        updatedAt: "2026-06-28T10:55:00.000Z",
      },
      {
        id: "gift-ipad-air",
        name: "iPad Air",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=iPad+Air",
        imageUrl:
          "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 6499,
        currentPrice: 6199,
        lowestPrice: 5999,
        highestPrice: 6799,
        targetPrice: 6099,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["below_target", "weekly_summary"],
        priceHistory: [
          historyEntry(dateAt("2026-04-09"), 6799, "Apple", "https://www.apple.com/br/ipad-air"),
          historyEntry(dateAt("2026-05-09"), 6599, "Amazon Brasil", "https://www.amazon.com.br/s?k=iPad+Air"),
          historyEntry(dateAt("2026-06-14"), 6299, "Mercado Livre", "https://www.mercadolivre.com.br/ipad-air"),
          historyEntry(dateAt("2026-06-29"), 6199, "Amazon Brasil", "https://www.amazon.com.br/s?k=iPad+Air"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 6199, "https://www.amazon.com.br/s?k=iPad+Air"),
          offer("Mercado Livre", 6249, "https://www.mercadolivre.com.br/ipad-air"),
          offer("Apple", 6299, "https://www.apple.com/br/ipad-air"),
        ],
        createdAt: "2026-04-09T09:40:00.000Z",
        updatedAt: "2026-06-29T08:10:00.000Z",
      },
      {
        id: "gift-watch-series",
        name: "Apple Watch Series",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/apple-watch-series",
        imageUrl:
          "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 3299,
        currentPrice: 3099,
        lowestPrice: 2999,
        highestPrice: 3399,
        targetPrice: 3049,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "collective",
        fundingGoalAmount: 3299,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 740,
        priceTrackingEnabled: true,
        priceRadarPriority: "sale_only",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-04-01"), 3399, "Mercado Livre", "https://www.mercadolivre.com.br/apple-watch-series"),
          historyEntry(dateAt("2026-05-11"), 3299, "Amazon Brasil", "https://www.amazon.com.br/s?k=apple+watch+series"),
          historyEntry(dateAt("2026-06-09"), 3199, "Apple", "https://www.apple.com/br/watch/"),
          historyEntry(dateAt("2026-06-28"), 3099, "Mercado Livre", "https://www.mercadolivre.com.br/apple-watch-series"),
        ],
        priceOffers: [
          offer("Mercado Livre", 3099, "https://www.mercadolivre.com.br/apple-watch-series"),
          offer("Amazon Brasil", 3149, "https://www.amazon.com.br/s?k=apple+watch+series"),
          offer("Apple", 3199, "https://www.apple.com/br/watch/"),
        ],
        createdAt: "2026-04-01T11:30:00.000Z",
        updatedAt: "2026-06-28T13:45:00.000Z",
      },
      {
        id: "gift-switch-2-dreams",
        name: "Nintendo Switch 2",
        storeName: "KaBuM!",
        storeUrl: "https://www.kabum.com.br/busca/nintendo-switch-2",
        imageUrl:
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 4499,
        currentPrice: 4299,
        lowestPrice: 4199,
        highestPrice: 4699,
        targetPrice: 4299,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: true,
        priceRadarPriority: "must_buy",
        priceAlertPreferences: ["any_drop", "below_target"],
        priceHistory: [
          historyEntry(dateAt("2026-05-18"), 4699, "KaBuM!", "https://www.kabum.com.br/busca/nintendo-switch-2"),
          historyEntry(dateAt("2026-05-28"), 4599, "Mercado Livre", "https://www.mercadolivre.com.br/nintendo-switch-2"),
          historyEntry(dateAt("2026-06-09"), 4499, "Amazon Brasil", "https://www.amazon.com.br/s?k=Nintendo+Switch+2"),
          historyEntry(dateAt("2026-06-18"), 4399, "Magazine Luiza", "https://www.magazineluiza.com.br/nintendo-switch-2"),
          historyEntry(dateAt("2026-06-29"), 4299, "KaBuM!", "https://www.kabum.com.br/busca/nintendo-switch-2"),
        ],
        priceOffers: [
          offer("KaBuM!", 4299, "https://www.kabum.com.br/busca/nintendo-switch-2"),
          offer("Amazon Brasil", 4349, "https://www.amazon.com.br/s?k=Nintendo+Switch+2"),
          offer("Mercado Livre", 4399, "https://www.mercadolivre.com.br/nintendo-switch-2"),
        ],
        createdAt: "2026-05-18T08:30:00.000Z",
        updatedAt: "2026-06-29T07:55:00.000Z",
      },
    ],
  },
  {
    id: "presentes",
    shareId: "presentes-gabriel",
    title: "Presentes",
    occasion: "birthday",
    type: "event",
    eventDate: "2026-07-30",
    message: "Lista para ocasiões variadas e compras mais pontuais.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80",
    visibility: "public_link",
    themePreset: "birthday",
    themePrimaryColor: "#DE7762",
    themeSecondaryColor: "#DCD2FF",
    useCustomTheme: false,
    isPriceRadarEnabled: false,
    createdAt: "2026-01-09T14:00:00.000Z",
    gifts: [
      {
        id: "gift-book-set",
        name: "Coleção de livros",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=cole%C3%A7%C3%A3o+de+livros",
        imageUrl:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 248,
        currentPrice: 229,
        lowestPrice: 219,
        highestPrice: 269,
        targetPrice: 229,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-12"), 269, "Amazon Brasil", "https://www.amazon.com.br/s?k=cole%C3%A7%C3%A3o+de+livros"),
          historyEntry(dateAt("2026-05-15"), 249, "Mercado Livre", "https://www.mercadolivre.com.br/colecao-de-livros"),
          historyEntry(dateAt("2026-06-24"), 229, "Amazon Brasil", "https://www.amazon.com.br/s?k=cole%C3%A7%C3%A3o+de+livros"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 229, "https://www.amazon.com.br/s?k=cole%C3%A7%C3%A3o+de+livros"),
          offer("Mercado Livre", 235, "https://www.mercadolivre.com.br/colecao-de-livros"),
        ],
        createdAt: "2026-01-12T11:00:00.000Z",
        updatedAt: "2026-06-24T11:00:00.000Z",
      },
      {
        id: "gift-art-kit",
        name: "Kit de aquarela",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/kit-aquarela",
        imageUrl:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 179,
        currentPrice: 159,
        lowestPrice: 149,
        highestPrice: 189,
        targetPrice: 159,
        currency: "BRL",
        priority: "nice_to_have",
        status: "reserved",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-01"), 189, "Mercado Livre", "https://www.mercadolivre.com.br/kit-aquarela"),
          historyEntry(dateAt("2026-05-30"), 169, "Amazon Brasil", "https://www.amazon.com.br/s?k=kit+aquarela"),
          historyEntry(dateAt("2026-06-28"), 159, "Mercado Livre", "https://www.mercadolivre.com.br/kit-aquarela"),
        ],
        priceOffers: [
          offer("Mercado Livre", 159, "https://www.mercadolivre.com.br/kit-aquarela"),
          offer("Amazon Brasil", 165, "https://www.amazon.com.br/s?k=kit+aquarela"),
        ],
        createdAt: "2026-02-01T10:20:00.000Z",
        updatedAt: "2026-06-28T10:00:00.000Z",
      },
      {
        id: "gift-cozy-pajama",
        name: "Pijama aconchegante",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/pijama-aconchegante",
        imageUrl:
          "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 169,
        currentPrice: 149,
        lowestPrice: 139,
        highestPrice: 179,
        targetPrice: 149,
        currency: "BRL",
        priority: "surprise_me",
        status: "purchased",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-20"), 179, "Magalu", "https://www.magazineluiza.com.br/pijama-aconchegante"),
          historyEntry(dateAt("2026-05-19"), 169, "Amazon Brasil", "https://www.amazon.com.br/s?k=pijama+aconchegante"),
          historyEntry(dateAt("2026-06-25"), 149, "Magalu", "https://www.magazineluiza.com.br/pijama-aconchegante"),
        ],
        priceOffers: [
          offer("Magalu", 149, "https://www.magazineluiza.com.br/pijama-aconchegante"),
          offer("Amazon Brasil", 155, "https://www.amazon.com.br/s?k=pijama+aconchegante"),
        ],
        createdAt: "2026-03-04T09:30:00.000Z",
        updatedAt: "2026-06-25T09:40:00.000Z",
      },
      {
        id: "gift-toy-camera",
        name: "Câmera de brinquedo",
        storeName: "Little Studio",
        storeUrl: "https://www.amazon.com.br/s?k=camera+de+brinquedo",
        imageUrl:
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 89,
        currentPrice: 79,
        lowestPrice: 69,
        highestPrice: 99,
        targetPrice: 79,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-08"), 99, "Little Studio", "https://www.amazon.com.br/s?k=camera+de+brinquedo"),
          historyEntry(dateAt("2026-05-10"), 89, "Amazon Brasil", "https://www.amazon.com.br/s?k=camera+de+brinquedo"),
          historyEntry(dateAt("2026-06-23"), 79, "Little Studio", "https://www.amazon.com.br/s?k=camera+de+brinquedo"),
        ],
        priceOffers: [
          offer("Little Studio", 79, "https://www.amazon.com.br/s?k=camera+de+brinquedo"),
          offer("Amazon Brasil", 83, "https://www.amazon.com.br/s?k=camera+de+brinquedo"),
        ],
        createdAt: "2026-04-08T12:10:00.000Z",
        updatedAt: "2026-06-23T16:00:00.000Z",
      },
      {
        id: "gift-story-books",
        name: "Livros infantis",
        storeName: "Book Nook",
        storeUrl: "https://www.amazon.com.br/s?k=livros+infantis",
        imageUrl:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 159,
        currentPrice: 139,
        lowestPrice: 129,
        highestPrice: 169,
        targetPrice: 139,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-02"), 169, "Book Nook", "https://www.amazon.com.br/s?k=livros+infantis"),
          historyEntry(dateAt("2026-05-27"), 149, "Amazon Brasil", "https://www.amazon.com.br/s?k=livros+infantis"),
          historyEntry(dateAt("2026-06-24"), 139, "Book Nook", "https://www.amazon.com.br/s?k=livros+infantis"),
        ],
        priceOffers: [
          offer("Book Nook", 139, "https://www.amazon.com.br/s?k=livros+infantis"),
          offer("Amazon Brasil", 145, "https://www.amazon.com.br/s?k=livros+infantis"),
        ],
        createdAt: "2026-04-12T08:00:00.000Z",
        updatedAt: "2026-06-24T08:00:00.000Z",
      },
    ],
  },
  {
    id: "sofia-birthday",
    shareId: "sofia-7",
    title: "Sofia's Birthday",
    occasion: "birthday",
    type: "event",
    eventDate: "2026-08-24",
    message: "Montei essa listinha para ajudar quem pediu sugestões de presente 💛",
    coverImageUrl:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1400&q=80",
    visibility: "public_link",
    themePreset: "birthday",
    themePrimaryColor: "#DE7762",
    themeSecondaryColor: "#DCD2FF",
    useCustomTheme: false,
    isPriceRadarEnabled: false,
    createdAt: "2026-01-03T13:00:00.000Z",
    gifts: [
      {
        id: "gift-story-camera",
        name: "Câmera de brinquedo em madeira",
        storeName: "Little Studio",
        storeUrl: "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira",
        imageUrl:
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 99,
        currentPrice: 89,
        lowestPrice: 79,
        highestPrice: 109,
        targetPrice: 89,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-03"), 109, "Little Studio", "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
          historyEntry(dateAt("2026-05-13"), 99, "Amazon Brasil", "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
          historyEntry(dateAt("2026-06-24"), 89, "Little Studio", "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
        ],
        priceOffers: [
          offer("Little Studio", 89, "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
          offer("Amazon Brasil", 93, "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
        ],
        createdAt: "2026-01-15T10:00:00.000Z",
        updatedAt: "2026-06-24T10:10:00.000Z",
      },
      {
        id: "gift-art-kit-sofia",
        name: "Kit de materiais de arte",
        storeName: "Tiny Makers",
        storeUrl: "https://www.amazon.com.br/s?k=kit+de+arte+infantil",
        imageUrl:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 139,
        currentPrice: 129,
        lowestPrice: 119,
        highestPrice: 149,
        targetPrice: 129,
        currency: "BRL",
        priority: "nice_to_have",
        status: "purchased",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-19"), 149, "Tiny Makers", "https://www.amazon.com.br/s?k=kit+de+arte+infantil"),
          historyEntry(dateAt("2026-05-20"), 139, "Amazon Brasil", "https://www.amazon.com.br/s?k=kit+de+arte+infantil"),
          historyEntry(dateAt("2026-06-20"), 129, "Tiny Makers", "https://www.amazon.com.br/s?k=kit+de+arte+infantil"),
        ],
        priceOffers: [
          offer("Tiny Makers", 129, "https://www.amazon.com.br/s?k=kit+de+arte+infantil"),
          offer("Amazon Brasil", 134, "https://www.amazon.com.br/s?k=kit+de+arte+infantil"),
        ],
        createdAt: "2026-01-20T08:20:00.000Z",
        updatedAt: "2026-06-20T08:20:00.000Z",
      },
      {
        id: "gift-cozy-pajama-sofia",
        name: "Pijama aconchegante",
        storeName: "Sunday Cotton",
        storeUrl: "https://www.amazon.com.br/s?k=pijama+aconchegante+infantil",
        imageUrl:
          "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 119,
        currentPrice: 109,
        lowestPrice: 99,
        highestPrice: 129,
        targetPrice: 109,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-28"), 129, "Sunday Cotton", "https://www.amazon.com.br/s?k=pijama+aconchegante+infantil"),
          historyEntry(dateAt("2026-05-30"), 119, "Amazon Brasil", "https://www.amazon.com.br/s?k=pijama+aconchegante+infantil"),
          historyEntry(dateAt("2026-06-25"), 109, "Sunday Cotton", "https://www.amazon.com.br/s?k=pijama+aconchegante+infantil"),
        ],
        priceOffers: [
          offer("Sunday Cotton", 109, "https://www.amazon.com.br/s?k=pijama+aconchegante+infantil"),
          offer("Amazon Brasil", 114, "https://www.amazon.com.br/s?k=pijama+aconchegante+infantil"),
        ],
        createdAt: "2026-02-01T13:50:00.000Z",
        updatedAt: "2026-06-25T09:15:00.000Z",
      },
      {
        id: "gift-books-sofia",
        name: "Coleção de livros infantis",
        storeName: "Book Nook",
        storeUrl: "https://www.amazon.com.br/s?k=livros+infantis+colecao",
        imageUrl:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 149,
        currentPrice: 139,
        lowestPrice: 129,
        highestPrice: 159,
        targetPrice: 139,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-05-03"), 159, "Book Nook", "https://www.amazon.com.br/s?k=livros+infantis+colecao"),
          historyEntry(dateAt("2026-05-29"), 149, "Amazon Brasil", "https://www.amazon.com.br/s?k=livros+infantis+colecao"),
          historyEntry(dateAt("2026-06-24"), 139, "Book Nook", "https://www.amazon.com.br/s?k=livros+infantis+colecao"),
        ],
        priceOffers: [
          offer("Book Nook", 139, "https://www.amazon.com.br/s?k=livros+infantis+colecao"),
          offer("Amazon Brasil", 145, "https://www.amazon.com.br/s?k=livros+infantis+colecao"),
        ],
        createdAt: "2026-02-14T11:10:00.000Z",
        updatedAt: "2026-06-24T11:10:00.000Z",
      },
      {
        id: "gift-wooden-toy-camera",
        name: "Câmera de brinquedo em madeira",
        storeName: "Little Studio",
        storeUrl: "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira",
        imageUrl:
          "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 99,
        currentPrice: 89,
        lowestPrice: 79,
        highestPrice: 109,
        targetPrice: 89,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-03"), 109, "Little Studio", "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
          historyEntry(dateAt("2026-05-13"), 99, "Amazon Brasil", "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
          historyEntry(dateAt("2026-06-24"), 89, "Little Studio", "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
        ],
        priceOffers: [
          offer("Little Studio", 89, "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
          offer("Amazon Brasil", 93, "https://www.amazon.com.br/s?k=camera+de+brinquedo+madeira"),
        ],
        createdAt: "2026-01-15T10:00:00.000Z",
        updatedAt: "2026-06-24T10:10:00.000Z",
      },
    ],
  },
  {
    id: "familia",
    shareId: "family-gabriel",
    title: "Família",
    occasion: "christmas",
    type: "event",
    eventDate: "2026-12-24",
    message: "Pequenos itens práticos para presentear sem repetir nada.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1400&q=80",
    visibility: "public_link",
    themePreset: "christmas",
    themePrimaryColor: "#9F4F45",
    themeSecondaryColor: "#D9E5D6",
    useCustomTheme: false,
    isPriceRadarEnabled: false,
    createdAt: "2026-03-12T11:05:00.000Z",
    gifts: [
      {
        id: "gift-family-speaker",
        name: "Echo Dot",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=echo+dot",
        imageUrl:
          "https://images.unsplash.com/photo-1582192496308-7ef02f7b2e78?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 349,
        currentPrice: 289,
        lowestPrice: 279,
        highestPrice: 369,
        targetPrice: 299,
        currency: "BRL",
        priority: "must_have",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-20"), 369, "Amazon Brasil", "https://www.amazon.com.br/s?k=echo+dot"),
          historyEntry(dateAt("2026-05-21"), 319, "Mercado Livre", "https://www.mercadolivre.com.br/echo-dot"),
          historyEntry(dateAt("2026-06-28"), 289, "Amazon Brasil", "https://www.amazon.com.br/s?k=echo+dot"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 289, "https://www.amazon.com.br/s?k=echo+dot"),
          offer("Mercado Livre", 295, "https://www.mercadolivre.com.br/echo-dot"),
        ],
        createdAt: "2026-03-15T09:10:00.000Z",
        updatedAt: "2026-06-28T14:15:00.000Z",
      },
      {
        id: "gift-family-coffee",
        name: "Cafeteira Nespresso",
        storeName: "Fast Shop",
        storeUrl: "https://www.fastshop.com.br/nespresso",
        imageUrl:
          "https://images.unsplash.com/photo-1515825295580-5bb9e9a1a54f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 799,
        currentPrice: 749,
        lowestPrice: 699,
        highestPrice: 829,
        targetPrice: 719,
        currency: "BRL",
        priority: "nice_to_have",
        status: "available",
        purchaseType: "collective",
        fundingGoalAmount: 799,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 299,
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-12"), 829, "Fast Shop", "https://www.fastshop.com.br/nespresso"),
          historyEntry(dateAt("2026-05-07"), 799, "Magalu", "https://www.magazineluiza.com.br/nespresso"),
          historyEntry(dateAt("2026-05-28"), 769, "Amazon Brasil", "https://www.amazon.com.br/s?k=nespresso"),
          historyEntry(dateAt("2026-06-22"), 749, "Fast Shop", "https://www.fastshop.com.br/nespresso"),
        ],
        priceOffers: [
          offer("Fast Shop", 749, "https://www.fastshop.com.br/nespresso"),
          offer("Amazon Brasil", 759, "https://www.amazon.com.br/s?k=nespresso"),
        ],
        createdAt: "2026-04-03T14:10:00.000Z",
        updatedAt: "2026-06-22T15:20:00.000Z",
      },
      {
        id: "gift-family-drill",
        name: "Furadeira Bosch",
        storeName: "Mercado Livre",
        storeUrl: "https://www.mercadolivre.com.br/furadeira-bosch",
        imageUrl:
          "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 449,
        currentPrice: 389,
        lowestPrice: 359,
        highestPrice: 469,
        targetPrice: 369,
        currency: "BRL",
        priority: "nice_to_have",
        status: "reserved",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-02"), 469, "Mercado Livre", "https://www.mercadolivre.com.br/furadeira-bosch"),
          historyEntry(dateAt("2026-05-06"), 439, "KaBuM!", "https://www.kabum.com.br/busca/furadeira-bosch"),
          historyEntry(dateAt("2026-05-29"), 409, "Amazon Brasil", "https://www.amazon.com.br/s?k=furadeira+bosch"),
          historyEntry(dateAt("2026-06-27"), 389, "Mercado Livre", "https://www.mercadolivre.com.br/furadeira-bosch"),
        ],
        priceOffers: [
          offer("Mercado Livre", 389, "https://www.mercadolivre.com.br/furadeira-bosch"),
          offer("Amazon Brasil", 399, "https://www.amazon.com.br/s?k=furadeira+bosch"),
        ],
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedAt: "2026-06-27T09:00:00.000Z",
      },
      {
        id: "gift-family-vacuum",
        name: "Robô aspirador compacto",
        storeName: "Magalu",
        storeUrl: "https://www.magazineluiza.com.br/robo-aspirador-compacto",
        imageUrl:
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 1399,
        currentPrice: 1299,
        lowestPrice: 1249,
        highestPrice: 1499,
        targetPrice: 1249,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "collective",
        fundingGoalAmount: 1399,
        fundingCurrency: "BRL",
        fundingReceivedAmount: 480,
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-03-09"), 1499, "Mercado Livre", "https://www.mercadolivre.com.br/robo-aspirador"),
          historyEntry(dateAt("2026-04-17"), 1449, "Amazon Brasil", "https://www.amazon.com.br/s?k=robo+aspirador"),
          historyEntry(dateAt("2026-05-25"), 1349, "Magalu", "https://www.magazineluiza.com.br/robo-aspirador"),
          historyEntry(dateAt("2026-06-27"), 1299, "Magalu", "https://www.magazineluiza.com.br/robo-aspirador"),
        ],
        priceOffers: [
          offer("Magalu", 1299, "https://www.magazineluiza.com.br/robo-aspirador"),
          offer("Mercado Livre", 1349, "https://www.mercadolivre.com.br/robo-aspirador"),
        ],
        createdAt: "2026-04-21T12:00:00.000Z",
        updatedAt: "2026-06-27T16:15:00.000Z",
      },
      {
        id: "gift-family-pans",
        name: "Jogo de panelas",
        storeName: "Amazon Brasil",
        storeUrl: "https://www.amazon.com.br/s?k=jogo+de+panelas",
        imageUrl:
          "https://images.unsplash.com/photo-1517244683847-03b9f2f6a5bd?auto=format&fit=crop&w=900&q=80",
        estimatedPrice: 389,
        currentPrice: 359,
        lowestPrice: 339,
        highestPrice: 409,
        targetPrice: 349,
        currency: "BRL",
        priority: "surprise_me",
        status: "available",
        purchaseType: "individual",
        priceTrackingEnabled: false,
        priceRadarPriority: "future_gift",
        priceAlertPreferences: [],
        priceHistory: [
          historyEntry(dateAt("2026-04-19"), 409, "Amazon Brasil", "https://www.amazon.com.br/s?k=jogo+de+panelas"),
          historyEntry(dateAt("2026-05-21"), 389, "Magalu", "https://www.magazineluiza.com.br/jogo-de-panelas"),
          historyEntry(dateAt("2026-06-25"), 359, "Amazon Brasil", "https://www.amazon.com.br/s?k=jogo+de+panelas"),
        ],
        priceOffers: [
          offer("Amazon Brasil", 359, "https://www.amazon.com.br/s?k=jogo+de+panelas"),
          offer("Magalu", 369, "https://www.magazineluiza.com.br/jogo-de-panelas"),
        ],
        createdAt: "2026-05-02T09:10:00.000Z",
        updatedAt: "2026-06-25T09:45:00.000Z",
      },
    ],
  },
];

const initialWishlists = wishlistSeeds.map((seed) => buildWishlist(seed));

const initialState: DemoState = {
  session: buildSession(),
  profile: buildProfile(),
  wishlists: initialWishlists,
  affiliateMerchants: buildMerchants(),
  sponsoredItems: buildSponsoredItems(),
  adminAuditLogs: buildAuditLogs(),
  reservations: [],
  contributions: [],
  affiliateLinks: [],
  notifications: buildNotifications(),
  alerts: buildAlerts(),
  feed: buildFeed(),
};

let memoryState: DemoState | null = null;

function readState(): DemoState {
  if (memoryState) {
    return memoryState;
  }

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DemoState;
        if (Array.isArray(parsed.wishlists) && parsed.wishlists.length > 0) {
          memoryState = parsed;
          return memoryState;
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  memoryState = clone(initialState);
  persistState(memoryState);
  return memoryState;
}

function persistState(state: DemoState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateState(mutator: (state: DemoState) => DemoState | void) {
  const state = clone(readState());
  const maybeNext = mutator(state);
  const nextState = maybeNext ?? state;
  memoryState = nextState;
  persistState(nextState);
  return nextState;
}

function syncWishlistInPlace(state: DemoState, wishlist: WishlistWithGifts) {
  const index = state.wishlists.findIndex((item) => item.id === wishlist.id);
  if (index >= 0) {
    state.wishlists[index] = wishlist;
  } else {
    state.wishlists.unshift(wishlist);
  }
}

function toWishlistClone(wishlist: WishlistWithGifts) {
  return clone(wishlist);
}

function toReservationClone(reservation: ReservationRecord) {
  return clone(reservation);
}

function toMerchantClone(merchant: AffiliateMerchantRecord) {
  return clone(merchant);
}

function toSponsoredClone(item: SponsoredItemRecord) {
  return clone(item);
}

function toAuditClone(log: AdminAuditLogRecord) {
  return clone(log);
}

function makeGiftSeedFromInput(
  _wishlist: WishlistWithGifts,
  input: {
    name: string;
    description?: string;
    store_url?: string;
    image_url?: string;
    estimated_price?: number;
    currency: string;
    priority: GiftRecord["priority"];
    purchase_type: GiftPurchaseType;
    funding_goal_amount?: number;
    funding_currency?: string;
    price_tracking_enabled: boolean;
    current_price?: number;
    target_price?: number;
    price_radar_priority: PriceRadarPriority;
    price_alert_preferences: PriceAlertPreference[];
  },
): GiftRecord {
  const basePrice = input.current_price ?? input.estimated_price ?? 0;
  const history = input.price_tracking_enabled
    ? [
        historyEntry(dateAt("2026-06-16"), Math.max(0, Math.round(basePrice * 1.08)), storeNameFromUrl(input.store_url), input.store_url || "https://www.amazon.com.br"),
        historyEntry(dateAt("2026-06-24"), Math.max(0, Math.round(basePrice * 1.02)), storeNameFromUrl(input.store_url), input.store_url || "https://www.amazon.com.br"),
        historyEntry(dateAt("2026-06-29"), Math.max(0, Math.round(basePrice)), storeNameFromUrl(input.store_url), input.store_url || "https://www.amazon.com.br"),
      ]
    : [];

  return buildGift(
    {
      id: uuid("gift"),
      name: input.name,
      description: input.description,
      storeName: storeNameFromUrl(input.store_url),
      storeUrl: input.store_url || "",
      imageUrl:
        input.image_url ||
        "https://images.unsplash.com/photo-1525097487452-6278ff080c31?auto=format&fit=crop&w=900&q=80",
      estimatedPrice: input.estimated_price ?? basePrice,
      currentPrice: input.current_price ?? basePrice,
      lowestPrice: Math.max(0, Math.round(basePrice * 0.9)),
      highestPrice: Math.max(1, Math.round(basePrice * 1.12)),
      targetPrice: input.target_price ?? basePrice,
      currency: input.currency.toUpperCase(),
      priority: input.priority,
      status: "available",
      purchaseType: input.purchase_type,
      fundingGoalAmount: input.funding_goal_amount,
      fundingCurrency: input.funding_currency || input.currency,
      fundingReceivedAmount: 0,
      priceTrackingEnabled: input.price_tracking_enabled,
      priceRadarPriority: input.price_radar_priority,
      priceAlertPreferences: input.price_alert_preferences,
      priceHistory: history,
      priceOffers: [
        offer(storeNameFromUrl(input.store_url), Math.max(0, Math.round(basePrice)), input.store_url || "https://www.amazon.com.br"),
      ],
      createdAt: nowIso(45),
      updatedAt: nowIso(45),
    },
    _wishlist.id,
  );
}

function storeNameFromUrl(url?: string) {
  if (!url) {
    return "Wishly";
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("amazon")) return "Amazon Brasil";
    if (host.includes("mercadolivre")) return "Mercado Livre";
    if (host.includes("kabum")) return "KaBuM!";
    if (host.includes("magazineluiza")) return "Magalu";
    if (host.includes("fastshop")) return "Fast Shop";
    if (host.includes("apple")) return "Apple";
    if (host.includes("samsung")) return "Samsung";
    return host.split(".")[0] || "Wishly";
  } catch {
    return "Wishly";
  }
}

export function isDemoStateReady() {
  return true;
}

export function getDemoSession() {
  return clone(readState().session);
}

export function getDemoProfile() {
  return clone(readState().profile);
}

export function getDemoUser() {
  const session = readState().session;
  return {
    id: session.user.id,
    email: session.user.email,
    user_metadata: clone(session.user.user_metadata),
  };
}

export function getDemoWishlists() {
  return readState().wishlists.map(toWishlistClone);
}

export function getDemoWishlistById(id: string) {
  const wishlist = readState().wishlists.find((item) => item.id === id) ?? null;
  return wishlist ? clone(wishlist) : null;
}

export function getDemoWishlistByShareId(shareId: string) {
  const wishlist = readState().wishlists.find((item) => item.share_id === shareId) ?? null;
  return wishlist ? clone(wishlist) : null;
}

export function createDemoWishlist(input: {
  owner_id: string;
  title: string;
  occasion: string;
  type: WishlistType;
  event_date?: string;
  message?: string;
  cover_image_url?: string;
  visibility: WishlistVisibility;
  theme_preset: WishlistThemePreset;
  theme_primary_color: string;
  theme_secondary_color: string;
  use_custom_theme: boolean;
  is_price_radar_enabled: boolean;
  locale: Locale;
}) {
  let createdWishlist: WishlistWithGifts | null = null;
  updateState((state) => {
    const wishlist: WishlistWithGifts = {
      id: uuid("wishlist"),
      owner_id: input.owner_id,
      type: input.type,
      title: input.title,
      occasion: input.occasion,
      event_date: input.event_date || null,
      message: input.message || null,
      cover_image_url: input.cover_image_url || null,
      theme_color: null,
      theme_preset: input.theme_preset,
      theme_primary_color: input.use_custom_theme ? input.theme_primary_color : null,
      theme_secondary_color: input.use_custom_theme ? input.theme_secondary_color : null,
      use_custom_theme: input.use_custom_theme,
      is_price_radar_enabled: input.is_price_radar_enabled,
      slug: null,
      visibility: input.visibility,
      share_id: `demo-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
      locale: input.locale,
      rsvp_enabled: false,
      event_location: null,
      event_time: null,
      max_guests: null,
      created_at: nowIso(20),
      updated_at: nowIso(20),
      archived_at: null,
      gifts: [],
    };

    syncWishlistInPlace(state, wishlist);
    createdWishlist = wishlist;
    state.adminAuditLogs.unshift({
      id: uuid("audit"),
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "wishlist.created",
      entity_type: "wishlist",
      entity_id: wishlist.id,
      before_data: null,
      after_data: { title: wishlist.title, share_id: wishlist.share_id },
      created_at: nowIso(5),
    });

    return state;
  });

  return clone(createdWishlist as unknown as WishlistWithGifts);
}

export function updateDemoWishlist(input: {
  id: string;
  title: string;
  occasion: string;
  type: WishlistType;
  event_date?: string;
  message?: string;
  cover_image_url?: string;
  visibility: WishlistVisibility;
  theme_preset: WishlistThemePreset;
  theme_primary_color: string;
  theme_secondary_color: string;
  use_custom_theme: boolean;
  is_price_radar_enabled: boolean;
}) {
  return updateState((state) => {
    const wishlist = state.wishlists.find((item) => item.id === input.id);
    if (!wishlist) return state;
    wishlist.title = input.title;
    wishlist.occasion = input.occasion;
    wishlist.type = input.type;
    wishlist.event_date = input.event_date || null;
    wishlist.message = input.message || null;
    wishlist.cover_image_url = input.cover_image_url || null;
    wishlist.visibility = input.visibility;
    wishlist.theme_preset = input.theme_preset;
    wishlist.theme_primary_color = input.use_custom_theme ? input.theme_primary_color : null;
    wishlist.theme_secondary_color = input.use_custom_theme ? input.theme_secondary_color : null;
    wishlist.use_custom_theme = input.use_custom_theme;
    wishlist.is_price_radar_enabled = input.is_price_radar_enabled;
    wishlist.updated_at = nowIso(3);
    state.adminAuditLogs.unshift({
      id: uuid("audit"),
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "wishlist.updated",
      entity_type: "wishlist",
      entity_id: wishlist.id,
      before_data: null,
      after_data: { title: wishlist.title, visibility: wishlist.visibility },
      created_at: nowIso(3),
    });
    return state;
  });
}

export function archiveDemoWishlist(wishlistId: string) {
  return updateState((state) => {
    const wishlist = state.wishlists.find((item) => item.id === wishlistId);
    if (wishlist) {
      wishlist.archived_at = nowIso(1);
      wishlist.updated_at = nowIso(1);
    }
    return state;
  });
}

export function restoreDemoWishlist(wishlistId: string) {
  return updateState((state) => {
    const wishlist = state.wishlists.find((item) => item.id === wishlistId);
    if (wishlist) {
      wishlist.archived_at = null;
      wishlist.updated_at = nowIso(1);
    }
    return state;
  });
}

export function listDemoWishlists() {
  return getDemoWishlists();
}

export function listDemoActiveWishlists() {
  return getDemoWishlists().filter((wishlist) => wishlist.archived_at === null);
}

export function getDemoWishlist(id: string) {
  const wishlist = readState().wishlists.find((item) => item.id === id);
  return wishlist ? toWishlistClone(wishlist) : null;
}

export function getDemoPublicWishlist(shareId: string) {
  const wishlist = readState().wishlists.find((item) => item.share_id === shareId && item.visibility === "public_link");
  return wishlist ? toWishlistClone(wishlist) : null;
}

export function listDemoReservationsForWishlist(wishlistId: string) {
  return readState()
    .reservations.filter((reservation) => reservation.wishlist_id === wishlistId)
    .map(toReservationClone);
}

export function createDemoGift(input: {
  wishlist_id: string;
  name: string;
  description?: string;
  store_url?: string;
  image_url?: string;
  estimated_price?: number;
  currency: string;
  priority: GiftRecord["priority"];
  purchase_type: GiftPurchaseType;
  funding_goal_amount?: number;
  funding_currency?: string;
  price_tracking_enabled: boolean;
  current_price?: number;
  target_price?: number;
  price_radar_priority: PriceRadarPriority;
  price_alert_preferences: PriceAlertPreference[];
}) {
  let createdGift: GiftRecord | null = null;
  updateState((state) => {
    const wishlist = state.wishlists.find((item) => item.id === input.wishlist_id);
    if (!wishlist) {
      return state;
    }
    const gift = makeGiftSeedFromInput(wishlist, input);
    wishlist.gifts.unshift(gift);
    createdGift = gift;
    wishlist.updated_at = nowIso(2);
    state.adminAuditLogs.unshift({
      id: uuid("audit"),
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "gift.created",
      entity_type: "gift",
      entity_id: gift.id,
      before_data: null,
      after_data: { name: gift.name, wishlist_id: gift.wishlist_id },
      created_at: nowIso(2),
    });
    return state;
  });

  return clone(createdGift as unknown as GiftRecord);
}

export function updateDemoGift(input: {
  id: string;
  name: string;
  description?: string;
  store_url?: string;
  image_url?: string;
  estimated_price?: number;
  currency: string;
  priority: GiftRecord["priority"];
  purchase_type: GiftPurchaseType;
  funding_goal_amount?: number;
  funding_currency?: string;
  price_tracking_enabled: boolean;
  current_price?: number;
  target_price?: number;
  price_radar_priority: PriceRadarPriority;
  price_alert_preferences: PriceAlertPreference[];
}) {
  return updateState((state) => {
    for (const wishlist of state.wishlists) {
      const gift = wishlist.gifts.find((item) => item.id === input.id);
      if (!gift) continue;
      const replacement = makeGiftSeedFromInput(wishlist, input);
      replacement.id = gift.id;
      replacement.created_at = gift.created_at;
      replacement.deleted_at = gift.deleted_at;
      wishlist.gifts[wishlist.gifts.findIndex((item) => item.id === gift.id)] = replacement;
      wishlist.updated_at = nowIso(1);
      return state;
    }
    return state;
  });
}

export function updateDemoGiftStatus(giftId: string, status: GiftStatus) {
  return updateState((state) => {
    for (const wishlist of state.wishlists) {
      const gift = wishlist.gifts.find((item) => item.id === giftId);
      if (!gift) continue;
      gift.status = status;
      gift.updated_at = nowIso(1);
      return state;
    }
    return state;
  });
}

export function deleteDemoGift(giftId: string) {
  return updateState((state) => {
    for (const wishlist of state.wishlists) {
      const gift = wishlist.gifts.find((item) => item.id === giftId);
      if (!gift) continue;
      gift.deleted_at = nowIso(1);
      gift.updated_at = nowIso(1);
      wishlist.updated_at = nowIso(1);
      return state;
    }
    return state;
  });
}

export function updateDemoGiftRadarSettings(
  giftId: string,
  input: {
    price_tracking_enabled: boolean;
    current_price?: number | null;
    target_price?: number | null;
    price_radar_priority: PriceRadarPriority;
    price_alert_preferences: PriceAlertPreference[];
  },
) {
  return updateState((state) => {
    for (const wishlist of state.wishlists) {
      const gift = wishlist.gifts.find((item) => item.id === giftId);
      if (!gift) continue;
      gift.price_tracking_enabled = input.price_tracking_enabled;
      gift.current_price = input.current_price ?? gift.current_price;
      gift.target_price = input.target_price ?? gift.target_price;
      gift.price_radar_priority = input.price_radar_priority;
      gift.price_alert_preferences = input.price_alert_preferences;
      gift.updated_at = nowIso(1);
      wishlist.updated_at = nowIso(1);
      return state;
    }
    return state;
  });
}

export function listDemoAffiliateMerchants() {
  return readState().affiliateMerchants.map(toMerchantClone);
}

export function saveDemoAffiliateMerchant(
  input: {
    name: string;
    domain: string;
    status: AffiliateMerchantRecord["status"];
    strategy: AffiliateStrategy;
    deeplink_template?: string;
    tracking_param_name?: string;
    tracking_param_value_env_key?: string;
    notes?: string;
  },
  existing?: AffiliateMerchantRecord | null,
) {
  let savedMerchant: AffiliateMerchantRecord | null = null;
  updateState((draft) => {
    const payload: AffiliateMerchantRecord = {
      id: existing?.id || uuid("merchant"),
      name: input.name,
      domain: input.domain,
      status: input.status,
      strategy: input.strategy,
      deeplink_template: input.deeplink_template || null,
      tracking_param_name: input.tracking_param_name || null,
      tracking_param_value_env_key: input.tracking_param_value_env_key || null,
      notes: input.notes || null,
      created_at: existing?.created_at || nowIso(10),
      updated_at: nowIso(1),
    };

    const index = draft.affiliateMerchants.findIndex((merchant) => merchant.id === payload.id);
    if (index >= 0) {
      draft.affiliateMerchants[index] = payload;
    } else {
      draft.affiliateMerchants.unshift(payload);
    }
    savedMerchant = payload;

    draft.adminAuditLogs.unshift({
      id: uuid("audit"),
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: existing ? "merchant.updated" : "merchant.created",
      entity_type: "affiliate_merchant",
      entity_id: payload.id,
      before_data: existing ? clone(existing) : null,
      after_data: clone(payload),
      created_at: nowIso(1),
    });

    return draft;
  });

  return clone(savedMerchant as unknown as AffiliateMerchantRecord);
}

export function deleteDemoAffiliateMerchant(merchant: AffiliateMerchantRecord) {
  updateState((state) => {
    state.affiliateMerchants = state.affiliateMerchants.filter((item) => item.id !== merchant.id);
    state.adminAuditLogs.unshift({
      id: uuid("audit"),
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: "merchant.deleted",
      entity_type: "affiliate_merchant",
      entity_id: merchant.id,
      before_data: clone(merchant),
      after_data: null,
      created_at: nowIso(1),
    });
    return state;
  });
}

export function listDemoSponsoredItems() {
  return readState().sponsoredItems.map(toSponsoredClone);
}

export function saveDemoSponsoredItem(
  input: {
    title: string;
    description?: string;
    image_url?: string;
    destination_url: string;
    merchant_id?: string;
    category?: string;
    occasion?: string;
    price?: number;
    currency: string;
    locale: SponsoredItemLocale;
    status: SponsoredItemStatus;
    priority: number;
    starts_at?: string;
    ends_at?: string;
  },
  existing?: SponsoredItemRecord | null,
) {
  let savedItem: SponsoredItemRecord | null = null;
  updateState((draft) => {
    const payload: SponsoredItemRecord = {
      id: existing?.id || uuid("sponsored"),
      title: input.title,
      description: input.description || null,
      image_url: input.image_url || null,
      destination_url: input.destination_url,
      merchant_id: input.merchant_id || null,
      category: input.category || null,
      occasion: input.occasion || null,
      price: input.price ?? null,
      currency: input.currency.toUpperCase(),
      locale: input.locale,
      status: input.status,
      priority: input.priority,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      created_at: existing?.created_at || nowIso(10),
      updated_at: nowIso(1),
    };

    const index = draft.sponsoredItems.findIndex((item) => item.id === payload.id);
    if (index >= 0) {
      draft.sponsoredItems[index] = payload;
    } else {
      draft.sponsoredItems.unshift(payload);
    }
    savedItem = payload;

    draft.adminAuditLogs.unshift({
      id: uuid("audit"),
      admin_user_id: DEMO_PROFILE_ID,
      admin_email: DEMO_EMAIL,
      action: existing ? "sponsored_item.updated" : "sponsored_item.created",
      entity_type: "sponsored_item",
      entity_id: payload.id,
      before_data: existing ? clone(existing) : null,
      after_data: clone(payload),
      created_at: nowIso(1),
    });

    return draft;
  });

  return clone(savedItem as unknown as SponsoredItemRecord);
}

export function updateDemoSponsoredItemStatus(item: SponsoredItemRecord, status: SponsoredItemStatus) {
  return saveDemoSponsoredItem(
    {
      title: item.title,
      description: item.description || undefined,
      image_url: item.image_url || undefined,
      destination_url: item.destination_url,
      merchant_id: item.merchant_id || undefined,
      category: item.category || undefined,
      occasion: item.occasion || undefined,
      price: item.price ?? undefined,
      currency: item.currency,
      locale: item.locale,
      status,
      priority: item.priority,
      starts_at: item.starts_at || undefined,
      ends_at: item.ends_at || undefined,
    },
    item,
  );
}

export function listDemoAdminAuditLogs() {
  return readState().adminAuditLogs.slice(0, 8).map(toAuditClone);
}

export function getDemoDashboardSnapshot() {
  const wishlists = readState().wishlists;
  const gifts = wishlists.flatMap((wishlist) => wishlist.gifts.filter((gift) => gift.deleted_at === null));
  return {
    wishlistCount: wishlists.length,
    monitoredProductCount: gifts.filter((gift) => gift.price_tracking_enabled).length,
    alertCount: readState().alerts.length,
    notificationCount: readState().notifications.filter((notification) => notification.read_at === null).length,
    savingsAmount: readState().contributions.reduce((total, contribution) => total + contribution.amount, 0),
    reservedCount: gifts.filter((gift) => gift.status === "reserved").length,
    purchasedCount: gifts.filter((gift) => gift.status === "purchased").length,
    activeWishlists: wishlists.filter((wishlist) => wishlist.archived_at === null).length,
    feed: clone(readState().feed),
    notifications: clone(readState().notifications),
    alerts: clone(readState().alerts),
  };
}

export function reserveDemoGift(input: {
  shareId: string;
  giftId: string;
  reserver_name: string;
  reserver_email: string;
  reserver_message?: string;
}) {
  let reservationId = "";

  updateState((state) => {
    const wishlist = state.wishlists.find((item) => item.share_id === input.shareId);
    if (!wishlist) return state;
    const gift = wishlist.gifts.find((item) => item.id === input.giftId);
    if (!gift || gift.status !== "available") return state;
    gift.status = "reserved";
    gift.updated_at = nowIso(1);
    wishlist.updated_at = nowIso(1);
    const reservation: ReservationRecord = {
      id: uuid("reservation"),
      gift_id: gift.id,
      wishlist_id: wishlist.id,
      reserver_name: input.reserver_name,
      reserver_email: input.reserver_email,
      reserver_message: input.reserver_message || null,
      status: "reserved",
      reserved_at: nowIso(1),
      purchased_at: null,
      cancelled_at: null,
    };
    state.reservations.unshift(reservation);
    reservationId = reservation.id;
    return state;
  });

  return {
    reservation_id: reservationId || uuid("reservation"),
    gift_id: input.giftId,
    status: "reserved" as const,
  };
}

export function createDemoContribution(input: {
  shareId: string;
  giftId: string;
  contributor_name: string;
  contributor_email: string;
  contributor_message?: string;
  amount: number;
  currency: string;
  locale: string;
}) {
  let contributionId = "";
  let checkoutUrl = "";

  updateState((state) => {
    const wishlist = state.wishlists.find((item) => item.share_id === input.shareId);
    if (!wishlist) return state;
    const gift = wishlist.gifts.find((item) => item.id === input.giftId);
    if (!gift) return state;
    const contribution: GiftContributionRecord = {
      id: uuid("contribution"),
      gift_id: gift.id,
      wishlist_id: wishlist.id,
      contributor_name: input.contributor_name,
      contributor_email: input.contributor_email,
      contributor_message: input.contributor_message || null,
      amount: input.amount,
      currency: input.currency,
      payment_provider: "mock",
      payment_status: "pending",
      payment_reference: `demo-${gift.id}-${Date.now()}`,
      checkout_url: `/checkout/mock/${gift.id}`,
      paid_at: null,
      created_at: nowIso(1),
      updated_at: nowIso(1),
    };
    state.contributions.unshift(contribution);
    contributionId = contribution.id;
    checkoutUrl = contribution.checkout_url || `/checkout/mock/${gift.id}`;
    return state;
  });

  return {
    contribution_id: contributionId || uuid("contribution"),
    checkout_url: checkoutUrl || "/checkout/mock/demo",
    payment_status: "pending",
  };
}

export function getDemoContributionCheckout(contributionId: string) {
  const contribution = readState().contributions.find((item) => item.id === contributionId);
  if (!contribution) {
    return null;
  }

  return {
    id: contribution.id,
    gift_id: contribution.gift_id,
    wishlist_id: contribution.wishlist_id,
    share_id: readState().wishlists.find((wishlist) => wishlist.id === contribution.wishlist_id)?.share_id || "",
    gift_name:
      readState().wishlists
        .flatMap((wishlist) => wishlist.gifts)
        .find((gift) => gift.id === contribution.gift_id)?.name || "Gift",
    amount: contribution.amount,
    currency: contribution.currency,
    payment_status: contribution.payment_status,
    payment_provider: contribution.payment_provider,
  };
}

export function confirmDemoContribution(contributionId: string) {
  return updateState((state) => {
    const contribution = state.contributions.find((item) => item.id === contributionId);
    if (!contribution) return state;
    contribution.payment_status = "paid";
    contribution.paid_at = nowIso(1);
    contribution.updated_at = nowIso(1);
    const wishlist = state.wishlists.find((item) => item.id === contribution.wishlist_id);
    const gift = wishlist?.gifts.find((item) => item.id === contribution.gift_id);
    if (gift && gift.purchase_type === "collective") {
      gift.funding_received_amount = (gift.funding_received_amount ?? 0) + contribution.amount;
      gift.funding_status =
        gift.funding_goal_amount && gift.funding_received_amount >= gift.funding_goal_amount
          ? "funded"
          : "active";
      gift.updated_at = nowIso(1);
    }
    return state;
  });

  const contribution = readState().contributions.find((item) => item.id === contributionId);
  return {
    contribution_id: contributionId,
    gift_id: contribution?.gift_id || "",
    payment_status: contribution?.payment_status || "paid",
  };
}

export function resolveDemoGiftRedirect(input: {
  giftId: string;
  shareId: string;
  locale: string;
  userAgent?: string;
  referrer?: string;
}) {
  const wishlist = readState().wishlists.find((item) => item.share_id === input.shareId);
  const gift = wishlist?.gifts.find((item) => item.id === input.giftId);
  const affiliateUrl =
    gift?.store_url?.includes("amazon")
      ? `${gift.store_url}${gift.store_url.includes("?") ? "&" : "?"}tag=wishly-demo-20`
      : gift?.store_url || "https://www.wishlyapp.com.br";

  return {
    url: affiliateUrl,
    gift_id: gift?.id || input.giftId,
    wishlist_id: wishlist?.id || "",
  };
}

export function previewDemoProductUrl(sourceUrl: string) {
  const normalized = sourceUrl.trim();
  const parsed = (() => {
    try {
      return new URL(normalized);
    } catch {
      return null;
    }
  })();

  const host = parsed?.hostname.replace(/^www\./, "").toLowerCase() || "";
  const path = `${parsed?.pathname || ""} ${parsed?.search || ""}`.toLowerCase();
  const haystack = `${host} ${path}`;

  const catalog: Array<{
    match: string[];
    title: string;
    price: number;
    imageUrl: string;
    storeName: string;
  }> = [
    {
      match: ["iphone", "17"],
      title: "iPhone 17 Pro",
      price: 8799,
      imageUrl:
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80",
      storeName: "Apple",
    },
    {
      match: ["playstation", "ps5"],
      title: "PlayStation 5 Slim",
      price: 3459,
      imageUrl:
        "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80",
      storeName: "Mercado Livre",
    },
    {
      match: ["switch", "nintendo"],
      title: "Nintendo Switch 2",
      price: 4299,
      imageUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
      storeName: "KaBuM!",
    },
    {
      match: ["watch", "ultra"],
      title: "Apple Watch Ultra",
      price: 6599,
      imageUrl:
        "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80",
      storeName: "Fast Shop",
    },
    {
      match: ["galaxy", "s26"],
      title: "Galaxy S26",
      price: 6099,
      imageUrl:
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
      storeName: "Samsung",
    },
    {
      match: ["macbook"],
      title: "MacBook Air",
      price: 10499,
      imageUrl:
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
      storeName: "Apple",
    },
    {
      match: ["kindle"],
      title: "Kindle Paperwhite",
      price: 719,
      imageUrl:
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
      storeName: "Amazon Brasil",
    },
    {
      match: ["echo", "dot"],
      title: "Echo Dot",
      price: 289,
      imageUrl:
        "https://images.unsplash.com/photo-1582192496308-7ef02f7b2e78?auto=format&fit=crop&w=900&q=80",
      storeName: "Amazon Brasil",
    },
    {
      match: ["ultragear"],
      title: "Monitor LG UltraGear",
      price: 1899,
      imageUrl:
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80",
      storeName: "KaBuM!",
    },
    {
      match: ["oled", "samsung"],
      title: "TV Samsung OLED",
      price: 6999,
      imageUrl:
        "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
      storeName: "Fast Shop",
    },
    {
      match: ["airfryer", "air-fryer"],
      title: "Air Fryer Philips",
      price: 579,
      imageUrl:
        "https://images.unsplash.com/photo-1608039525955-0b1e5fd0b4b3?auto=format&fit=crop&w=900&q=80",
      storeName: "Amazon Brasil",
    },
    {
      match: ["nespresso"],
      title: "Cafeteira Nespresso",
      price: 749,
      imageUrl:
        "https://images.unsplash.com/photo-1515825295580-5bb9e9a1a54f?auto=format&fit=crop&w=900&q=80",
      storeName: "Fast Shop",
    },
    {
      match: ["bosch", "furadeira"],
      title: "Furadeira Bosch",
      price: 389,
      imageUrl:
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80",
      storeName: "Mercado Livre",
    },
    {
      match: ["cadeira", "gamer"],
      title: "Cadeira Gamer",
      price: 1199,
      imageUrl:
        "https://images.unsplash.com/photo-1505843490701-5d8b6b28ce20?auto=format&fit=crop&w=900&q=80",
      storeName: "KaBuM!",
    },
    {
      match: ["ryzen"],
      title: "Ryzen 9900X",
      price: 3249,
      imageUrl:
        "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80",
      storeName: "KaBuM!",
    },
    {
      match: ["ssd", "990"],
      title: "SSD Samsung 990 Pro",
      price: 629,
      imageUrl:
        "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80",
      storeName: "KaBuM!",
    },
    {
      match: ["hyperx", "headset"],
      title: "Headset HyperX",
      price: 499,
      imageUrl:
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
      storeName: "Mercado Livre",
    },
  ];

  const matched = catalog.find((entry) => entry.match.every((part) => haystack.includes(part)));
  const resolved = matched || {
    match: [],
    title: "Produto com leitura automática",
    price: 199,
    imageUrl:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
    storeName:
      host.includes("amazon")
        ? "Amazon Brasil"
        : host.includes("mercadolivre")
          ? "Mercado Livre"
          : host.includes("kabum")
            ? "KaBuM!"
            : host.includes("magazineluiza")
              ? "Magalu"
              : host.includes("fastshop")
                ? "Fast Shop"
                : host.includes("shein")
                  ? "Shein Brasil"
                  : "Loja brasileira",
  };

  return {
    title: resolved.title,
    price: resolved.price,
    imageUrl: resolved.imageUrl,
    sourceUrl: normalized,
    storeName: resolved.storeName,
    currency: "BRL" as const,
  };
}

export function resetDemoState() {
  memoryState = clone(initialState);
  persistState(memoryState);
  return memoryState;
}
