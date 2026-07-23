import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import {
  buildProductExtractionInsert,
  mapAutofillStatusToExtractionStatus,
} from "./product-autofill";

export type DbWish = {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  store_url: string | null;
  image_url: string | null;
  canonical_url?: string | null;
  provider?: ProductExtractionResult["provider"] | null;
  store_name?: string | null;
  seller_name?: string | null;
  external_product_id?: string | null;
  external_variant_id?: string | null;
  current_price?: number | null;
  original_price?: number | null;
  estimated_price: number | null;
  currency: string;
  availability?: ProductExtractionResult["availability"] | null;
  selected_variant?: Array<{
    name: string;
    value: string;
  }> | null;
  image_urls?: string[] | null;
  extracted_at?: string | null;
  extraction_confidence?: ProductExtractionResult["confidence"] | null;
  extraction_warnings?: string[] | null;
  autofill_status?: "not_requested" | "pending" | "success" | "partial" | "failed" | null;
  priority: "must_have" | "nice_to_have" | "surprise_me";
  status: "available" | "reserved" | "purchased";
  purchase_type?: "individual" | "collective";
  funding_goal_amount?: number | null;
  funding_currency?: string | null;
  funding_received_amount?: number | null;
  funding_status?: "not_started" | "active" | "funded" | "cancelled";
  created_at: string;
  affiliate_link?: {
    original_url: string;
    affiliate_url: string;
    status: "generated" | "fallback" | "failed";
  } | null;
};

export type DbWishlist = {
  id: string;
  title: string;
  share_id: string;
  cover_image_url: string | null;
};

export type PublicWishlist = {
  id: string;
  share_id: string;
  title: string;
  occasion: string | null;
  event_date: string | null;
  message: string | null;
  cover_image_url: string | null;
  locale: string | null;
  gifts: DbWish[];
};

export type AdminAffiliateQueueItem = {
  gift_id: string;
  wishlist_id: string;
  wishlist_title: string;
  share_id: string;
  item_title: string;
  original_url: string;
  affiliate_url: string | null;
  affiliate_status: "generated" | "fallback" | "failed";
  merchant_name: string;
  merchant_status: string;
  created_at: string;
  owner_name: string | null;
  owner_email: string;
  canonical_url?: string | null;
  provider?: ProductExtractionResult["provider"] | null;
  store_name?: string | null;
  seller_name?: string | null;
  external_product_id?: string | null;
  external_variant_id?: string | null;
  current_price?: number | null;
  original_price?: number | null;
  availability?: ProductExtractionResult["availability"] | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  extracted_at?: string | null;
  extraction_warnings?: string[] | null;
  autofill_status?: "not_requested" | "pending" | "success" | "partial" | "failed" | null;
};

export type AdminAccountDeletionRequest = {
  id: string;
  user_id: string;
  requested_email: string;
  requested_name: string | null;
  status: "pending" | "processed" | "cancelled";
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
};

export type ProductExtractionResult = {
  originalUrl: string;
  canonicalUrl: string | null;
  resolvedUrl?: string;
  provider:
    | "mercado_livre"
    | "amazon"
    | "shopify"
    | "structured_data"
    | "open_graph"
    | "generic"
    | "manual";
  storeName: string | null;
  sellerName: string | null;
  externalProductId: string | null;
  externalVariantId: string | null;
  resourceType?: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  currentPriceInCents: number | null;
  originalPriceInCents: number | null;
  priceSource?: string;
  currency: string | null;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  selectedVariant: Array<{
    name: string;
    value: string;
  }>;
  extractedAt: string;
  partial: boolean;
  confidence: {
    title: number;
    description: number;
    image: number;
    price: number;
    variant: number;
  };
  warnings: string[];
  timings?: {
    totalMs: number;
    steps: Record<string, number>;
  };
  observability?: Record<string, unknown>;
  rawPayload?: Record<string, unknown> | null;
};

export async function getInitialSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function listenToAuthChanges(callback: (session: Session | null) => void) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => undefined;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));

  return () => subscription.unsubscribe();
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function signUpWithPassword(input: { email: string; password: string; fullName?: string }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: input.fullName ? { full_name: input.fullName } : undefined,
    },
  });

  if (error) throw error;

  return data;
}

