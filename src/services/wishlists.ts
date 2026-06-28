import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";
import type {
  GiftPurchaseType,
  GiftRecord,
  GiftStatus,
  PriceAlertPreference,
  PriceRadarPriority,
  ReservationRecord,
  WishlistRecord,
  WishlistType,
  WishlistWithGifts,
} from "../types/domain";

type CreateWishlistInput = {
  owner_id: string;
  title: string;
  occasion: string;
  type: WishlistType;
  event_date?: string;
  message?: string;
  cover_image_url?: string;
  visibility: "private" | "public_link";
  theme_preset: "default" | "baby" | "wedding" | "birthday" | "christmas" | "newHome" | "minimal";
  theme_primary_color: string;
  theme_secondary_color: string;
  use_custom_theme: boolean;
  is_price_radar_enabled: boolean;
  locale: "en" | "pt-BR";
};

type UpdateWishlistInput = {
  id: string;
  title: string;
  occasion: string;
  type: WishlistType;
  event_date?: string;
  message?: string;
  cover_image_url?: string;
  visibility: "private" | "public_link";
  theme_preset: "default" | "baby" | "wedding" | "birthday" | "christmas" | "newHome" | "minimal";
  theme_primary_color: string;
  theme_secondary_color: string;
  use_custom_theme: boolean;
  is_price_radar_enabled: boolean;
};

type CreateGiftInput = {
  wishlist_id: string;
  name: string;
  description?: string;
  store_url?: string;
  image_url?: string;
  estimated_price?: number;
  currency: string;
  priority: "must_have" | "nice_to_have" | "surprise_me";
  purchase_type: GiftPurchaseType;
  funding_goal_amount?: number;
  funding_currency?: string;
  price_tracking_enabled: boolean;
  current_price?: number;
  target_price?: number;
  price_radar_priority: PriceRadarPriority;
  price_alert_preferences: PriceAlertPreference[];
};

type UpdateGiftInput = {
  id: string;
  name: string;
  description?: string;
  store_url?: string;
  image_url?: string;
  estimated_price?: number;
  currency: string;
  priority: "must_have" | "nice_to_have" | "surprise_me";
  purchase_type: GiftPurchaseType;
  funding_goal_amount?: number;
  funding_currency?: string;
  price_tracking_enabled: boolean;
  current_price?: number;
  target_price?: number;
  price_radar_priority: PriceRadarPriority;
  price_alert_preferences: PriceAlertPreference[];
};

export async function listMyWishlists() {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("wishlists")
    .select("*, gifts(*, price_history(*), price_alerts(*))")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as WishlistWithGifts[]).map((wishlist) => ({
    ...wishlist,
    gifts: (wishlist.gifts ?? []).filter((gift) => gift.deleted_at === null),
  }));
}

export async function listActiveWishlists() {
  const items = await listMyWishlists();
  return items.filter((wishlist) => wishlist.archived_at === null);
}

export async function getMyWishlist(id: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("wishlists")
    .select("*, gifts(*, price_history(*), price_alerts(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as WishlistWithGifts),
    gifts: ((data as WishlistWithGifts).gifts ?? []).filter((gift) => gift.deleted_at === null),
  };
}

