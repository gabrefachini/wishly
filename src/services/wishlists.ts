import { supabase } from "../lib/supabase";
import { createShareId } from "../lib/share";
import { invariantSupabase } from "../lib/http";
import type { GiftPurchaseType, GiftRecord, GiftStatus, ReservationRecord, WishlistRecord, WishlistWithGifts } from "../types/domain";

type CreateWishlistInput = {
  owner_id: string;
  title: string;
  occasion: string;
  event_date?: string;
  message?: string;
  cover_image_url?: string;
  visibility: "private" | "public_link";
  locale: "en" | "pt-BR";
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
};

export async function listMyWishlists() {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("wishlists")
    .select("*, gifts(*)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as WishlistWithGifts[]).map((wishlist) => ({
    ...wishlist,
    gifts: (wishlist.gifts ?? []).filter((gift) => gift.deleted_at === null),
  }));
}

export async function getMyWishlist(id: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("wishlists")
    .select("*, gifts(*)")
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
      share_id: createShareId(),
      event_date: input.event_date || null,
      message: input.message || null,
      cover_image_url: input.cover_image_url || null,
    })
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
    })
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
