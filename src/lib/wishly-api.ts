import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import {
  buildProductExtractionInsert,
  mapAutofillStatusToExtractionStatus,
} from "./product-autofill";
import { isFeatureEnabled } from "./feature-flags";

const SUPPORTED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CONVERTIBLE_AVATAR_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const SUPPORTED_WISHLIST_COVER_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export type MercadoLivreConnectionStatus = {
  meli_user_id: string;
  scope: string | null;
  expires_at: string | null;
  connected_at: string;
  last_refreshed_at: string | null;
  revoked_at: string | null;
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

export function listenToAuthChanges(callback: (event: string, session: Session | null) => void) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => undefined;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));

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

export async function resetPasswordForEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  if (error) throw error;
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

export async function createWishlist(input: { title: string; coverFile?: File | null }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sua sessão expirou. Entre novamente para criar a lista.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError) throw profileError;
  if (!profile) throw new Error("Não foi possível localizar o perfil da sua conta.");

  const wishlistId = crypto.randomUUID();
  // A capa é opcional: sem upload a lista nasce sem imagem e a interface usa a capa gerada.
  const uploadedCover = input.coverFile
    ? await uploadWishlistCover({
        userId: user.id,
        wishlistId,
        file: input.coverFile,
      })
    : null;

  const { data, error } = await supabase
    .from("wishlists")
    .insert({
      id: wishlistId,
      owner_id: profile.id,
      title: input.title,
      occasion: "Lista de desejos",
      type: "wishlist",
      locale: "pt-BR",
      share_id: `${slugify(input.title)}-${Math.random().toString(36).slice(2, 8)}`,
      cover_image_url: uploadedCover?.publicUrl ?? null,
    })
    .select("id, title, share_id, cover_image_url")
    .single();

  if (error) {
    if (uploadedCover) {
      await supabase.storage.from(uploadedCover.bucket).remove([uploadedCover.path]);
    }
    throw error;
  }

  return data as DbWishlist;
}

export async function updateWishlistDetails(input: { wishlistId: string; title: string; coverFile?: File | null }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  let uploadedCover: Awaited<ReturnType<typeof uploadWishlistCover>> | null = null;

  if (input.coverFile) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Sua sessão expirou. Entre novamente para editar a lista.");

    uploadedCover = await uploadWishlistCover({
      userId: user.id,
      wishlistId: input.wishlistId,
      file: input.coverFile,
    });
  }

  const { data, error } = await supabase
    .from("wishlists")
    .update({
      title: input.title,
      ...(uploadedCover ? { cover_image_url: uploadedCover.publicUrl } : {}),
    })
    .eq("id", input.wishlistId)
    .select("id, title, share_id, cover_image_url")
    .single();

  if (error) {
    if (uploadedCover) {
      await supabase.storage.from(uploadedCover.bucket).remove([uploadedCover.path]);
    }
    throw error;
  }

  return data as DbWishlist;
}

/**
 * Torna a lista acessível pelo link antes de entregá-lo à pessoa.
 *
 * Gerar a URL sem mudar `visibility` produz um link válido na aparência, mas
 * `get_public_wishlist` o rejeita. A atualização passa pela RLS de dono.
 */
export async function publishWishlistForSharing(wishlistId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase
    .from("wishlists")
    .update({ visibility: "public_link" })
    .eq("id", wishlistId)
    .is("archived_at", null)
    .select("id, title, share_id, cover_image_url")
    .maybeSingle();

  if (error) {
    logSupabaseError("publishWishlistForSharing", error, { wishlistId });
    throw error;
  }

  if (!data) {
    throw new Error("Não foi possível publicar esta lista. Confirme se ela é sua e tente novamente.");
  }

  return data as DbWishlist;
}

/**
 * Exclui a lista para quem é dono dela.
 *
 * Usa `archived_at` em vez de remover a linha: é o mesmo sinal que
 * `loadViewerContext` e `get_public_wishlist` já filtram, então a lista
 * desaparece do app e do link compartilhado sem apagar o histórico de
 * reservas de quem já havia escolhido um presente.
 *
 * A garantia de que só o dono exclui vem da policy `wishlists_owner_all`:
 * para quem não é dono o update não encontra a linha e devolve nada.
 */
export async function deleteWishlist(wishlistId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase
    .from("wishlists")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", wishlistId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteWishlist", error, { wishlistId });
    throw error;
  }

  if (!data) {
    throw new Error("Não foi possível excluir esta lista. Confirme se ela é sua e tente novamente.");
  }

  return data.id as string;
}

