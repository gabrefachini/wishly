export type Locale = "en" | "pt-BR";

export type WishlistVisibility = "private" | "public_link";
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

export type Profile = {
  id: string;
  auth_user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  locale: Locale;
  created_at: string;
  updated_at: string;
};

export type WishlistRecord = {
  id: string;
  owner_id: string;
  title: string;
  occasion: string;
  event_date: string | null;
  message: string | null;
  cover_image_url: string | null;
  visibility: WishlistVisibility;
  share_id: string;
  locale: Locale;
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

export type AffiliateMerchantRecord = {
  id: string;
  name: string;
  domain: string;
  status: AffiliateMerchantStatus;
  strategy: AffiliateStrategy;
  deeplink_template: string | null;
  tracking_param_name: string | null;
  tracking_param_value: string | null;
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
