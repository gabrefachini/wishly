type ProductExtractionResult = {
  originalUrl: string;
  canonicalUrl: string | null;
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
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  currentPriceInCents: number | null;
  originalPriceInCents: number | null;
  currency: string | null;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  selectedVariant: Array<{ name: string; value: string }>;
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
};

type ExtractionContext = {
  html?: string;
  steps: Record<string, number>;
};

interface ProductProvider {
  name: string;
  canHandle(url: URL, context: ExtractionContext): boolean;
  extract(url: URL, context: ExtractionContext, timeoutMs: number): Promise<ProductExtractionResult | null>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOTAL_TIMEOUT_MS = 8_000;
const SPECIFIC_PROVIDER_TIMEOUT_MS = 3_000;
const FALLBACK_PROVIDER_TIMEOUT_MS = 2_000;
const SHORT_LINK_TIMEOUT_MS = 2_000;
const SHORT_LINK_MAX_REDIRECTS = 3;
const HTTP_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; WishlyProductExtractor/2.0; +https://www.wishlyapp.com.br)",
  accept: "text/html,application/xhtml+xml,application/json",
};

function buildEmptyResult(originalUrl: string): ProductExtractionResult {
  return {
    originalUrl,
    canonicalUrl: null,
    provider: "manual",
    storeName: null,
    sellerName: null,
    externalProductId: null,
    externalVariantId: null,
    title: null,
    description: null,
    imageUrl: null,
    imageUrls: [],
    currentPriceInCents: null,
    originalPriceInCents: null,
    currency: null,
    availability: "unknown",
    selectedVariant: [],
    extractedAt: new Date().toISOString(),
    partial: false,
    confidence: {
      title: 0,
      description: 0,
      image: 0,
      price: 0,
      variant: 0,
    },
    warnings: [],
    timings: {
      totalMs: 0,
      steps: {},
    },
  };
}

function finalizeResult(result: ProductExtractionResult, steps: Record<string, number>, startedAt: number): ProductExtractionResult {
  const warnings = [...result.warnings];
  if (!result.title) warnings.push("title_missing");
  if (!result.imageUrl) warnings.push("image_missing");
  if (result.currentPriceInCents == null) warnings.push("price_missing");

  return {
    ...result,
    imageUrls: Array.from(new Set(result.imageUrls.filter(Boolean))),
    extractedAt: new Date().toISOString(),
    partial: result.partial || !hasEssentialFields(result),
    warnings,
    timings: {
      totalMs: Date.now() - startedAt,
      steps,
    },
  };
}

function hasEssentialFields(result: ProductExtractionResult | null | undefined) {
  return Boolean(result?.title && result?.imageUrl && result.currentPriceInCents != null);
}

function mergeResults(base: ProductExtractionResult | null, candidate: ProductExtractionResult | null, originalUrl: string) {
  if (!base) return candidate;
  if (!candidate) return base;

  return {
    ...base,
    ...candidate,
    originalUrl,
    canonicalUrl: candidate.canonicalUrl ?? base.canonicalUrl,
    storeName: candidate.storeName ?? base.storeName,
    sellerName: candidate.sellerName ?? base.sellerName,
    externalProductId: candidate.externalProductId ?? base.externalProductId,
    externalVariantId: candidate.externalVariantId ?? base.externalVariantId,
    title: candidate.title ?? base.title,
    description: candidate.description ?? base.description,
    imageUrl: candidate.imageUrl ?? base.imageUrl,
    imageUrls: candidate.imageUrls.length > 0 ? candidate.imageUrls : base.imageUrls,
    currentPriceInCents: candidate.currentPriceInCents ?? base.currentPriceInCents,
    originalPriceInCents: candidate.originalPriceInCents ?? base.originalPriceInCents,
    currency: candidate.currency ?? base.currency,
    availability: candidate.availability !== "unknown" ? candidate.availability : base.availability,
    selectedVariant: candidate.selectedVariant.length > 0 ? candidate.selectedVariant : base.selectedVariant,
    partial: base.partial || candidate.partial,
    confidence: {
      title: Math.max(base.confidence.title, candidate.confidence.title),
      description: Math.max(base.confidence.description, candidate.confidence.description),
      image: Math.max(base.confidence.image, candidate.confidence.image),
      price: Math.max(base.confidence.price, candidate.confidence.price),
      variant: Math.max(base.confidence.variant, candidate.confidence.variant),
    },
    warnings: Array.from(new Set([...base.warnings, ...candidate.warnings])),
    timings: base.timings ?? candidate.timings,
  };
}