export async function createWishlist(input: CreateWishlistInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("wishlists")
    .insert({
      ...input,
      event_date: input.event_date || null,
      message: input.message || null,
      cover_image_url: input.cover_image_url || null,
      type: input.type,
      theme_preset: input.theme_preset,
      theme_primary_color: input.theme_primary_color,
      theme_secondary_color: input.theme_secondary_color,
      use_custom_theme: input.use_custom_theme,
      is_price_radar_enabled: input.is_price_radar_enabled,
    })
    .select("*")
    .single<WishlistRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateWishlist(input: UpdateWishlistInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("wishlists")
    .update({
      title: input.title,
      occasion: input.occasion,
      type: input.type,
      event_date: input.event_date || null,
      message: input.message || null,
      cover_image_url: input.cover_image_url || null,
      visibility: input.visibility,
      theme_preset: input.theme_preset,
      theme_primary_color: input.theme_primary_color,
      theme_secondary_color: input.theme_secondary_color,
      use_custom_theme: input.use_custom_theme,
      is_price_radar_enabled: input.is_price_radar_enabled,
    })
    .eq("id", input.id)
    .select("*")
    .single<WishlistRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createGift(input: CreateGiftInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("gifts")
    .insert({
      ...input,
      description: input.description || null,
      store_url: input.store_url || null,
      image_url: input.image_url || null,
      estimated_price: input.estimated_price ?? null,
      currency: input.currency.toUpperCase(),
      funding_goal_amount:
        input.purchase_type === "collective" ? input.funding_goal_amount ?? null : null,
      funding_currency:
        input.purchase_type === "collective"
          ? (input.funding_currency || input.currency).toUpperCase()
          : input.currency.toUpperCase(),
      price_tracking_enabled: input.price_tracking_enabled,
      current_price: input.current_price ?? null,
      target_price: input.target_price ?? null,
      price_radar_priority: input.price_radar_priority,
      price_alert_preferences: input.price_alert_preferences,
    })
    .select("*")
    .single<GiftRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGift(input: UpdateGiftInput) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("gifts")
    .update({
      name: input.name,
      description: input.description || null,
      store_url: input.store_url || null,
      image_url: input.image_url || null,
      estimated_price: input.estimated_price ?? null,
      currency: input.currency.toUpperCase(),
      priority: input.priority,
      purchase_type: input.purchase_type,
      funding_goal_amount:
        input.purchase_type === "collective" ? input.funding_goal_amount ?? null : null,
      funding_currency:
        input.purchase_type === "collective"
          ? (input.funding_currency || input.currency).toUpperCase()
          : input.currency.toUpperCase(),
      price_tracking_enabled: input.price_tracking_enabled,
      current_price: input.current_price ?? null,
      target_price: input.target_price ?? null,
      price_radar_priority: input.price_radar_priority,
      price_alert_preferences: input.price_alert_preferences,
    })
    .eq("id", input.id)
    .select("*")
    .single<GiftRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGiftStatus(giftId: string, status: GiftStatus) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("gifts")
    .update({ status })
    .eq("id", giftId)
    .select("*")
    .single<GiftRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGift(giftId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { error } = await supabase!
    .from("gifts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", giftId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function updateGiftRadarSettings(
  giftId: string,
  input: {
    price_tracking_enabled: boolean;
    current_price?: number | null;
    target_price?: number | null;
    price_radar_priority: PriceRadarPriority;
    price_alert_preferences: PriceAlertPreference[];
  },
) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("gifts")
    .update({
      price_tracking_enabled: input.price_tracking_enabled,
      current_price: input.current_price ?? null,
      target_price: input.target_price ?? null,
      price_radar_priority: input.price_radar_priority,
      price_alert_preferences: input.price_alert_preferences,
    })
    .eq("id", giftId)
    .select("*")
    .single<GiftRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveWishlist(wishlistId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { error } = await supabase!
    .from("wishlists")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", wishlistId)
    .is("archived_at", null);

  if (error) {
    throw error;
  }
}

export async function restoreWishlist(wishlistId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { error } = await supabase!
    .from("wishlists")
    .update({ archived_at: null })
    .eq("id", wishlistId);

  if (error) {
    throw error;
  }
}

export async function listDiscoverSponsoredItems() {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("sponsored_items")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as import("../types/domain").SponsoredItemRecord[];
}

export async function getPublicWishlist(shareId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!.rpc("get_public_wishlist", {
    p_share_id: shareId,
  });

  if (error) {
    throw error;
  }

  return (data as (WishlistRecord & { gifts: GiftRecord[] }) | null) ?? null;
}

export async function listReservationsForWishlist(wishlistId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("gift_reservations")
    .select("*")
    .eq("wishlist_id", wishlistId)
    .order("reserved_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ReservationRecord[];
}
