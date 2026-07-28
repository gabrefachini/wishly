import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const options = {
    execute: false,
    batchSize: 50,
    cursor: null,
    maxBatches: Number.POSITIVE_INFINITY,
    report: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") options.execute = true;
    else if (arg === "--batch-size") options.batchSize = Number(argv[++index]);
    else if (arg === "--cursor") options.cursor = argv[++index];
    else if (arg === "--max-batches") options.maxBatches = Number(argv[++index]);
    else if (arg === "--report") options.report = argv[++index];
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown_argument:${arg}`);
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 500) {
    throw new Error("batch_size_must_be_between_1_and_500");
  }
  return options;
}

function encodeCursor(row) {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id })).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  if (!parsed.createdAt || !parsed.id) throw new Error("invalid_cursor");
  return parsed;
}

function retailerSlug(gift) {
  if (gift.provider === "mercado_livre") return "mercado_livre";
  if (gift.provider === "amazon") return "amazon_br";
  try {
    const host = new URL(gift.canonical_url ?? gift.store_url).hostname.toLowerCase();
    if (host.includes("shopee.com.br")) return "shopee_br";
    if (host.includes("magazineluiza.com.br") || host.includes("magalu.com")) return "magalu";
  } catch {
    return null;
  }
  return null;
}

function cleanUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function findOffer(client, gift, retailerId, canonicalUrl) {
  if (retailerId && gift.external_product_id) {
    let query = client.from("product_offers").select("id, product_id")
      .eq("retailer_id", retailerId)
      .eq("external_product_id", gift.external_product_id);
    query = gift.external_variant_id
      ? query.eq("external_variant_id", gift.external_variant_id)
      : query.is("external_variant_id", null);
    const result = await query.maybeSingle();
    if (result.error) throw result.error;
    if (result.data) return result.data;
  }
  if (canonicalUrl) {
    const result = await client.from("product_offers").select("id, product_id")
      .eq("canonical_url", canonicalUrl).maybeSingle();
    if (result.error) throw result.error;
    if (result.data) return result.data;
  }
  return null;
}

async function processGift(client, gift, dryRun) {
  const originalUrl = cleanUrl(gift.store_url);
  const canonicalUrl = cleanUrl(gift.canonical_url) ?? originalUrl;
  if (!originalUrl && !gift.name) throw new Error("gift_without_url_or_name");
  const slug = retailerSlug(gift);
  let retailer = null;
  if (slug) {
    const result = await client.from("retailers").select("id").eq("slug", slug).maybeSingle();
    if (result.error) throw result.error;
    retailer = result.data;
  }
  const existingOffer = await findOffer(client, gift, retailer?.id ?? null, canonicalUrl);
  if (dryRun) {
    return {
      action: existingOffer ? "reuse_offer" : "create_product_and_offer",
      retailer: slug,
      observation: gift.current_price != null || gift.estimated_price != null,
    };
  }

  let productId = existingOffer?.product_id ?? null;
  if (!productId) {
    const created = await client.from("products").insert({
      normalized_title: gift.name,
      description: gift.description,
      primary_image_url: gift.image_url,
      normalization_status: "partial",
      normalization_confidence: 0.5,
      attributes: { backfilled_from_gift_id: gift.id },
    }).select("id").single();
    if (created.error) throw created.error;
    productId = created.data.id;
  }

  let offerId = existingOffer?.id ?? null;
  const price = gift.current_price ?? gift.estimated_price ?? null;
  if (!offerId) {
    const created = await client.from("product_offers").insert({
      product_id: productId,
      retailer_id: retailer?.id ?? null,
      original_url: originalUrl ?? canonicalUrl,
      canonical_url: canonicalUrl,
      external_product_id: gift.external_product_id,
      external_variant_id: gift.external_variant_id,
      seller_name: gift.seller_name,
      title: gift.name,
      description: gift.description,
      image_url: gift.image_url,
      current_price: price,
      original_price: gift.original_price,
      currency: gift.currency ?? "BRL",
      availability: gift.availability ?? "unknown",
      extraction_method: gift.provider === "manual" ? "manual" : "metadata",
      extraction_confidence: 0.5,
      extraction_version: "phase-0-backfill-v1",
      extraction_metadata: { backfilled_from_gift_id: gift.id },
      last_checked_at: gift.extracted_at,
      last_successful_check_at: gift.extracted_at,
    }).select("id").single();
    if (created.error) throw created.error;
    offerId = created.data.id;
  }

  const operationId = crypto.randomUUID();
  const operation = await client.from("commerce_ingestion_operations").insert({
    id: operationId,
    auth_user_id: gift.auth_user_id,
    wishlist_id: gift.wishlist_id,
    idempotency_key: `backfill:${gift.id}`,
    request_fingerprint: `backfill:${gift.id}`,
    status: "succeeded",
    stage: "completed",
    retailer_slug: slug,
    gift_id: gift.id,
    product_id: productId,
    offer_id: offerId,
    warnings: [],
    completed_at: new Date().toISOString(),
  }).select("id").single();
  if (operation.error && operation.error.code !== "23505") throw operation.error;

  if (price != null || (gift.availability && gift.availability !== "unknown")) {
    const observation = await client.from("price_observations").upsert({
      offer_id: offerId,
      operation_id: operation.data?.id ?? operationId,
      price,
      original_price: gift.original_price,
      currency: gift.currency ?? "BRL",
      availability: gift.availability ?? "unknown",
      source: slug ?? "legacy_backfill",
      extraction_method: gift.provider === "manual" ? "manual" : "metadata",
      extraction_confidence: 0.5,
      observed_at: gift.extracted_at ?? gift.created_at,
      raw_data: { backfilled_from_gift_id: gift.id },
    }, { onConflict: "operation_id,offer_id", ignoreDuplicates: true });
    if (observation.error) throw observation.error;
  }

  const linked = await client.from("gifts").update({
    product_id: productId,
    selected_offer_id: offerId,
    ingestion_operation_id: operation.data?.id ?? operationId,
  }).eq("id", gift.id);
  if (linked.error) throw linked.error;
  return { action: existingOffer ? "reused_offer" : "created", retailer: slug, productId, offerId };
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log("node scripts/backfill-commerce-model.mjs [--execute] [--batch-size N] [--max-batches N] [--cursor TOKEN] [--report FILE]");
  process.exit(0);
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL_and_SUPABASE_SERVICE_ROLE_KEY_are_required");

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const summary = {
  mode: options.execute ? "execute" : "dry-run",
  processed: 0,
  succeeded: 0,
  failed: 0,
  batches: 0,
  nextCursor: options.cursor,
  failures: [],
};
let cursor = decodeCursor(options.cursor);

while (summary.batches < options.maxBatches) {
  let query = client.from("gifts")
    .select("*, wishlists!inner(profiles!inner(auth_user_id))")
    .is("product_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(options.batchSize);
  if (cursor) {
    query = query.or(
      `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
    );
  }
  const result = await query;
  if (result.error) throw result.error;
  if (!result.data?.length) break;
  summary.batches += 1;

  for (const row of result.data) {
    const gift = {
      ...row,
      auth_user_id: row.wishlists.profiles.auth_user_id,
    };
    summary.processed += 1;
    try {
      const outcome = await processGift(client, gift, !options.execute);
      summary.succeeded += 1;
      console.log(JSON.stringify({ giftId: gift.id, status: "ok", ...outcome }));
    } catch (error) {
      summary.failed += 1;
      const code = error instanceof Error ? error.message : "unknown_error";
      summary.failures.push({ giftId: gift.id, code });
      console.error(JSON.stringify({ giftId: gift.id, status: "failed", code }));
    }
    cursor = { createdAt: gift.created_at, id: gift.id };
    summary.nextCursor = encodeCursor(gift);
  }
  if (result.data.length < options.batchSize) break;
}

const output = JSON.stringify(summary, null, 2);
console.log(output);
if (options.report) await writeFile(options.report, `${output}\n`, "utf8");
if (summary.failed > 0) process.exitCode = 2;