export async function createWishlist(input: { title: string; coverImageUrl?: string | null }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase
    .from("wishlists")
    .insert({
      title: input.title,
      share_id: `${slugify(input.title)}-${Math.random().toString(36).slice(2, 8)}`,
      cover_image_url: input.coverImageUrl ?? null,
    })
    .select("id, title, share_id, cover_image_url")
    .single();

  if (error) throw error;

  return data as DbWishlist;
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function extractProductFromUrl(url: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.functions.invoke("extract-product", {
    body: { url },
  });

  if (error) throw error;

  return data as ProductExtractionResult;
}

export async function updateViewerProfile(input: { fullName: string; avatarFile?: File | null }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sessao indisponivel");

  let avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  if (input.avatarFile) {
    const extension = input.avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const bucket = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars";
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, input.avatarFile, {
      cacheControl: "3600",
      upsert: true,
      contentType: input.avatarFile.type || undefined,
    });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    avatarUrl = publicUrlData.publicUrl;
  }

  const nextMetadata = {
    ...user.user_metadata,
    full_name: input.fullName,
    avatar_url: avatarUrl,
  };

  const { data, error } = await supabase.auth.updateUser({
    data: nextMetadata,
  });

  if (error) throw error;

  return data.user;
}

export async function updateViewerEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.auth.updateUser({
    email,
  });

  if (error) throw error;

  return data.user;
}

export async function updateViewerPassword(input: { currentPassword: string; nextPassword: string }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.auth.updateUser({
    password: input.nextPassword,
    current_password: input.currentPassword,
  });

  if (error) throw error;

  return data.user;
}

export async function updateViewerPreferences(input: {
  profileVisibility: "public" | "private";
  defaultListVisibility: "public" | "private";
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sessao indisponivel");

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      privacy: {
        profile_visibility: input.profileVisibility,
        default_list_visibility: input.defaultListVisibility,
      },
    },
  });

  if (error) throw error;

  return data.user;
}

export async function requestViewerAccountDeletion() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sessao indisponivel");

  const { data, error } = await supabase.rpc("request_account_deletion");

  if (error) throw error;

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      account_status: "pending_deletion",
      deletion_requested_at: new Date().toISOString(),
    },
  });

  if (metadataError) throw metadataError;

  return data as AdminAccountDeletionRequest;
}

export async function loadViewerContext(user: User) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const [{ data: wishlistRows, error: wishlistError }, { data: adminFlag, error: adminError }] = await Promise.all([
    supabase.from("wishlists").select("id, title, share_id, cover_image_url").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.rpc("is_admin_user"),
  ]);

  if (wishlistError) throw wishlistError;
  if (adminError) throw adminError;

  return {
    user,
    wishlists: (wishlistRows ?? []) as DbWishlist[],
    isAdmin: Boolean(adminFlag),
  };
}

