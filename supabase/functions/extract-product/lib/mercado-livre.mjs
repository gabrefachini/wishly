export const MERCADO_LIVRE_WARNING_CODES = [
  "meli_item_id_not_found",
  "meli_user_product_detected",
  "meli_catalog_product_detected",
  "meli_item_api_failed",
  "meli_price_api_failed",
  "meli_price_not_found",
  "meli_variation_not_found",
  "meli_description_failed",
];

const USER_PRODUCT_PATTERN = /\b(MLBU\d{6,})\b/i;
const ITEM_PATTERN = /\b(MLB-?\d{6,})\b/i;
const CATALOG_PATH_PATTERN = /\/p\/(MLB\d{6,})/i;
const USER_PRODUCT_PATH_PATTERN = /\/up\/(MLBU\d{6,})/i;
const VARIATION_PATTERN = /\b(?:variation|variation_id|selected_variation|selectedVariation)=([A-Za-z0-9_-]+)/i;
const GENERIC_MARKETPLACE_TITLE_PATTERN = /^\s*mercado\s+libre\s*$/i;
const GENERIC_MARKETPLACE_TITLE_PT_PATTERN = /^\s*mercado\s+livre\s*$/i;
const BRAND_IMAGE_HINT_PATTERN = /(logo|mercado[\-_ ]?(livre|libre)|frontend-assets|org-img|brand)/i;

export function isMercadoLivreHost(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "mercadolivre.com.br" ||
    normalized === "produto.mercadolivre.com.br" ||
    normalized === "lista.mercadolivre.com.br" ||
    normalized.endsWith(".mercadolivre.com.br") ||
    normalized.endsWith(".mercadolibre.com") ||
    normalized === "meli.la"
  );
}

export function isMercadoLivreShortHost(hostname) {
  return hostname.toLowerCase() === "meli.la";
}

export function normalizeMercadoLivreItemId(value) {
  if (!value) return null;
  const match = String(value).match(ITEM_PATTERN);
  if (!match?.[1]) return null;
  const digits = match[1].replace(/[^0-9]/g, "");
  return digits ? `MLB${digits}` : null;
}

export function normalizeVariationId(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attrValue(raw, attr) {
  const match = new RegExp(`${attr}=["']([^"']+)["']`, "i").exec(raw);
  return match?.[1] ?? null;
}

function parseMetaTags(html) {
  const metas = new Map();
  for (const match of html.matchAll(/<meta\s+([^>]+)>/gi)) {
    const attrs = match[1];
    const key = attrValue(attrs, "property") || attrValue(attrs, "name");
    const content = attrValue(attrs, "content");
    if (key && content) metas.set(key.toLowerCase(), decodeHtml(content));
  }
  return metas;
}

function parseLdJsonBlocks(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.flatMap((block) => {
    try {
      const parsed = JSON.parse(block[1]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

function flattenGraph(nodes) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    const record = node;
    if (Array.isArray(record["@graph"])) {
      return flattenGraph(record["@graph"]);
    }
    return [record];
  });
}

function normalizeImages(value) {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => normalizeImages(entry));
  if (typeof value === "object" && value && "url" in value && typeof value.url === "string") return [value.url];
  return [];
}

function isGenericMarketplaceTitle(value) {
  if (!value) return false;
  const normalized = decodeHtml(String(value)).trim();
  return GENERIC_MARKETPLACE_TITLE_PATTERN.test(normalized) || GENERIC_MARKETPLACE_TITLE_PT_PATTERN.test(normalized);
}

function isBrandImageUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(String(value));
    const host = url.hostname.toLowerCase();
    const path = `${url.pathname}${url.search}`.toLowerCase();
    return (
      !host.includes("mlstatic.com") ||
      BRAND_IMAGE_HINT_PATTERN.test(path)
    );
  } catch {
    return BRAND_IMAGE_HINT_PATTERN.test(String(value));
  }
}

function sanitizeStructuredProductSignals(signals) {
  const next = {
    ...signals,
    imageUrls: [...signals.imageUrls],
  };

  if (!next.itemId && isGenericMarketplaceTitle(next.title)) {
    next.title = null;
  }

  if (!next.itemId) {
    next.imageUrls = next.imageUrls.filter((imageUrl) => !isBrandImageUrl(imageUrl));
  }

  return next;
}