async function withStepTiming<T>(steps: Record<string, number>, label: string, task: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    return await task();
  } finally {
    steps[label] = Date.now() - startedAt;
  }
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error(`timeout:${timeoutMs}`)), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

async function fetchText(url: string, timeoutMs: number, init: RequestInit = {}) {
  const timeout = createTimeoutSignal(timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...HTTP_HEADERS,
        ...(init.headers ?? {}),
      },
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    return await response.text();
  } finally {
    timeout.clear();
  }
}

async function fetchJson(url: string, timeoutMs: number, init: RequestInit = {}) {
  const timeout = createTimeoutSignal(timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...HTTP_HEADERS,
        ...(init.headers ?? {}),
      },
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    return await response.json();
  } finally {
    timeout.clear();
  }
}

async function ensureHtml(url: URL, context: ExtractionContext, timeoutMs: number) {
  if (!context.html) {
    context.html = await withStepTiming(context.steps, "fetch_html", () => fetchText(url.toString(), timeoutMs));
  }
  return context.html;
}

function isHttpProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function assertSafeUrl(url: URL) {
  if (!isHttpProtocol(url.protocol)) {
    throw new Error("invalid_protocol");
  }

  if (url.username || url.password) {
    throw new Error("invalid_credentials_in_url");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    hostname.endsWith(".localdomain") ||
    hostname === "[::1]" ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("unsafe_host");
  }
}

function isMercadoLivreHost(hostname: string) {
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

function isMercadoLivreShortHost(hostname: string) {
  return hostname.toLowerCase() === "meli.la";
}

async function resolveShortUrl(url: URL, steps: Record<string, number>) {
  return await withStepTiming(steps, "resolve_short_url", async () => {
    let current = new URL(url.toString());

    for (let redirectCount = 0; redirectCount < SHORT_LINK_MAX_REDIRECTS; redirectCount += 1) {
      assertSafeUrl(current);
      const timeout = createTimeoutSignal(SHORT_LINK_TIMEOUT_MS);
      try {
        const response = await fetch(current.toString(), {
          method: "GET",
          headers: HTTP_HEADERS,
          redirect: "manual",
          signal: timeout.signal,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) return current;
          current = new URL(location, current);
          continue;
        }

        return current;
      } finally {
        timeout.clear();
      }
    }

    throw new Error("too_many_redirects");
  });
}

function normalizeMercadoLivreUrl(url: URL) {
  if (!isMercadoLivreHost(url.hostname)) return url;
  return new URL(url.toString());
}

function parseMoneyToCents(value: string | number | null | undefined) {
  if (value == null) return null;
  const normalized = String(value).replace(/[^\d,.-]/g, "").trim();
  if (!normalized) return null;
  const decimal = normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized;
  const amount = Number(decimal);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function toAvailability(value: string | null | undefined): ProductExtractionResult["availability"] {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  if (normalized.includes("instock") || normalized.includes("in_stock") || normalized.includes("available")) return "in_stock";
  if (normalized.includes("preorder") || normalized.includes("pre-order")) return "preorder";
  if (normalized.includes("outofstock") || normalized.includes("out_of_stock") || normalized.includes("soldout")) return "out_of_stock";
  return "unknown";
}

function getTitle(html: string) {
  return matchTagContent(html, "title");
}

function matchTagContent(html: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return decodeHtml(regex.exec(html)?.[1] ?? "").trim() || null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseMetaTags(html: string) {
  const metas = new Map<string, string>();
  for (const match of html.matchAll(/<meta\s+([^>]+)>/gi)) {
    const attrs = match[1];
    const key = attrValue(attrs, "property") || attrValue(attrs, "name");
    const content = attrValue(attrs, "content");
    if (key && content) metas.set(key.toLowerCase(), decodeHtml(content));
  }
  return metas;
}

function attrValue(raw: string, attr: string) {
  const match = new RegExp(`${attr}=["']([^"']+)["']`, "i").exec(raw);
  return match?.[1] ?? null;
}

function parseLdJsonBlocks(html: string) {
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

function flattenGraph(nodes: unknown[]): Record<string, unknown>[] {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    const record = node as Record<string, unknown>;
    if (Array.isArray(record["@graph"])) {
      return flattenGraph(record["@graph"] as unknown[]);
    }
    return [record];
  });
}

function normalizeImages(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => normalizeImages(entry));
  if (typeof value === "object" && value && "url" in value && typeof value.url === "string") return [value.url];
  return [];
}

function findCanonicalUrl(html: string) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
}