export async function loadWishlistGifts(wishlistId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const enhancedResponse = await supabase
    .from("gifts")
    .select(
      "id, wishlist_id, name, description, store_url, image_url, canonical_url, provider, store_name, seller_name, external_product_id, external_variant_id, estimated_price, current_price, original_price, currency, availability, selected_variant, image_urls, extracted_at, extraction_confidence, extraction_warnings, autofill_status, priority, status, created_at",
    )
    .eq("wishlist_id", wishlistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  let data: Record<string, unknown>[] | null = enhancedResponse.data as Record<string, unknown>[] | null;
  let error = enhancedResponse.error;

  if (error && isSchemaCompatibilityInsertError(error)) {
    const legacyResponse = await supabase
      .from("gifts")
      .select("id, wishlist_id, name, description, store_url, image_url, estimated_price, currency, priority, status, created_at")
      .eq("wishlist_id", wishlistId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    data = legacyResponse.data as Record<string, unknown>[] | null;
    error = legacyResponse.error;
  }

  if (error) throw error;

  const giftIds = (data ?? []).map((gift) => gift.id);
  let linkMap = new Map<string, DbWish["affiliate_link"]>();

  if (giftIds.length > 0) {
    const { data: linkRows, error: linkError } = await supabase
      .from("affiliate_links")
      .select("gift_id, original_url, affiliate_url, status")
      .in("gift_id", giftIds);

    if (linkError) throw linkError;

    linkMap = new Map(
      (linkRows ?? []).map((row) => [
        row.gift_id,
        {
          original_url: row.original_url,
          affiliate_url: row.affiliate_url,
          status: row.status,
        },
      ]),
    );
  }

  return (data ?? []).map((gift) => ({
    ...gift,
    affiliate_link: linkMap.get(String(gift.id)) ?? null,
  })) as DbWish[];
}

export async function createGift(input: {
  wishlistId: string;
  name: string;
  description: string;
  storeUrl: string;
  priority: DbWish["priority"];
  imageUrl?: string | null;
  estimatedPriceInCents?: number | null;
  currency?: string | null;
  autofill?: {
    requestedUrl: string;
    canonicalUrl?: string | null;
    provider?: ProductExtractionResult["provider"] | null;
    storeName?: string | null;
    sellerName?: string | null;
    externalProductId?: string | null;
    externalVariantId?: string | null;
    availability?: ProductExtractionResult["availability"] | null;
    selectedVariant?: ProductExtractionResult["selectedVariant"];
    imageUrls?: string[];
    imageUrl?: string | null;
    currentPriceInCents?: number | null;
    originalPriceInCents?: number | null;
    extractedAt?: string | null;
    confidence?: ProductExtractionResult["confidence"] | null;
    warnings?: string[];
    status?: "not_requested" | "pending" | "success" | "partial" | "failed" | "timeout";
    errorCode?: string | null;
    errorMessage?: string | null;
    rawPayload?: Record<string, unknown> | null;
  };
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const legacyPayload = {
    wishlist_id: input.wishlistId,
    name: input.name,
    description: input.description || null,
    store_url: input.storeUrl || null,
    image_url: input.imageUrl ?? null,
    estimated_price: input.estimatedPriceInCents ?? null,
    priority: input.priority,
    currency: input.currency ?? "BRL",
    funding_currency: input.currency ?? "BRL",
  };

  const autofillPayload = input.autofill
    ? {
        canonical_url: input.autofill.canonicalUrl ?? null,
        provider: input.autofill.provider ?? null,
        store_name: input.autofill.storeName ?? null,
        seller_name: input.autofill.sellerName ?? null,
        external_product_id: input.autofill.externalProductId ?? null,
        external_variant_id: input.autofill.externalVariantId ?? null,
        availability: input.autofill.availability ?? "unknown",
        selected_variant: input.autofill.selectedVariant ?? [],
        image_urls: input.autofill.imageUrls ?? [],
        current_price: input.autofill.currentPriceInCents ?? input.estimatedPriceInCents ?? null,
        original_price: input.autofill.originalPriceInCents ?? null,
        extracted_at: input.autofill.extractedAt ?? null,
        extraction_confidence: input.autofill.confidence ?? {},
        extraction_warnings: input.autofill.warnings ?? [],
        autofill_status: mapAutofillStatusToExtractionStatus(input.autofill.status) ?? "failed",
        last_extraction_error: input.autofill.errorMessage ?? null,
      }
    : null;

  let data: { id: string } | null = null;
  let error: Error | null = null;

  if (autofillPayload) {
    const response = await supabase
      .from("gifts")
      .insert({
        ...legacyPayload,
        ...autofillPayload,
      })
      .select("id")
      .single();

    data = response.data;
    error = response.error;

    if (error && isSchemaCompatibilityInsertError(error)) {
      const legacyResponse = await supabase.from("gifts").insert(legacyPayload).select("id").single();
      data = legacyResponse.data;
      error = legacyResponse.error;
    }
  } else {
    const response = await supabase.from("gifts").insert(legacyPayload).select("id").single();
    data = response.data;
    error = response.error;
  }

  if (error) throw error;
  if (!data) throw new Error("Nao foi possivel criar o item.");

  if (input.autofill) {
    const extractionInsert = buildProductExtractionInsert({
      giftId: data.id,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      estimatedPriceInCents: input.estimatedPriceInCents,
      currency: input.currency,
      autofill: {
        ...input.autofill,
      },
    });

    if (extractionInsert) {
      const { error: extractionError } = await supabase.from("product_extractions").insert(extractionInsert);

      if (extractionError && !isSchemaCompatibilityInsertError(extractionError)) {
        logSupabaseError("product_extractions.insert", extractionError, extractionInsert);
        throw extractionError;
      }
    }
  }

  return data;
}

export async function loadAdminAffiliateQueue() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("list_admin_affiliate_queue");
  if (error) throw error;

  const queue = (data ?? []) as AdminAffiliateQueueItem[];
  if (queue.length === 0) return queue;

  const giftIds = queue.map((item) => item.gift_id);
  const enhancedGiftResponse = await supabase
    .from("gifts")
    .select(
      "id, canonical_url, provider, store_name, seller_name, external_product_id, external_variant_id, current_price, original_price, availability, image_url, image_urls, extracted_at, extraction_warnings, autofill_status",
    )
    .in("id", giftIds);

  let giftMetadataRows = enhancedGiftResponse.data;
  let giftMetadataError = enhancedGiftResponse.error;

  if (giftMetadataError && isSchemaCompatibilityInsertError(giftMetadataError)) {
    giftMetadataRows = null;
    giftMetadataError = null;
  }

  if (giftMetadataError) throw giftMetadataError;

  const metadataMap = new Map(
    (giftMetadataRows ?? []).map((row) => [
      row.id,
      {
        canonical_url: row.canonical_url,
        provider: row.provider,
        store_name: row.store_name,
        seller_name: row.seller_name,
        external_product_id: row.external_product_id,
        external_variant_id: row.external_variant_id,
        current_price: row.current_price,
        original_price: row.original_price,
        availability: row.availability,
        image_url: row.image_url,
        image_urls: row.image_urls,
        extracted_at: row.extracted_at,
        extraction_warnings: row.extraction_warnings,
        autofill_status: row.autofill_status,
      },
    ]),
  );

  return queue.map((item) => ({
    ...item,
    ...metadataMap.get(item.gift_id),
  })) as AdminAffiliateQueueItem[];
}

export async function loadAdminAccountDeletionRequests() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("list_admin_account_deletion_requests");
  if (error) throw error;

  return (data ?? []) as AdminAccountDeletionRequest[];
}

export async function processAdminAccountDeletionRequest(input: {
  requestId: string;
  status: "processed" | "cancelled";
  notes?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("admin_process_account_deletion_request", {
    p_request_id: input.requestId,
    p_status: input.status,
    p_notes: input.notes ?? null,
  });

  if (error) throw error;

  return data as AdminAccountDeletionRequest;
}

export async function updateAdminAffiliateLink(input: {
  giftId: string;
  affiliateUrl: string;
  status: "generated" | "failed" | "fallback";
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { error } = await supabase.rpc("admin_update_affiliate_link", {
    p_gift_id: input.giftId,
    p_affiliate_url: input.affiliateUrl,
    p_status: input.status,
  });

  if (error) throw error;
}

export async function resolvePublicGiftRedirect(input: {
  shareId: string;
  giftId: string;
  locale?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("resolve_public_gift_redirect", {
    p_share_id: input.shareId,
    p_gift_id: input.giftId,
    p_locale: input.locale ?? "pt-BR",
    p_user_agent: navigator.userAgent,
    p_referrer: window.location.href,
  });

  if (error) {
    logSupabaseError("resolve_public_gift_redirect", error, input);
    throw error;
  }

  return data as { url: string; gift_id: string; wishlist_id: string };
}

export async function loadPublicWishlist(shareId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("get_public_wishlist", {
    p_share_id: shareId,
  });

  if (error) throw error;
  if (!data) return null;

  const wishlist = data as PublicWishlist;
  const giftIds = (wishlist.gifts ?? []).map((gift) => gift.id);
  let linkMap = new Map<string, DbWish["affiliate_link"]>();
  let giftMetadataMap = new Map<string, Partial<DbWish>>();

  if (giftIds.length > 0) {
    const { data: linkRows, error: linkError } = await supabase
      .from("affiliate_links")
      .select("gift_id, original_url, affiliate_url, status")
      .in("gift_id", giftIds);

    if (!linkError) {
      linkMap = new Map(
        (linkRows ?? []).map((row) => [
          row.gift_id,
          {
            original_url: row.original_url,
            affiliate_url: row.affiliate_url,
            status: row.status,
          },
        ]),
      );
    }

    const enhancedGiftResponse = await supabase
      .from("gifts")
      .select(
        "id, canonical_url, provider, store_name, seller_name, external_product_id, external_variant_id, current_price, original_price, availability, selected_variant, image_urls, extracted_at, extraction_confidence, extraction_warnings, autofill_status",
      )
      .in("id", giftIds);

    let giftMetadataRows = enhancedGiftResponse.data;
    let giftMetadataError = enhancedGiftResponse.error;

    if (giftMetadataError && isSchemaCompatibilityInsertError(giftMetadataError)) {
      giftMetadataRows = null;
      giftMetadataError = null;
    }

    if (!giftMetadataError) {
      giftMetadataMap = new Map(
        (giftMetadataRows ?? []).map((row) => [
          row.id,
          {
            canonical_url: row.canonical_url,
            provider: row.provider,
            store_name: row.store_name,
            seller_name: row.seller_name,
            external_product_id: row.external_product_id,
            external_variant_id: row.external_variant_id,
            current_price: row.current_price,
            original_price: row.original_price,
            availability: row.availability,
            selected_variant: row.selected_variant,
            image_urls: row.image_urls,
            extracted_at: row.extracted_at,
            extraction_confidence: row.extraction_confidence,
            extraction_warnings: row.extraction_warnings,
            autofill_status: row.autofill_status,
          },
        ]),
      );
    }
  }

  return {
    ...wishlist,
    gifts: (wishlist.gifts ?? []).map((gift) => ({
      ...gift,
      ...giftMetadataMap.get(gift.id),
      affiliate_link: linkMap.get(gift.id) ?? null,
    })),
  } as PublicWishlist;
}

export const supabaseEnabled = hasSupabaseConfig();

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function isSchemaCompatibilityInsertError(error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  const context = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  return (
    context.includes("could not find the") ||
    context.includes("column") ||
    context.includes("schema cache") ||
    context.includes("product_extractions") ||
    context.includes("does not exist") ||
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.code === "42P01"
  );
}

function logSupabaseError(context: string, error: { code?: string; message?: string; details?: string | null; hint?: string | null }, meta?: unknown) {
  console.error(`[Wishly] ${context}`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    meta: meta ?? null,
  });
}
