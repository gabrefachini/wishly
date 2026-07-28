import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adaptLegacyExtraction } from "../_shared/commerce/legacy-extraction-adapter.ts";
import { logCommerceEvent } from "../_shared/commerce/logger.ts";
import { normalizeProductUrl } from "../_shared/commerce/url-normalizer.ts";
import type { ExtractProductResult } from "../_shared/commerce/contracts.ts";

type IngestBody = {
  wishlistId: string;
  url: string;
  idempotencyKey: string;
  name?: string;
  description?: string;
  imageUrl?: string | null;
  priceInCents?: number | null;
  currency?: string | null;
  priority?: "must_have" | "nice_to_have" | "surprise_me";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function backendFeatureEnabled(flag: string) {
  return new Set(
    (Deno.env.get("WISHLY_FEATURE_FLAGS") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  ).has(flag);
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function cleanText(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseBody(value: unknown): IngestBody {
  if (!value || typeof value !== "object") throw new Error("request_invalid");
  const body = value as Record<string, unknown>;
  const wishlistId = cleanText(body.wishlistId, 100);
  const url = cleanText(body.url, 4000);
  const idempotencyKey = cleanText(body.idempotencyKey, 200);
  if (!/^[0-9a-f-]{36}$/i.test(wishlistId)) throw new Error("wishlist_invalid");
  if (!url) throw new Error("url_required");
  if (idempotencyKey.length < 8) throw new Error("idempotency_key_invalid");
  const price = body.priceInCents;
  if (price != null && (typeof price !== "number" || !Number.isFinite(price) || price < 0)) {
    throw new Error("price_invalid");
  }
  const allowedPriorities = new Set(["must_have", "nice_to_have", "surprise_me"]);
  return {
    wishlistId,
    url,
    idempotencyKey,
    name: cleanText(body.name, 500) || undefined,
    description: cleanText(body.description) || undefined,
    imageUrl: cleanText(body.imageUrl, 4000) || null,
    priceInCents: price as number | null | undefined,
    currency: cleanText(body.currency, 3).toUpperCase() || "BRL",
    priority: allowedPriorities.has(String(body.priority))
      ? body.priority as IngestBody["priority"]
      : "nice_to_have",
  };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeRawData(value: Record<string, unknown> | null | undefined) {
  if (!value) return {};
  const { access_token: _accessToken, refresh_token: _refreshToken, ...safe } = value;
  return safe;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });

  const startedAt = Date.now();
  let operationId = crypto.randomUUID();
  let retailerSlug: string | null = null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "backend_not_configured" });
  }
  if (
    !backendFeatureEnabled("commerce_ingestion_v2") ||
    !backendFeatureEnabled("product_offer_model")
  ) {
    return json(404, { error: "feature_disabled" });
  }
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: IngestBody;
  try {
    body = parseBody(await request.json());
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "request_invalid" });
  }

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "unauthorized" });

  try {
    const normalized = normalizeProductUrl(body.url);
    retailerSlug = normalized.retailerSlug;
    const fingerprint = await sha256(JSON.stringify({
      wishlistId: body.wishlistId,
      canonicalUrl: normalized.canonicalUrl,
      name: body.name ?? "",
    }));

    const { data: wishlist } = await serviceClient
      .from("wishlists")
      .select("id, owner_id, profiles!inner(auth_user_id)")
      .eq("id", body.wishlistId)
      .eq("profiles.auth_user_id", authData.user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (!wishlist) return json(403, { error: "wishlist_forbidden" });

    const operationInsert = await serviceClient
      .from("commerce_ingestion_operations")
      .insert({
        id: operationId,
        auth_user_id: authData.user.id,
        wishlist_id: body.wishlistId,
        idempotency_key: body.idempotencyKey,
        request_fingerprint: fingerprint,
        status: "processing",
        stage: "normalize_url",
        retailer_slug: retailerSlug,
      })
      .select("*")
      .single();

    let operation = operationInsert.data;
    if (operationInsert.error) {
      const existing = await serviceClient
        .from("commerce_ingestion_operations")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .eq("wishlist_id", body.wishlistId)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();
      if (!existing.data) throw operationInsert.error;
      operation = existing.data;
      operationId = operation.id;
      if (operation.request_fingerprint !== fingerprint) {
        return json(409, { error: "idempotency_key_reused", operationId });
      }
      if (operation.status === "succeeded" && operation.gift_id) {
        return json(200, {
          operationId,
          giftId: operation.gift_id,
          productId: operation.product_id,
          offerId: operation.offer_id,
          warnings: operation.warnings ?? [],
          reused: true,
        });
      }
    }

    await serviceClient.from("commerce_ingestion_operations")
      .update({ stage: "extract_product", status: "processing" }).eq("id", operationId);

    let extraction: ExtractProductResult;
    const warnings: string[] = [];
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/extract-product`, {
        method: "POST",
        headers: { Authorization: authorization, apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized.originalUrl }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`extract_http_${response.status}`);
      extraction = adaptLegacyExtraction(await response.json());
      warnings.push(...extraction.warnings);
    } catch (error) {
      if (!body.name) throw new Error("manual_title_required");
      warnings.push("autofill_failed_manual_fallback");
      extraction = adaptLegacyExtraction({
        provider: "manual",
        title: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        currentPriceInCents: body.priceInCents,
        currency: body.currency,
        availability: "unknown",
        warnings,
      });
    }

    const title = extraction.title ?? body.name;
    if (!title) throw new Error("title_required");
    const imageUrl = extraction.imageUrl ?? body.imageUrl ?? null;
    const currentPrice = extraction.currentPrice ??
      (body.priceInCents == null ? null : body.priceInCents / 100);

    const retailer = retailerSlug
      ? await serviceClient.from("retailers").select("id").eq("slug", retailerSlug).maybeSingle()
      : { data: null };
    const retailerId = retailer.data?.id ?? null;
    const externalProductId = extraction.externalProductId ?? normalized.externalProductId;
    const externalVariantId = extraction.externalVariantId ?? normalized.externalVariantId;

    // Reaproveitar a oferta primeiro também reaproveita seu produto. Isso evita
    // criar um produto órfão quando a URL/ID externo já existe.
    let offer: { id: string; product_id?: string } | null = operation?.offer_id
      ? { id: operation.offer_id, product_id: operation.product_id ?? undefined }
      : null;
    if (!offer && retailerId && externalProductId) {
      let offerQuery = serviceClient.from("product_offers").select("id, product_id")
        .eq("retailer_id", retailerId).eq("external_product_id", externalProductId);
      offerQuery = externalVariantId
        ? offerQuery.eq("external_variant_id", externalVariantId)
        : offerQuery.is("external_variant_id", null);
      offer = (await offerQuery.maybeSingle()).data;
    }
    if (!offer) {
      offer = (await serviceClient.from("product_offers").select("id, product_id")
        .eq("canonical_url", normalized.canonicalUrl).maybeSingle()).data;
    }

    await serviceClient.from("commerce_ingestion_operations").update({ stage: "match_product" }).eq("id", operationId);
    let product: { id: string } | null = offer?.product_id
      ? { id: offer.product_id }
      : operation?.product_id
        ? { id: operation.product_id }
        : null;
    if (extraction.gtin) {
      product = (await serviceClient.from("products").select("id").eq("gtin", extraction.gtin).maybeSingle()).data;
    }
    if (!product && extraction.ean) {
      product = (await serviceClient.from("products").select("id").eq("ean", extraction.ean).maybeSingle()).data;
    }
    if (!product && extraction.brand && extraction.mpn && extraction.model) {
      product = (await serviceClient.from("products").select("id")
        .ilike("brand", extraction.brand).ilike("mpn", extraction.mpn).ilike("model", extraction.model)
        .maybeSingle()).data;
    }
    if (!product) {
      const created = await serviceClient.from("products").insert({
        normalized_title: title,
        brand: extraction.brand,
        model: extraction.model,
        gtin: extraction.gtin,
        ean: extraction.ean,
        sku: extraction.sku,
        mpn: extraction.mpn,
        description: extraction.description ?? body.description ?? null,
        primary_image_url: imageUrl,
        attributes: extraction.attributes,
        normalization_status: extraction.extractionMethod === "manual" ? "manual" : "partial",
        normalization_confidence: extraction.extractionConfidence,
      }).select("id").single();
      if (created.error) throw created.error;
      product = created.data;
    }

    await serviceClient.from("commerce_ingestion_operations").update({
      stage: "match_offer", product_id: product.id,
    }).eq("id", operationId);
    const offerPayload = {
      product_id: product.id,
      retailer_id: retailerId,
      original_url: normalized.originalUrl,
      canonical_url: normalized.canonicalUrl,
      external_product_id: externalProductId,
      external_variant_id: externalVariantId,
      seller_name: extraction.sellerName,
      title,
      description: extraction.description ?? body.description ?? null,
      image_url: imageUrl,
      current_price: currentPrice,
      original_price: extraction.originalPrice,
      shipping_price: extraction.shippingPrice,
      currency: extraction.currency,
      availability: extraction.availability,
      condition: extraction.condition,
      attributes: extraction.attributes,
      extraction_method: extraction.extractionMethod,
      extraction_confidence: extraction.extractionConfidence,
      extraction_version: "phase-0-v1",
      extraction_metadata: { tracking_params_removed: normalized.trackingParamsRemoved },
      last_checked_at: new Date().toISOString(),
      last_successful_check_at: new Date().toISOString(),
    };
    if (offer) {
      const updated = await serviceClient.from("product_offers").update(offerPayload).eq("id", offer.id);
      if (updated.error) throw updated.error;
    } else {
      const created = await serviceClient.from("product_offers").insert(offerPayload).select("id").single();
      if (created.error) throw created.error;
      offer = created.data;
    }

    await serviceClient.from("commerce_ingestion_operations").update({
      stage: "create_item", offer_id: offer.id,
    }).eq("id", operationId);
    let giftId = operation?.gift_id as string | null;
    if (!giftId) {
      const created = await serviceClient.from("gifts").insert({
        wishlist_id: body.wishlistId,
        name: title,
        description: extraction.description ?? body.description ?? null,
        store_url: normalized.originalUrl,
        canonical_url: normalized.canonicalUrl,
        image_url: imageUrl,
        image_urls: imageUrl ? [imageUrl] : [],
        estimated_price: currentPrice,
        current_price: currentPrice,
        original_price: extraction.originalPrice,
        currency: extraction.currency,
        funding_currency: extraction.currency,
        priority: body.priority ?? "nice_to_have",
        provider: retailerSlug === "amazon_br"
          ? "amazon"
          : retailerSlug === "mercado_livre"
            ? "mercado_livre"
            : "manual",
        store_name: retailerSlug,
        seller_name: extraction.sellerName,
        external_product_id: externalProductId,
        external_variant_id: externalVariantId,
        availability: extraction.availability,
        selected_variant: Object.entries(extraction.attributes).map(([name, value]) => ({ name, value: String(value) })),
        extracted_at: new Date().toISOString(),
        extraction_confidence: { overall: extraction.extractionConfidence },
        extraction_warnings: warnings,
        autofill_status: warnings.length ? "partial" : "success",
        product_id: product.id,
        selected_offer_id: offer.id,
        ingestion_operation_id: operationId,
      }).select("id").single();
      if (created.error) throw created.error;
      giftId = created.data.id;
    }

    if (
      backendFeatureEnabled("price_observation_capture") &&
      (currentPrice != null || extraction.availability !== "unknown")
    ) {
      const observation = await serviceClient.from("price_observations").upsert({
        offer_id: offer.id,
        operation_id: operationId,
        price: currentPrice,
        original_price: extraction.originalPrice,
        shipping_price: extraction.shippingPrice,
        currency: extraction.currency,
        availability: extraction.availability,
        source: retailerSlug ?? "manual",
        extraction_method: extraction.extractionMethod,
        extraction_confidence: extraction.extractionConfidence,
        raw_data: safeRawData(extraction.rawData),
      }, { onConflict: "operation_id,offer_id", ignoreDuplicates: true });
      if (observation.error) throw observation.error;
    }

    if (backendFeatureEnabled("affiliate_url_resolution")) {
      const legacyLink = await serviceClient.from("affiliate_links")
        .select("affiliate_url")
        .eq("gift_id", giftId)
        .in("status", ["generated", "fallback"])
        .maybeSingle();
      if (legacyLink.data?.affiliate_url) {
        const affiliateSync = await serviceClient.from("product_offers")
          .update({ affiliate_url: legacyLink.data.affiliate_url })
          .eq("id", offer.id);
        if (affiliateSync.error) warnings.push("affiliate_url_sync_failed");
      }
    }

    await serviceClient.from("commerce_ingestion_operations").update({
      status: "succeeded",
      stage: "completed",
      gift_id: giftId,
      product_id: product.id,
      offer_id: offer.id,
      warnings,
      completed_at: new Date().toISOString(),
      error_code: null,
      error_detail: null,
    }).eq("id", operationId);

    logCommerceEvent("info", {
      operationId, stage: "completed", status: "succeeded", startedAt, retailerSlug,
      ids: { gift_id: giftId, product_id: product.id, offer_id: offer.id },
    });
    return json(200, {
      operationId,
      giftId,
      productId: product.id,
      offerId: offer.id,
      warnings,
      reused: false,
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 120) : "ingestion_failed";
    await serviceClient.from("commerce_ingestion_operations").update({
      status: "failed",
      stage: "failed",
      error_code: errorCode,
      error_detail: "A ingestão falhou. Consulte os logs pelo operation_id.",
      completed_at: new Date().toISOString(),
    }).eq("id", operationId);
    logCommerceEvent("error", {
      operationId, stage: "failed", status: "failed", startedAt, retailerSlug, errorCode,
    });
    return json(422, {
      error: errorCode,
      message: "Não foi possível processar este produto. Você ainda pode cadastrá-lo manualmente.",
      operationId,
    });
  }
});