function getHostnameStoreName(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

function extractMercadoLivreItemId(url: URL) {
  const matches = [
    url.toString().match(/\b(MLB-?\d{8,})\b/i),
    url.pathname.match(/\b(MLB-?\d{8,})\b/i),
    url.search.match(/\b(MLB-?\d{8,})\b/i),
  ];

  for (const match of matches) {
    if (!match?.[1]) continue;
    const digits = match[1].replace(/[^0-9]/g, "");
    if (digits) return `MLB${digits}`;
  }

  return null;
}

class MercadoLivreProvider implements ProductProvider {
  name = "mercado_livre";

  canHandle(url: URL) {
    return isMercadoLivreHost(url.hostname);
  }

  async extract(url: URL, context: ExtractionContext, timeoutMs: number) {
    const itemId = extractMercadoLivreItemId(url);
    if (!itemId) return null;

    const item = await withStepTiming(context.steps, "mercado_livre_item_api", () =>
      fetchJson(`https://api.mercadolibre.com/items/${itemId}`, timeoutMs),
    );

    return {
      originalUrl: url.toString(),
      canonicalUrl: item.permalink ?? url.toString(),
      provider: "mercado_livre",
      storeName: "Mercado Livre",
      sellerName: null,
      externalProductId: item.id ?? itemId,
      externalVariantId: null,
      title: item.title ?? null,
      description: null,
      imageUrl: item.pictures?.[0]?.secure_url ?? item.thumbnail_secure_url ?? null,
      imageUrls: (item.pictures ?? []).map((picture: { secure_url?: string; url?: string }) => picture.secure_url ?? picture.url).filter(Boolean),
      currentPriceInCents: parseMoneyToCents(item.price),
      originalPriceInCents: parseMoneyToCents(item.original_price),
      currency: item.currency_id ?? "BRL",
      availability: item.available_quantity > 0 ? "in_stock" : "out_of_stock",
      selectedVariant: (item.attributes ?? [])
        .map((attribute: { name?: string; value_name?: string }) => ({
          name: attribute.name ?? "",
          value: attribute.value_name ?? "",
        }))
        .filter((attribute: { name: string; value: string }) => attribute.name && attribute.value),
      extractedAt: new Date().toISOString(),
      partial: false,
      confidence: {
        title: 0.98,
        description: 0,
        image: 0.98,
        price: 0.98,
        variant: 0.8,
      },
      warnings: [],
    };
  }
}

class ShopifyProvider implements ProductProvider {
  name = "shopify";

  canHandle(url: URL, context: ExtractionContext) {
    const html = context.html ?? "";
    return url.pathname.includes("/products/") || html.includes("cdn.shopify.com") || html.includes("Shopify");
  }

  async extract(url: URL, context: ExtractionContext, timeoutMs: number) {
    const html = await ensureHtml(url, context, timeoutMs);
    const variantId = url.searchParams.get("variant");
    const jsonLdResult = extractFromStructuredData(url, html);
    const scriptVariantMatch = html.match(/"variantId"\s*:\s*"?(\d+)"?/i) || html.match(/"selected_or_first_available_variant"\s*:\s*\{[^}]*"id"\s*:\s*(\d+)/i);
    const productIdMatch = html.match(/"product_id"\s*:\s*"?(\d+)"?/i) || html.match(/"product":{"id":(\d+)/i);

    if (!jsonLdResult && !scriptVariantMatch && !productIdMatch) return null;

    const featuredImages = normalizeImages(
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null,
    );

    return {
      ...(jsonLdResult ?? buildEmptyResult(url.toString())),
      originalUrl: url.toString(),
      canonicalUrl: jsonLdResult?.canonicalUrl ?? findCanonicalUrl(html) ?? url.toString(),
      provider: "shopify",
      storeName: jsonLdResult?.storeName ?? getHostnameStoreName(url),
      externalProductId: productIdMatch?.[1] ?? jsonLdResult?.externalProductId ?? null,
      externalVariantId: variantId ?? scriptVariantMatch?.[1] ?? jsonLdResult?.externalVariantId ?? null,
      imageUrl: jsonLdResult?.imageUrl ?? featuredImages[0] ?? null,
      imageUrls: jsonLdResult?.imageUrls?.length ? jsonLdResult.imageUrls : featuredImages,
      partial: !hasEssentialFields(jsonLdResult ?? undefined),
      confidence: {
        title: Math.max(jsonLdResult?.confidence.title ?? 0, 0.9),
        description: Math.max(jsonLdResult?.confidence.description ?? 0, 0.8),
        image: Math.max(jsonLdResult?.confidence.image ?? 0, 0.85),
        price: Math.max(jsonLdResult?.confidence.price ?? 0, 0.85),
        variant: variantId || scriptVariantMatch ? 0.9 : jsonLdResult?.confidence.variant ?? 0.4,
      },
      warnings: jsonLdResult?.warnings ?? [],
    };
  }
}

class StructuredDataProvider implements ProductProvider {
  name = "structured_data";

  canHandle() {
    return true;
  }

  async extract(url: URL, context: ExtractionContext, timeoutMs: number) {
    const html = await ensureHtml(url, context, timeoutMs);
    return extractFromStructuredData(url, html);
  }
}

class OpenGraphProvider implements ProductProvider {
  name = "open_graph";

  canHandle() {
    return true;
  }

  async extract(url: URL, context: ExtractionContext, timeoutMs: number) {
    const html = await ensureHtml(url, context, timeoutMs);
    const metas = parseMetaTags(html);
    const title = metas.get("og:title") ?? getTitle(html);
    const description = metas.get("og:description") ?? metas.get("description") ?? null;
    const imageUrl = metas.get("og:image") ?? metas.get("twitter:image") ?? null;
    const canonicalUrl = metas.get("og:url") ?? findCanonicalUrl(html) ?? url.toString();
    const price = parseMoneyToCents(metas.get("product:price:amount"));

    if (!title && !imageUrl && price == null) return null;

    return {
      originalUrl: url.toString(),
      canonicalUrl,
      provider: "open_graph",
      storeName: getHostnameStoreName(url),
      sellerName: null,
      externalProductId: null,
      externalVariantId: null,
      title,
      description,
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
      currentPriceInCents: price,
      originalPriceInCents: null,
      currency: metas.get("product:price:currency") ?? null,
      availability: toAvailability(metas.get("product:availability")),
      selectedVariant: [],
      extractedAt: new Date().toISOString(),
      partial: !Boolean(title && imageUrl && price != null),
      confidence: {
        title: title ? 0.7 : 0,
        description: description ? 0.7 : 0,
        image: imageUrl ? 0.7 : 0,
        price: price != null ? 0.7 : 0,
        variant: 0.2,
      },
      warnings: [],
    };
  }
}

class GenericHtmlProvider implements ProductProvider {
  name = "generic";

  canHandle() {
    return true;
  }

  async extract(url: URL, context: ExtractionContext, timeoutMs: number) {
    const html = await ensureHtml(url, context, timeoutMs);
    const title = getTitle(html);
    const metas = parseMetaTags(html);
    const imageUrl = metas.get("og:image") ?? html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
    if (!title && !imageUrl) return null;

    return {
      originalUrl: url.toString(),
      canonicalUrl: findCanonicalUrl(html) ?? url.toString(),
      provider: "generic",
      storeName: getHostnameStoreName(url),
      sellerName: null,
      externalProductId: null,
      externalVariantId: null,
      title,
      description: metas.get("description") ?? null,
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
      currentPriceInCents: null,
      originalPriceInCents: null,
      currency: null,
      availability: "unknown",
      selectedVariant: [],
      extractedAt: new Date().toISOString(),
      partial: true,
      confidence: {
        title: title ? 0.5 : 0,
        description: metas.get("description") ? 0.45 : 0,
        image: imageUrl ? 0.45 : 0,
        price: 0,
        variant: 0,
      },
      warnings: [],
    };
  }
}

function extractFromStructuredData(url: URL, html: string): ProductExtractionResult | null {
  const nodes = flattenGraph(parseLdJsonBlocks(html));
  const candidates = nodes.filter((node) => {
    const type = String(node["@type"] ?? "").toLowerCase();
    return type.includes("product");
  });
  const selected = candidates[0];
  if (!selected) return null;

  const offer = Array.isArray(selected.offers) ? selected.offers[0] : selected.offers;
  const imageUrls = normalizeImages(selected.image);
  const canonicalUrl =
    (typeof selected.url === "string" && selected.url) ||
    (offer && typeof offer.url === "string" && offer.url) ||
    findCanonicalUrl(html) ||
    url.toString();

  return {
    originalUrl: url.toString(),
    canonicalUrl,
    provider: "structured_data",
    storeName: getHostnameStoreName(url),
    sellerName: null,
    externalProductId: typeof selected.sku === "string" ? selected.sku : null,
    externalVariantId: null,
    title: typeof selected.name === "string" ? selected.name : null,
    description: typeof selected.description === "string" ? selected.description : null,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    currentPriceInCents: parseMoneyToCents((offer as Record<string, unknown> | undefined)?.price ?? (offer as Record<string, unknown> | undefined)?.lowPrice),
    originalPriceInCents: parseMoneyToCents((offer as Record<string, unknown> | undefined)?.highPrice),
    currency: typeof (offer as Record<string, unknown> | undefined)?.priceCurrency === "string"
      ? String((offer as Record<string, unknown>).priceCurrency)
      : null,
    availability: toAvailability(typeof (offer as Record<string, unknown> | undefined)?.availability === "string"
      ? String((offer as Record<string, unknown>).availability)
      : null),
    selectedVariant: [],
    extractedAt: new Date().toISOString(),
    partial: !Boolean(selected.name && imageUrls[0] && offer),
    confidence: {
      title: 0.85,
      description: 0.85,
      image: imageUrls.length ? 0.85 : 0.4,
      price: offer ? 0.85 : 0,
      variant: 0.4,
    },
    warnings: [],
  };
}

async function runProvider(
  provider: ProductProvider,
  url: URL,
  context: ExtractionContext,
  timeoutMs: number,
  originalUrl: string,
) {
  return await withStepTiming(context.steps, `provider_${provider.name}`, async () => {
    try {
      const timeout = createTimeoutSignal(timeoutMs);
      try {
        const result = await Promise.race([
          provider.extract(url, context, timeoutMs),
          new Promise<ProductExtractionResult | null>((_, reject) => {
            timeout.signal.addEventListener("abort", () => reject(timeout.signal.reason ?? new Error("timeout")), { once: true });
          }),
        ]);

        if (!result) return null;

        return {
          ...result,
          originalUrl,
        };
      } finally {
        timeout.clear();
      }
    } catch {
      return null;
    }
  });
}

async function extractProduct(originalUrl: string) {
  const startedAt = Date.now();
  const parsedOriginalUrl = new URL(originalUrl);
  assertSafeUrl(parsedOriginalUrl);

  const context: ExtractionContext = {
    steps: {},
  };

  let workingUrl = normalizeMercadoLivreUrl(parsedOriginalUrl);
  if (isMercadoLivreShortHost(workingUrl.hostname)) {
    try {
      workingUrl = await resolveShortUrl(workingUrl, context.steps);
      assertSafeUrl(workingUrl);
    } catch {
      const failed = buildEmptyResult(originalUrl);
      failed.partial = true;
      failed.warnings.push("short_url_resolution_failed");
      return finalizeResult(failed, context.steps, startedAt);
    }
  }

  let bestResult: ProductExtractionResult | null = null;

  const providers: ProductProvider[] = [];
  const mercadoItemId = isMercadoLivreHost(workingUrl.hostname) ? extractMercadoLivreItemId(workingUrl) : null;
  if (mercadoItemId) {
    providers.push(new MercadoLivreProvider());
  } else if (workingUrl.pathname.includes("/products/")) {
    providers.push(new ShopifyProvider());
  }

  providers.push(new StructuredDataProvider(), new OpenGraphProvider(), new GenericHtmlProvider());

  for (let index = 0; index < providers.length; index += 1) {
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = TOTAL_TIMEOUT_MS - elapsedMs;
    if (remainingMs <= 0) {
      break;
    }

    const provider = providers[index];
    const providerTimeoutMs = Math.min(
      index === 0 && (provider.name === "mercado_livre" || provider.name === "shopify")
        ? SPECIFIC_PROVIDER_TIMEOUT_MS
        : FALLBACK_PROVIDER_TIMEOUT_MS,
      remainingMs,
    );

    if (!provider.canHandle(workingUrl, context)) continue;

    const result = await runProvider(provider, workingUrl, context, providerTimeoutMs, originalUrl);
    bestResult = mergeResults(bestResult, result, originalUrl);

    if (hasEssentialFields(result)) {
      return finalizeResult({
        ...(bestResult ?? result ?? buildEmptyResult(originalUrl)),
        partial: Boolean(bestResult?.partial || result?.partial),
      }, context.steps, startedAt);
    }
  }

  const fallback = bestResult ?? buildEmptyResult(originalUrl);
  if (!hasEssentialFields(fallback)) {
    fallback.partial = true;
    fallback.warnings.push("essential_fields_incomplete");
  }

  return finalizeResult(fallback, context.steps, startedAt);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestedUrl = "";

  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "invalid_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    requestedUrl = url;
    const result = await extractProduct(url);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    const fallback = buildEmptyResult(requestedUrl);
    fallback.partial = true;
    fallback.warnings.push("unexpected_error");
    return new Response(JSON.stringify(finalizeResult(fallback, {}, Date.now())), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
