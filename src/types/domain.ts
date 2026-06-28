export type Locale = "en" | "pt-BR";

export type WishlistVisibility = "private" | "public_link";
export type WishlistType = "event" | "wishlist";
export type GiftPriority = "must_have" | "nice_to_have" | "surprise_me";
export type GiftStatus = "available" | "reserved" | "purchased";
export type ReservationStatus = "reserved" | "purchased" | "cancelled";
export type GiftPurchaseType = "individual" | "collective";
export type FundingStatus = "not_started" | "active" | "funded" | "cancelled";
export type AffiliateMerchantStatus = "active" | "inactive" | "manual" | "unsupported";
export type AffiliateStrategy = "query_param" | "deeplink_template" | "api" | "manual" | "passthrough";
export type AffiliateLinkStatus = "generated" | "fallback" | "failed";
export type ContributionPaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type SponsoredItemStatus = "draft" | "active" | "paused" | "archived";
export type SponsoredItemLocale = "en" | "pt-BR" | "all";
export type WishlistThemeColor = "coral" | "blush" | "terracotta" | "lavender" | "sky" | "sage";
export type WishlistThemePreset = "default" | "baby" | "wedding" | "birthday" | "christmas" | "newHome" | "minimal";
export type EventRsvpResponse = "yes" | "no" | "maybe";
export type AffiliateConversionStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PriceRadarTier = "free" | "premium";
export type PriceTrend = "up" | "down" | "stable" | "unknown";
export type PriceRecommendationStatus = "buy_now" | "good_price" | "normal_price" | "wait" | "high_price" | "no_data";
export type PriceRecommendationSeverity = "positive" | "neutral" | "warning";
export type PriceRadarPriority = "must_buy" | "maybe_buy" | "sale_only" | "future_gift";
export type PriceAlertPreference =
  | "any_drop"
  | "drop_5"
  | "drop_10"
  | "below_target"
  | "back_to_low"
  | "weekly_summary"
  | "relevant_only";

export type GiftPriceHistoryEntry = {
  checked_at: string;
  price: number;
  currency: string;
  store_name: string | null;
  source_url: string | null;
};

export type GiftPriceOffer = {
  store_name: string;
  price: number;
  url: string;
  availability: string;
  last_checked_at: string;
};

export type Profile = {
  id: string;
  auth_user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  locale: Locale;
  price_radar_tier: PriceRadarTier;
  created_at: string;
  updated_at: string;
};

export type WishlistRecord = {
  id: string;
  owner_id: string;
  type: WishlistType;
  title: string;
  occasion: string;
  event_date: string | null;
  message: string | null;
  cover_image_url: string | null;
  theme_color: WishlistThemeColor | null;
  theme_preset: WishlistThemePreset;
  theme_primary_color: string | null;
  theme_secondary_color: string | null;
  use_custom_theme: boolean;
  is_price_radar_enabled: boolean;
  slug: string | null;
  visibility: WishlistVisibility;
  share_id: string;
  locale: Locale;
  rsvp_enabled: boolean;
  event_location: string | null;
  event_time: string | null;
  max_guests: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type GiftRecord = {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  store_url: string | null;
  image_url: string | null;
  estimated_price: number | null;
  currency: string;
  priority: GiftPriority;
  status: GiftStatus;
  purchase_type: GiftPurchaseType;
  funding_goal_amount: number | null;
  funding_currency: string;
  funding_received_amount: number;
  funding_status: FundingStatus;
  price_tracking_enabled: boolean;
  current_price: number | null;
  original_price: number | null;
  lowest_price: number | null;
  highest_price: number | null;
  average_price: number | null;
  target_price: number | null;
  last_checked_at: string | null;
  price_change_percentage: number | null;
  price_trend: PriceTrend;
  opportunity_score: number | null;
  recommendation_status: PriceRecommendationStatus;
  price_radar_priority: PriceRadarPriority;
  price_alert_preferences: PriceAlertPreference[];
  price_history?: GiftPriceHistoryEntry[];
  price_offers?: GiftPriceOffer[];
  source_sponsored_item_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReservationRecord = {
  id: string;
  gift_id: string;
  wishlist_id: string;
  reserver_name: string;
  reserver_email: string;
  reserver_message: string | null;
  status: ReservationStatus;
  reserved_at: string;
  purchased_at: string | null;
  cancelled_at: string | null;
};

export type WishlistWithGifts = WishlistRecord & {
  gifts: GiftRecord[];
};

export type EventRsvpRecord = {
  id: string;
  wishlist_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  response: EventRsvpResponse;
  guests_count: number;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateMerchantRecord = {
  id: string;
  name: string;
  domain: string;
  status: AffiliateMerchantStatus;
  strategy: AffiliateStrategy;
  deeplink_template: string | null;
  tracking_param_name: string | null;
  tracking_param_value_env_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateLinkRecord = {
  id: string;
  gift_id: string;
  original_url: string;
  merchant_id: string | null;
  affiliate_url: string;
  status: AffiliateLinkStatus;
  created_at: string;
  updated_at: string;
};

export type GiftContributionRecord = {
  id: string;
  gift_id: string;
  wishlist_id: string;
  contributor_name: string;
  contributor_email: string;
  contributor_message: string | null;
  amount: number;
  currency: string;
  payment_provider: string;
  payment_status: ContributionPaymentStatus;
  payment_reference: string;
  checkout_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredItemRecord = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  destination_url: string;
  merchant_id: string | null;
  category: string | null;
  occasion: string | null;
  price: number | null;
  currency: string;
  locale: SponsoredItemLocale;
  status: SponsoredItemStatus;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredItemClickRecord = {
  id: string;
  sponsored_item_id: string;
  wishlist_id: string | null;
  share_id: string | null;
  visitor_id: string | null;
  locale: Locale;
  clicked_url: string;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type AffiliateClickRecord = {
  id: string;
  gift_id: string;
  wishlist_id: string;
  affiliate_link_id: string | null;
  share_id: string;
  merchant_id: string | null;
  clicked_url: string;
  user_agent: string | null;
  ip_hash: string | null;
  referrer: string | null;
  locale: Locale;
  created_at: string;
};

export type AffiliateConversionRecord = {
  id: string;
  affiliate_click_id: string | null;
  merchant_id: string | null;
  gift_id: string | null;
  wishlist_id: string | null;
  external_order_id: string | null;
  conversion_status: AffiliateConversionStatus;
  order_amount: number | null;
  commission_amount: number | null;
  currency: string;
  occurred_at: string;
  approved_at: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

export type AdminAuditLogRecord = {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};