function extractItemIdFromSearchParams(url) {
  const directCandidates = [
    url.searchParams.get("wid"),
    url.searchParams.get("item_id"),
    url.searchParams.get("itemId"),
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeMercadoLivreItemId(candidate);
    if (normalized) return normalized;
  }

  const paramValues = [];
  for (const value of url.searchParams.values()) {
    paramValues.push(value);
  }

  for (const value of paramValues) {
    const pdpItemMatch = String(value).match(/item_id:?(MLB-?\d{6,})/i)?.[1] ?? null;
    const normalized = normalizeMercadoLivreItemId(pdpItemMatch ?? value);
    if (normalized) return normalized;
  }

  return null;
}

function parseHashParams(hash) {
  const normalized = String(hash ?? "").replace(/^#/, "").trim();
  if (!normalized) return new URLSearchParams();
  return new URLSearchParams(normalized);
}

function extractItemIdFromHash(url) {
  const hashParams = parseHashParams(url.hash);
  const directCandidates = [
    hashParams.get("wid"),
    hashParams.get("item_id"),
    hashParams.get("itemId"),
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeMercadoLivreItemId(candidate);
    if (normalized) return normalized;
  }

  for (const value of hashParams.values()) {
    const pdpItemMatch = String(value).match(/item_id:?(MLB-?\d{6,})/i)?.[1] ?? null;
    const normalized = normalizeMercadoLivreItemId(pdpItemMatch ?? value);
    if (normalized) return normalized;
  }

  return normalizeMercadoLivreItemId(url.hash);
}

function extractVariationIdFromHash(url) {
  const hashParams = parseHashParams(url.hash);
  return (
    normalizeVariationId(hashParams.get("variation")) ||
    normalizeVariationId(hashParams.get("variation_id")) ||
    normalizeVariationId(hashParams.get("selectedVariation")) ||
    normalizeVariationId(url.hash.match(VARIATION_PATTERN)?.[1]) ||
    null
  );
}

function parseMoneyToCents(value) {
  if (value == null) return null;
  const normalized = String(value).replace(/[^\d,.-]/g, "").trim();
  if (!normalized) return null;
  const decimal = normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized;
  const amount = Number(decimal);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function toAvailability(value) {
  if (!value) return "unknown";
  const normalized = String(value).toLowerCase();
  if (
    normalized.includes("instock") ||
    normalized.includes("in_stock") ||
    normalized.includes("available") ||
    normalized.includes("dispon")
  ) {
    return "in_stock";
  }
  if (normalized.includes("preorder") || normalized.includes("pre-order")) return "preorder";
  if (
    normalized.includes("outofstock") ||
    normalized.includes("out_of_stock") ||
    normalized.includes("soldout") ||
    normalized.includes("indispon")
  ) {
    return "out_of_stock";
  }
  return "unknown";
}

function parseCanonicalUrl(html) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
}

function parseJsonStringField(html, fieldName, pattern) {
  const fieldPattern = pattern ?? `${fieldName}["']?\\s*:\\s*["']([^"']+)["']`;
  return html.match(new RegExp(fieldPattern, "i"))?.[1] ?? null;
}

function getScriptSignals(html) {
  const itemId =
    parseJsonStringField(html, "item_id") ||
    parseJsonStringField(html, "itemId") ||
    html.match(/"id"\s*:\s*"(MLB-?\d{6,})"/i)?.[1] ||
    html.match(/"item":{"id":"(MLB-?\d{6,})"/i)?.[1] ||
    null;

  const userProductId =
    parseJsonStringField(html, "user_product_id") ||
    parseJsonStringField(html, "userProductId") ||
    html.match(/"(MLBU\d{6,})"/i)?.[1] ||
    null;

  const variationId =
    parseJsonStringField(html, "variation_id") ||
    parseJsonStringField(html, "variationId") ||
    html.match(/"selectedVariationId"\s*:\s*"?([A-Za-z0-9_-]+)"?/i)?.[1] ||
    null;

  return {
    itemId: normalizeMercadoLivreItemId(itemId),
    userProductId: userProductId ?? null,
    variationId: normalizeVariationId(variationId),
  };
}

function getStructuredSignals(resolvedUrl, html) {
  const metas = parseMetaTags(html);
  const nodes = flattenGraph(parseLdJsonBlocks(html));
  const productNode = nodes.find((node) => String(node["@type"] ?? "").toLowerCase().includes("product")) ?? null;
  const offer = productNode ? (Array.isArray(productNode.offers) ? productNode.offers[0] : productNode.offers) : null;
  const canonicalUrl =
    parseCanonicalUrl(html) ||
    metas.get("og:url") ||
    (typeof productNode?.url === "string" ? productNode.url : null) ||
    resolvedUrl.toString();

  const scriptSignals = getScriptSignals(html);
  const structuredItemId =
    normalizeMercadoLivreItemId(productNode?.sku) ||
    normalizeMercadoLivreItemId(productNode?.productID) ||
    normalizeMercadoLivreItemId(typeof offer?.url === "string" ? offer.url : null) ||
    normalizeMercadoLivreItemId(canonicalUrl);

  return sanitizeStructuredProductSignals({
    canonicalUrl,
    title: typeof productNode?.name === "string" ? decodeHtml(productNode.name).trim() : metas.get("og:title") ?? null,
    description:
      typeof productNode?.description === "string"
        ? decodeHtml(productNode.description).trim()
        : metas.get("og:description") ?? metas.get("description") ?? null,
    imageUrls: productNode ? normalizeImages(productNode.image) : normalizeImages(metas.get("og:image")),
    currentPriceInCents: parseMoneyToCents(offer?.price ?? metas.get("product:price:amount")),
    originalPriceInCents: parseMoneyToCents(offer?.highPrice ?? offer?.regular_amount ?? null),
    currency:
      typeof offer?.priceCurrency === "string"
        ? offer.priceCurrency
        : metas.get("product:price:currency") ?? metas.get("price:currency") ?? null,
    availability: toAvailability(typeof offer?.availability === "string" ? offer.availability : metas.get("product:availability")),
    itemId: structuredItemId ?? scriptSignals.itemId,
    userProductId: scriptSignals.userProductId,
    variationId: scriptSignals.variationId,
  });
}

function detectResourceType(url) {
  if (isMercadoLivreShortHost(url.hostname)) return "short_url";
  if (USER_PRODUCT_PATH_PATTERN.test(url.pathname)) return "user_product";
  if (CATALOG_PATH_PATTERN.test(url.pathname)) return "catalog_product";
  if (ITEM_PATTERN.test(url.pathname) || ITEM_PATTERN.test(url.search)) return "item";
  return "unknown";
}

function getUrlDerivedItemId({ resourceType, resolved, original, searchItemId }) {
  if (resourceType === "catalog_product") {
    return searchItemId ?? null;
  }

  if (resourceType === "user_product") {
    return searchItemId ?? null;
  }

  return (
    searchItemId ||
    normalizeMercadoLivreItemId(resolved.pathname) ||
    normalizeMercadoLivreItemId(original.pathname) ||
    normalizeMercadoLivreItemId(resolved.toString()) ||
    normalizeMercadoLivreItemId(original.toString()) ||
    null
  );
}

export function resolveMercadoLivreSignals({ originalUrl, resolvedUrl, html }) {
  const original = new URL(originalUrl);
  const resolved = new URL(resolvedUrl ?? originalUrl);
  const resourceType = detectResourceType(resolved);
  const searchItemId =
    extractItemIdFromSearchParams(resolved) ??
    extractItemIdFromSearchParams(original) ??
    extractItemIdFromHash(resolved) ??
    extractItemIdFromHash(original);
  const urlVariationId =
    normalizeVariationId(resolved.searchParams.get("variation")) ||
    normalizeVariationId(resolved.searchParams.get("variation_id")) ||
    normalizeVariationId(resolved.searchParams.get("selectedVariation")) ||
    extractVariationIdFromHash(resolved) ||
    extractVariationIdFromHash(original) ||
    normalizeVariationId(resolved.search.match(VARIATION_PATTERN)?.[1]) ||
    null;

  const signals = {
    originalUrl,
    resolvedUrl: resolved.toString(),
    resourceType,
    itemId: getUrlDerivedItemId({ resourceType, resolved, original, searchItemId }),
    catalogProductId:
      resolved.pathname.match(CATALOG_PATH_PATTERN)?.[1] ??
      original.pathname.match(CATALOG_PATH_PATTERN)?.[1] ??
      null,
    userProductId:
      resolved.pathname.match(USER_PRODUCT_PATH_PATTERN)?.[1] ??
      original.pathname.match(USER_PRODUCT_PATH_PATTERN)?.[1] ??
      resolved.toString().match(USER_PRODUCT_PATTERN)?.[1] ??
      original.toString().match(USER_PRODUCT_PATTERN)?.[1] ??
      null,
    variationId: urlVariationId,
    canonicalUrl: null,
    title: null,
    description: null,
    imageUrls: [],
    currentPriceInCents: null,
    originalPriceInCents: null,
    currency: null,
    availability: "unknown",
  };

  if (!html) {
    return signals;
  }

  const structured = getStructuredSignals(resolved, html);
  return {
    ...signals,
    itemId: structured.itemId ?? signals.itemId,
    userProductId: structured.userProductId ?? signals.userProductId,
    variationId: structured.variationId ?? signals.variationId,
    canonicalUrl: structured.canonicalUrl ?? signals.canonicalUrl,
    title: structured.title ?? null,
    description: structured.description ?? null,
    imageUrls: structured.imageUrls,
    currentPriceInCents: structured.currentPriceInCents,
    originalPriceInCents: structured.originalPriceInCents,
    currency: structured.currency,
    availability: structured.availability,
  };
}

function pickPriceFromPricesApi(pricesPayload, variationId) {
  if (!pricesPayload || !Array.isArray(pricesPayload.prices)) {
    return null;
  }

  const scopedPrices = variationId
    ? pricesPayload.prices.filter((entry) =>
        Array.isArray(entry?.conditions?.context_restrictions)
          ? entry.conditions.context_restrictions.some((restriction) => String(restriction).includes(String(variationId)))
          : false,
      )
    : [];

  const candidates = scopedPrices.length > 0 ? scopedPrices : pricesPayload.prices;
  const promotion = candidates.find((entry) => entry?.type === "promotion" && entry?.amount != null) ?? null;
  const standard = candidates.find((entry) => entry?.type === "standard" && entry?.amount != null) ?? null;
  const selected = promotion ?? standard ?? candidates.find((entry) => entry?.amount != null) ?? null;
  if (!selected) return null;

  return {
    currentPriceInCents: parseMoneyToCents(selected.amount),
    originalPriceInCents: parseMoneyToCents(selected.regular_amount ?? standard?.amount ?? null),
    currency: selected.currency_id ?? pricesPayload.currency_id ?? null,
    priceSource: "meli_prices_api",
  };
}

function selectVariation(itemPayload, variationId) {
  if (!variationId || !Array.isArray(itemPayload?.variations) || itemPayload.variations.length === 0) {
    return null;
  }

  const directMatch = itemPayload.variations.find((variation) => String(variation?.id) === String(variationId)) ?? null;
  if (directMatch) return directMatch;

  return (
    itemPayload.variations.find((variation) =>
      Array.isArray(variation?.attribute_combinations)
        ? variation.attribute_combinations.some(
            (attribute) =>
              String(attribute?.id ?? "").toLowerCase() === String(variationId).toLowerCase() ||
              String(attribute?.value_id ?? "").toLowerCase() === String(variationId).toLowerCase(),
          )
        : false,
    ) ?? null
  );
}

function mapVariationSelection(variation) {
  if (!variation || !Array.isArray(variation.attribute_combinations)) {
    return [];
  }

  return variation.attribute_combinations
    .map((attribute) => ({
      name: attribute?.name ?? "",
      value: attribute?.value_name ?? "",
    }))
    .filter((attribute) => attribute.name && attribute.value);
}

function mapItemAttributes(itemPayload) {
  if (!Array.isArray(itemPayload?.attributes)) return [];
  return itemPayload.attributes
    .map((attribute) => ({
      name: attribute?.name ?? "",
      value: attribute?.value_name ?? "",
    }))
    .filter((attribute) => attribute.name && attribute.value);
}

function mapVariationImages(itemPayload, variation) {
  if (!variation || !Array.isArray(variation.picture_ids) || !Array.isArray(itemPayload?.pictures)) {
    return [];
  }

  const pictureById = new Map(itemPayload.pictures.map((picture) => [String(picture.id), picture]));
  return variation.picture_ids
    .map((pictureId) => pictureById.get(String(pictureId)))
    .filter(Boolean)
    .map((picture) => picture.secure_url ?? picture.url)
    .filter(Boolean);
}

function getEssentialFieldsFromItem(itemPayload, selectedVariation, htmlSignals) {
  const variationPrice = selectedVariation?.price != null ? parseMoneyToCents(selectedVariation.price) : null;
  const variationOriginalPrice = selectedVariation?.original_price != null ? parseMoneyToCents(selectedVariation.original_price) : null;
  const legacyPrice = itemPayload?.price != null ? parseMoneyToCents(itemPayload.price) : null;
  const legacyOriginalPrice = itemPayload?.original_price != null ? parseMoneyToCents(itemPayload.original_price) : null;

  return {
    title: itemPayload?.title ?? htmlSignals.title ?? null,
    imageUrls:
      mapVariationImages(itemPayload, selectedVariation).length > 0
        ? mapVariationImages(itemPayload, selectedVariation)
        : (itemPayload?.pictures ?? [])
            .map((picture) => picture?.secure_url ?? picture?.url)
            .filter(Boolean),
    currency: itemPayload?.currency_id ?? htmlSignals.currency ?? "BRL",
    availability:
      selectedVariation?.available_quantity != null
        ? selectedVariation.available_quantity > 0
          ? "in_stock"
          : "out_of_stock"
        : itemPayload?.available_quantity != null
          ? itemPayload.available_quantity > 0
            ? "in_stock"
            : "out_of_stock"
          : htmlSignals.availability,
    currentPriceInCents: variationPrice ?? legacyPrice,
    originalPriceInCents: variationOriginalPrice ?? legacyOriginalPrice,
    priceSource: variationPrice != null ? "meli_variation" : legacyPrice != null ? "meli_item_legacy" : null,
  };
}

function withMercadoLivreProvider(result) {
  return {
    ...result,
    provider: "mercado_livre",
    storeName: result.storeName ?? "Mercado Livre",
  };
}

function buildObservability(signals, steps, state) {
  return {
    originalUrl: signals.originalUrl,
    resolvedUrl: signals.resolvedUrl,
    resourceType: signals.resourceType,
    itemId: signals.itemId,
    variationId: signals.variationId,
    providerMatched: "mercado_livre",
    itemApiStatus: state.itemApiStatus,
    priceApiStatus: state.priceApiStatus,
    descriptionApiStatus: state.descriptionApiStatus,
    priceSource: state.priceSource,
    steps,
    status: state.status,
    warnings: state.warnings,
  };
}

function dedupeWarnings(warnings) {
  return Array.from(new Set(warnings.filter(Boolean)));
}

function applySignalsToResult(result, signals, state) {
  result.canonicalUrl = signals.canonicalUrl ?? result.canonicalUrl;
  result.externalProductId = signals.itemId ?? signals.catalogProductId ?? signals.userProductId ?? result.externalProductId;
  result.externalVariantId = signals.variationId ?? result.externalVariantId;
  result.title = signals.title ?? result.title;
  result.imageUrls = signals.imageUrls.length > 0 ? signals.imageUrls : result.imageUrls;
  result.imageUrl = result.imageUrls[0] ?? result.imageUrl;
  result.currentPriceInCents = signals.currentPriceInCents ?? result.currentPriceInCents;
  result.originalPriceInCents = signals.originalPriceInCents ?? result.originalPriceInCents;
  result.currency = signals.currency ?? result.currency;
  result.availability = signals.availability ?? result.availability;
  if (result.currentPriceInCents != null) {
    state.priceSource = "meli_structured_data";
  }
}

export async function extractMercadoLivreProduct({
  originalUrl,
  resolvedUrl,
  html,
  timeoutMs,
  fetchJson,
  ensureHtml,
  steps,
  withStepTiming,
}) {
  const requestUrl = resolvedUrl instanceof URL ? resolvedUrl : new URL(resolvedUrl ?? originalUrl);
  const resourceType = detectResourceType(requestUrl);
  let htmlBody = html ?? null;
  let signals = resolveMercadoLivreSignals({
    originalUrl,
    resolvedUrl: requestUrl.toString(),
    html: htmlBody,
  });

  const htmlPromise = !htmlBody
    ? withStepTiming(steps, "mercado_livre_html", async () => {
        try {
          return await ensureHtml(requestUrl, timeoutMs);
        } catch {
          return null;
        }
      })
    : Promise.resolve(htmlBody);

  const warnings = [];
  if (signals.resourceType === "user_product") warnings.push("meli_user_product_detected");
  if (signals.resourceType === "catalog_product") warnings.push("meli_catalog_product_detected");

  const result = withMercadoLivreProvider({
    originalUrl,
    canonicalUrl: signals.canonicalUrl ?? requestUrl.toString(),
    provider: "mercado_livre",
    storeName: "Mercado Livre",
    sellerName: null,
    externalProductId: signals.itemId ?? signals.catalogProductId ?? signals.userProductId ?? null,
    externalVariantId: signals.variationId ?? null,
    title: signals.title ?? null,
    description: null,
    imageUrl: signals.imageUrls[0] ?? null,
    imageUrls: signals.imageUrls,
    currentPriceInCents: signals.currentPriceInCents,
    originalPriceInCents: signals.originalPriceInCents,
    currency: signals.currency ?? "BRL",
    availability: signals.availability ?? "unknown",
    selectedVariant: [],
    extractedAt: new Date().toISOString(),
    partial: true,
    confidence: {
      title: signals.title ? 0.8 : 0,
      description: signals.description ? 0.6 : 0,
      image: signals.imageUrls[0] ? 0.8 : 0,
      price: signals.currentPriceInCents != null ? 0.7 : 0,
      variant: signals.variationId ? 0.7 : 0.3,
    },
    warnings: [],
  });

  const state = {
    itemApiStatus: "skipped",
    priceApiStatus: "skipped",
    descriptionApiStatus: "skipped",
    priceSource: signals.currentPriceInCents != null ? "meli_structured_data" : "none",
    status: "partial",
    warnings,
  };

  const shouldResolveHtmlBeforeApi =
    !htmlBody &&
    (signals.resourceType === "catalog_product" ||
      signals.resourceType === "user_product" ||
      !signals.itemId);

  if (shouldResolveHtmlBeforeApi) {
    try {
      htmlBody = await htmlPromise;
    } catch {
      htmlBody = null;
    }

    if (htmlBody) {
      signals = resolveMercadoLivreSignals({
        originalUrl,
        resolvedUrl: requestUrl.toString(),
        html: htmlBody,
      });
      applySignalsToResult(result, signals, state);
    }
  }

  if (!signals.itemId) {
    warnings.push("meli_item_id_not_found");
    if (signals.currentPriceInCents == null) {
      warnings.push("meli_price_not_found");
    }
    result.description = signals.description ?? null;
    result.warnings = dedupeWarnings(warnings);
    result.observability = buildObservability(signals, steps, state);
    return result;
  }

  const itemPromise = withStepTiming(steps, "mercado_livre_item_api", () =>
    fetchJson(`https://api.mercadolibre.com/items/${signals.itemId}`, timeoutMs),
  );
  const pricePromise = withStepTiming(steps, "mercado_livre_price_api", () =>
    fetchJson(`https://api.mercadolibre.com/items/${signals.itemId}/prices`, timeoutMs),
  );

  const [itemSettled, priceSettled, htmlSettled] = await Promise.allSettled([itemPromise, pricePromise, htmlPromise]);
  const itemPayload = itemSettled.status === "fulfilled" ? itemSettled.value : null;
  const pricePayload = priceSettled.status === "fulfilled" ? priceSettled.value : null;
  if (!htmlBody && htmlSettled.status === "fulfilled" && htmlSettled.value) {
    htmlBody = htmlSettled.value;
    signals = resolveMercadoLivreSignals({
      originalUrl,
      resolvedUrl: requestUrl.toString(),
      html: htmlBody,
    });
    applySignalsToResult(result, signals, state);
  }

  if (itemPayload) {
    state.itemApiStatus = "success";
  } else {
    state.itemApiStatus = "failed";
    warnings.push("meli_item_api_failed");
  }

  if (pricePayload) {
    state.priceApiStatus = "success";
  } else {
    state.priceApiStatus = "failed";
    warnings.push("meli_price_api_failed");
  }

  const selectedVariation = selectVariation(itemPayload, signals.variationId);
  if (signals.variationId && !selectedVariation) {
    warnings.push("meli_variation_not_found");
  }

  if (itemPayload) {
    const itemFields = getEssentialFieldsFromItem(itemPayload, selectedVariation, signals);
    const priceFields = pickPriceFromPricesApi(pricePayload, signals.variationId);
    const htmlPriceFields =
      signals.currentPriceInCents != null
        ? {
            currentPriceInCents: signals.currentPriceInCents,
            originalPriceInCents: signals.originalPriceInCents,
            currency: signals.currency,
            priceSource: "meli_structured_data",
          }
        : null;

    const resolvedPriceFields = priceFields ?? (itemFields.currentPriceInCents != null ? itemFields : null) ?? htmlPriceFields;

    result.canonicalUrl = itemPayload.permalink ?? signals.canonicalUrl ?? result.canonicalUrl;
    result.externalProductId = itemPayload.id ?? signals.itemId;
    result.externalVariantId = selectedVariation ? String(selectedVariation.id) : signals.variationId ?? null;
    result.title = itemFields.title ?? result.title;
    result.imageUrls = itemFields.imageUrls.length > 0 ? itemFields.imageUrls : result.imageUrls;
    result.imageUrl = result.imageUrls[0] ?? result.imageUrl;
    result.currency = resolvedPriceFields?.currency ?? itemFields.currency ?? result.currency;
    result.currentPriceInCents = resolvedPriceFields?.currentPriceInCents ?? result.currentPriceInCents;
    result.originalPriceInCents = resolvedPriceFields?.originalPriceInCents ?? result.originalPriceInCents;
    result.availability = itemFields.availability ?? result.availability;
    result.selectedVariant =
      selectedVariation ? mapVariationSelection(selectedVariation) : mapItemAttributes(itemPayload);
    result.confidence = {
      title: result.title ? 0.98 : result.confidence.title,
      description: result.description ? 0.7 : result.confidence.description,
      image: result.imageUrl ? 0.98 : result.confidence.image,
      price: result.currentPriceInCents != null ? (priceFields ? 0.99 : itemFields.priceSource === "meli_variation" ? 0.95 : itemFields.priceSource === "meli_item_legacy" ? 0.85 : 0.75) : result.confidence.price,
      variant: selectedVariation ? 0.9 : result.selectedVariant.length > 0 ? 0.7 : result.confidence.variant,
    };
    state.priceSource = resolvedPriceFields?.priceSource ?? state.priceSource;
  }

  if (result.currentPriceInCents == null) {
    warnings.push("meli_price_not_found");
  }

  const descriptionBudgetMs = Math.min(400, Math.max(0, timeoutMs - Object.values(steps).reduce((sum, value) => sum + value, 0)));
  if (descriptionBudgetMs > 0) {
    try {
      const descriptionPayload = await withStepTiming(steps, "mercado_livre_description_api", () =>
        fetchJson(`https://api.mercadolibre.com/items/${signals.itemId}/description`, descriptionBudgetMs),
      );
      if (typeof descriptionPayload?.plain_text === "string" && descriptionPayload.plain_text.trim()) {
        result.description = descriptionPayload.plain_text.trim();
        result.confidence.description = Math.max(result.confidence.description, 0.85);
        state.descriptionApiStatus = "success";
      } else {
        state.descriptionApiStatus = "empty";
      }
    } catch {
      state.descriptionApiStatus = "failed";
      warnings.push("meli_description_failed");
    }
  }

  result.partial = !(result.title && result.imageUrl && result.currentPriceInCents != null);
  state.status = result.partial ? "partial" : "success";
  result.warnings = dedupeWarnings(warnings);
  result.priceSource = state.priceSource;
  result.resolvedUrl = signals.resolvedUrl;
  result.resourceType = signals.resourceType;
  result.observability = buildObservability(signals, steps, state);
  return result;
}