async function uploadWishlistCover(input: { userId: string; wishlistId: string; file: File }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  if (!SUPPORTED_WISHLIST_COVER_MIME_TYPES.has(input.file.type)) {
    throw new Error("A capa precisa estar em JPG, PNG ou WebP.");
  }

  if (input.file.size > 6 * 1024 * 1024) {
    throw new Error("A capa deve ter no máximo 6 MB.");
  }

  const extension = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const bucket = import.meta.env.VITE_SUPABASE_WISHLIST_COVER_BUCKET || "wishlist-covers";
  const path = `${input.userId}/${input.wishlistId}/cover-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, input.file, {
    cacheControl: "3600",
    contentType: input.file.type,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { bucket, path, publicUrl: data.publicUrl };
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

  if (error) {
    const response = (error as { context?: unknown; response?: unknown }).context instanceof Response
      ? (error as { context: Response }).context
      : (error as { response?: unknown }).response instanceof Response
        ? (error as { response: Response }).response
        : null;

    let payload: { error?: string; message?: string } | null = null;
    if (response) {
      try {
        payload = await response.clone().json() as { error?: string; message?: string };
      } catch {
        payload = null;
      }
    }

    const nextError = new Error(payload?.message || error.message || "Falha ao extrair produto");
    (nextError as Error & { code?: string; status?: number; cause?: unknown }).code = payload?.error || error.name;
    (nextError as Error & { code?: string; status?: number; cause?: unknown }).status = response?.status;
    (nextError as Error & { code?: string; status?: number; cause?: unknown }).cause = error;
    throw nextError;
  }

  return data as ProductExtractionResult;
}

export async function getMercadoLivreAuthorizationUrl(returnTo?: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.functions.invoke("meli-oauth-start", {
    body: {
      returnTo: returnTo ?? window.location.href,
    },
  });

  if (error) throw error;

  return (data as { authorizationUrl: string }).authorizationUrl;
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
    const avatarFile = await normalizeAvatarFile(input.avatarFile);
    const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const bucket = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars";
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, avatarFile, {
      cacheControl: "3600",
      upsert: true,
      contentType: avatarFile.type || undefined,
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

async function normalizeAvatarFile(file: File) {
  if (SUPPORTED_AVATAR_MIME_TYPES.has(file.type)) {
    return file;
  }

  if (!CONVERTIBLE_AVATAR_MIME_TYPES.has(file.type)) {
    throw new Error("Formato de imagem nao suportado. Use JPG, PNG, WebP, HEIC ou HEIF.");
  }

  const rasterized = await rasterizeAvatarToJpeg(file);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
  return new File([rasterized], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

function rasterizeAvatarToJpeg(file: File) {
  return new Promise<Blob>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Nao foi possivel processar a foto de perfil."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Nao foi possivel converter a foto de perfil."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.92,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel carregar a foto de perfil."));
    };

    image.src = objectUrl;
  });
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

export async function updateRecoveredPassword(nextPassword: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.auth.updateUser({
    password: nextPassword,
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

  const [{ data: wishlistRows, error: wishlistError }, { data: adminFlag, error: adminError }, { data: meliConnectionRow, error: meliConnectionError }] = await Promise.all([
    supabase.from("wishlists").select("id, title, share_id, cover_image_url").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.rpc("is_admin_user"),
    supabase
      .from("meli_connections")
      .select("meli_user_id, scope, expires_at, connected_at, last_refreshed_at, revoked_at")
      .is("revoked_at", null)
      .maybeSingle(),
  ]);

  if (wishlistError) throw wishlistError;
  if (adminError) throw adminError;
  if (meliConnectionError) throw meliConnectionError;

  return {
    user,
    wishlists: (wishlistRows ?? []) as DbWishlist[],
    isAdmin: Boolean(adminFlag),
    meliConnection: (meliConnectionRow ?? null) as MercadoLivreConnectionStatus | null,
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

  if (input.storeUrl.trim() && isFeatureEnabled("commerce_ingestion_v2")) {
    const fingerprint = JSON.stringify({
      wishlistId: input.wishlistId,
      url: input.autofill?.canonicalUrl ?? input.storeUrl.trim(),
      name: input.name.trim(),
    });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
    const idempotencyKey = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const { data, error } = await supabase.functions.invoke("ingest-product", {
      body: {
        wishlistId: input.wishlistId,
        url: input.storeUrl,
        idempotencyKey,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl ?? null,
        priceInCents: input.estimatedPriceInCents ?? null,
        currency: input.currency ?? "BRL",
        priority: input.priority,
      },
    });
    if (error) throw error;
    if (!data?.giftId) throw new Error("O pipeline de produto não retornou o item criado.");
    return { id: String(data.giftId) };
  }

  const legacyPayload = {
    wishlist_id: input.wishlistId,
    name: input.name,
    description: input.description || null,
    store_url: input.storeUrl || null,
    image_url: input.imageUrl ?? null,
    estimated_price: centsToCurrencyUnits(input.estimatedPriceInCents),
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
        current_price: centsToCurrencyUnits(input.autofill.currentPriceInCents ?? input.estimatedPriceInCents),
        original_price: centsToCurrencyUnits(input.autofill.originalPriceInCents),
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
      }
    }
  }

  return data;
}

function centsToCurrencyUnits(value: number | null | undefined) {
  return value == null ? null : value / 100;
}

/**
 * Completa os dados de um desejo já salvo.
 *
 * Serve ao caso em que o preenchimento automático não trouxe foto ou preço: em
 * vez de travar o cadastro, a pessoa salva e completa depois. A permissão vem da
 * policy `gifts_owner_all`, que já cobre update para o dono da lista.
 *
 * O preço é gravado em `current_price` e `estimated_price`: o primeiro é o que o
 * radar lê, o segundo é o campo legado usado quando não há dado de extração.
 */
export async function updateGift(input: {
  giftId: string;
  name?: string;
  imageUrl?: string | null;
  priceInCents?: number | null;
  currency?: string | null;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl?.trim() || null;
  if (input.currency !== undefined) payload.currency = input.currency || "BRL";
  if (input.priceInCents !== undefined) {
    payload.estimated_price = centsToCurrencyUnits(input.priceInCents);
  }

  if (Object.keys(payload).length === 0) return null;

  // `current_price` só existe depois da migração de autofill; se o schema for
  // antigo, repetimos o update sem ela em vez de falhar.
  const withCurrentPrice = input.priceInCents !== undefined
    ? { ...payload, current_price: centsToCurrencyUnits(input.priceInCents) }
    : payload;

  let response = await supabase.from("gifts").update(withCurrentPrice).eq("id", input.giftId).select("id").maybeSingle();

  if (response.error && isSchemaCompatibilityInsertError(response.error)) {
    response = await supabase.from("gifts").update(payload).eq("id", input.giftId).select("id").maybeSingle();
  }

  if (response.error) {
    logSupabaseError("updateGift", response.error, { giftId: input.giftId });
    throw response.error;
  }

  if (!response.data) {
    throw new Error("Não foi possível atualizar este desejo. Confirme se a lista é sua.");
  }

  return response.data.id as string;
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

export async function reservePublicGift(input: {
  shareId: string;
  giftId: string;
  reserverName: string;
  reserverEmail: string;
  reserverMessage?: string | null;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("reserve_public_gift", {
    p_share_id: input.shareId,
    p_gift_id: input.giftId,
    p_reserver_name: input.reserverName,
    p_reserver_email: input.reserverEmail,
    p_reserver_message: input.reserverMessage?.trim() ? input.reserverMessage.trim() : null,
  });

  if (error) {
    logSupabaseError("reserve_public_gift", error, { shareId: input.shareId, giftId: input.giftId });
    // A RPC sinaliza corrida de reserva; traduzimos para uma mensagem acionável.
    if (typeof error.message === "string" && error.message.includes("gift_unavailable")) {
      throw new Error("Esse presente acabou de ser reservado por outra pessoa.");
    }
    throw error;
  }

  return data as { reservation_id: string; gift_id: string; status: "reserved" };
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

export type ListTemplateItem = {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  store_name: string | null;
  image_url: string | null;
  product_url: string;
  affiliate_url: string | null;
  estimated_price: number | null;
  currency: string;
  priority: "must_have" | "nice_to_have" | "surprise_me";
  position: number;
};

export type ListTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  occasion: string;
  cover_image_url: string | null;
  position: number;
  published: boolean;
  items: ListTemplateItem[];
};

const LIST_TEMPLATE_COLUMNS = "id, slug, title, description, occasion, cover_image_url, position, published";
const LIST_TEMPLATE_ITEM_COLUMNS =
  "id, template_id, name, description, store_name, image_url, product_url, affiliate_url, estimated_price, currency, priority, position";

/**
 * Carrega as listas modelo com seus itens.
 *
 * Devolve lista vazia quando a migração de modelos ainda não foi aplicada, para
 * a interface simplesmente esconder a seção em vez de mostrar erro.
 */
export async function loadListTemplates(options?: { includeUnpublished?: boolean }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  let query = supabase.from("list_templates").select(LIST_TEMPLATE_COLUMNS).order("position", { ascending: true });
  if (!options?.includeUnpublished) query = query.eq("published", true);

  const { data: templateRows, error: templateError } = await query;

  if (templateError) {
    if (isSchemaCompatibilityInsertError(templateError)) return [];
    logSupabaseError("loadListTemplates", templateError);
    throw templateError;
  }

  const templates = (templateRows ?? []) as Omit<ListTemplate, "items">[];
  if (templates.length === 0) return [];

  const { data: itemRows, error: itemError } = await supabase
    .from("list_template_items")
    .select(LIST_TEMPLATE_ITEM_COLUMNS)
    .in("template_id", templates.map((template) => template.id))
    .order("position", { ascending: true });

  if (itemError && !isSchemaCompatibilityInsertError(itemError)) {
    logSupabaseError("loadListTemplateItems", itemError);
    throw itemError;
  }

  const itemsByTemplate = new Map<string, ListTemplateItem[]>();
  for (const item of (itemRows ?? []) as ListTemplateItem[]) {
    const current = itemsByTemplate.get(item.template_id) ?? [];
    current.push(item);
    itemsByTemplate.set(item.template_id, current);
  }

  return templates.map((template) => ({
    ...template,
    items: itemsByTemplate.get(template.id) ?? [],
  })) as ListTemplate[];
}

export async function saveListTemplate(input: {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  occasion?: string | null;
  coverImageUrl?: string | null;
  published: boolean;
  position?: number;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const payload = {
    slug: input.slug,
    title: input.title,
    description: input.description?.trim() || null,
    occasion: input.occasion?.trim() || "Lista de desejos",
    cover_image_url: input.coverImageUrl?.trim() || null,
    published: input.published,
    position: input.position ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = input.id
    ? await supabase.from("list_templates").update(payload).eq("id", input.id).select(LIST_TEMPLATE_COLUMNS).single()
    : await supabase.from("list_templates").insert(payload).select(LIST_TEMPLATE_COLUMNS).single();

  if (error) {
    logSupabaseError("saveListTemplate", error, { id: input.id });
    throw error;
  }

  return data as Omit<ListTemplate, "items">;
}

export async function deleteListTemplate(templateId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { error } = await supabase.from("list_templates").delete().eq("id", templateId);
  if (error) {
    logSupabaseError("deleteListTemplate", error, { templateId });
    throw error;
  }
}

export async function addListTemplateItem(input: {
  templateId: string;
  name: string;
  productUrl: string;
  affiliateUrl?: string | null;
  storeName?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  estimatedPrice?: number | null;
  priority?: ListTemplateItem["priority"];
  position?: number;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase
    .from("list_template_items")
    .insert({
      template_id: input.templateId,
      name: input.name,
      product_url: input.productUrl,
      affiliate_url: input.affiliateUrl?.trim() || null,
      store_name: input.storeName?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      description: input.description?.trim() || null,
      estimated_price: input.estimatedPrice ?? null,
      priority: input.priority ?? "nice_to_have",
      position: input.position ?? 0,
    })
    .select(LIST_TEMPLATE_ITEM_COLUMNS)
    .single();

  if (error) {
    logSupabaseError("addListTemplateItem", error, { templateId: input.templateId });
    throw error;
  }

  return data as ListTemplateItem;
}

export async function deleteListTemplateItem(itemId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { error } = await supabase.from("list_template_items").delete().eq("id", itemId);
  if (error) {
    logSupabaseError("deleteListTemplateItem", error, { itemId });
    throw error;
  }
}

/**
 * Cria a lista da pessoa a partir de um modelo, já com os itens dentro.
 */
export async function createWishlistFromTemplate(input: { templateId: string; title?: string | null }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase indisponivel");

  const { data, error } = await supabase.rpc("create_wishlist_from_template", {
    p_template_id: input.templateId,
    p_title: input.title?.trim() || null,
  });

  if (error) {
    logSupabaseError("create_wishlist_from_template", error, input);
    if (typeof error.message === "string" && error.message.includes("template_not_found")) {
      throw new Error("Esse modelo não está mais disponível.");
    }
    throw error;
  }

  return data as { wishlist_id: string; share_id: string; title: string; item_count: number };
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
