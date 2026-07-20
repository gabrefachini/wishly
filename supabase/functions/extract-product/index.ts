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
  confidence: {
    title: number;
    description: number;
    image: number;
    price: number;
    variant: number;
  };
  warnings: string[];
};

type ExtractionContext = {
  html?: string;
};

interface ProductProvider {
  canHandle(url: URL, context: ExtractionContext): boolean;
  extract(url: URL, context: ExtractionContext): Promise<ProductExtractionResult | null>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    confidence: {
      title: 0,
      description: 0,
      image: 0,
      price: 0,
      variant: 0,
    },
    warnings: [],
  };
}

function finalizeResult(result: ProductExtractionResult): ProductExtractionResult {
  const warnings = [...result.warnings];
  if (!result.title) warnings.push("title_missing");
  if (!result.imageUrl) warnings.push("image_missing");
  if (result.currentPriceInCents == null) warnings.push("price_missing");
  return {
    ...result,
    imageUrls: Array.from(new Set(result.imageUrls.filter(Boolean))),
    extractedAt: new Date().toISOString(),
    warnings,
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; WishlyProductExtractor/1.0; +https://www.wishlyapp.com.br)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`html_fetch_failed:${response.status}`);
  }
  return await response.text();
}

async function ensureHtml(url: URL, context: ExtractionContext) {
  if (!context.html) {
    context.html = await fetchHtml(url.toString());
  }
  return context.html;
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
    .replace(/&quot;/g, '"')
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

class MercadoLivreProvider implements ProductProvider {
  canHandle(url: URL) {
    return url.hostname.includes("mercadolivre") || url.hostname.includes("mercadolibre");
  }

  async extract(url: URL) {
    const itemIdMatch = url.pathname.match(/(ML[A-Z]\d+)/i) || url.pathname.match(/(M[A-Z]{2}\d+)/i);
    const itemId = itemIdMatch?.[1]?.toUpperCase() ?? null;
    if (!itemId) return null;

    const [itemResponse, descriptionResponse] = await Promise.all([
      fetch(`https://api.mercadolibre.com/items/${itemId}`),
      fetch(`https://api.mercadolibre.com/items/${itemId}/description`),
    ]);

    if (!itemResponse.ok) return null;
    const item = await itemResponse.json();
    const description = descriptionResponse.ok ? await descriptionResponse.json() : null;

    return finalizeResult({
      originalUrl: url.toString(),
      canonicalUrl: item.permalink ?? url.toString(),
      provider: "mercado_livre",
      storeName: "Mercado Livre",
      sellerName: null,
      externalProductId: item.id ?? itemId,
      externalVariantId: null,
      title: item.title ?? null,
      description: description?.plain_text ?? null,
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
      confidence: {
        title: 0.98,
        description: description?.plain_text ? 0.9 : 0.4,
        image: 0.98,
        price: 0.98,
        variant: 0.8,
      },
      warnings: [],
    });
  }
}

class ShopifyProvider implements ProductProvider {
  canHandle(url: URL, context: ExtractionContext) {
    const html = context.html ?? "";
    return url.pathname.includes("/products/") || html.includes("cdn.shopify.com") || html.includes("Shopify");
  }

  async extract(url: URL, context: ExtractionContext) {
    const html = await ensureHtml(url, context);
    const variantId = url.searchParams.get("variant");
    const jsonLdResult = extractFromStructuredData(url, html);
    const scriptVariantMatch = html.match(/"variantId"\s*:\s*"?(\d+)"?/i) || html.match(/"selected_or_first_available_variant"\s*:\s*\{[^}]*"id"\s*:\s*(\d+)/i);
    const productIdMatch = html.match(/"product_id"\s*:\s*"?(\d+)"?/i) || html.match(/"product":{"id":(\d+)/i);

    if (!jsonLdResult && !scriptVariantMatch && !productIdMatch) return null;

    const featuredImages = normalizeImages(
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null,
    );

    return finalizeResult({
      ...(jsonLdResult ?? buildEmptyResult(url.toString())),
      originalUrl: url.toString(),
      canonicalUrl: jsonLdResult?.canonicalUrl ?? findCanonicalUrl(html) ?? url.toString(),
      provider: "shopify",
      storeName: jsonLdResult?.storeName ?? getHostnameStoreName(url),
      externalProductId: productIdMatch?.[1] ?? jsonLdResult?.externalProductId ?? null,
      externalVariantId: variantId ?? scriptVariantMatch?.[1] ?? jsonLdResult?.externalVariantId ?? null,
      imageUrl: jsonLdResult?.imageUrl ?? featuredImages[0] ?? null,
      imageUrls: jsonLdResult?.imageUrls?.length ? jsonLdResult.imageUrls : featuredImages,
      confidence: {
        title: Math.max(jsonLdResult?.confidence.title ?? 0, 0.9),
        description: Math.max(jsonLdResult?.confidence.description ?? 0, 0.8),
        image: Math.max(jsonLdResult?.confidence.image ?? 0, 0.85),
        price: Math.max(jsonLdResult?.confidence.price ?? 0, 0.85),
        variant: variantId || scriptVariantMatch ? 0.9 : jsonLdResult?.confidence.variant ?? 0.4,
      },
    });
  }
}

class StructuredDataProvider implements ProductProvider {
  canHandle() {
    return true;
  }

  async extract(url: URL, context: ExtractionContext) {
    const html = await ensureHtml(url, context);
    return extractFromStructuredData(url, html);
  }
}

class OpenGraphProvider implements ProductProvider {
  canHandle() {
    return true;
  }

  async extract(url: URL, context: ExtractionContext) {
    const html = await ensureHtml(url, context);
    const metas = parseMetaTags(html);
    const title = metas.get("og:title") ?? getTitle(html);
    const description = metas.get("og:description") ?? metas.get("description") ?? null;
    const imageUrl = metas.get("og:image") ?? metas.get("twitter:image") ?? null;
    const canonicalUrl = metas.get("og:url") ?? findCanonicalUrl(html) ?? url.toString();
    const price = parseMoneyToCents(metas.get("product:price:amount"));

    if (!title && !imageUrl && price == null) return null;

    return finalizeResult({
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
      confidence: {
        title: title ? 0.7 : 0,
        description: description ? 0.7 : 0,
        image: imageUrl ? 0.7 : 0,
        price: price != null ? 0.7 : 0,
        variant: 0.2,
      },
      warnings: [],
    });
  }
}

class GenericHtmlProvider implements ProductProvider {
  canHandle() {
    return true;
  }

  async extract(url: URL, context: ExtractionContext) {
    const html = await ensureHtml(url, context);
    const title = getTitle(html);
    const metas = parseMetaTags(html);
    const imageUrl = metas.get("og:image") ?? html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
    if (!title && !imageUrl) return null;

    return finalizeResult({
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
      confidence: {
        title: title ? 0.5 : 0,
        description: metas.get("description") ? 0.45 : 0,
        image: imageUrl ? 0.45 : 0,
        price: 0,
        variant: 0,
      },
      warnings: [],
    });
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

  return finalizeResult({
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
    confidence: {
      title: 0.85,
      description: 0.85,
      image: imageUrls.length ? 0.85 : 0.4,
      price: offer ? 0.85 : 0,
      variant: 0.4,
    },
    warnings: [],
  });
}

function findCanonicalUrl(html: string) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
}

function getHostnameStoreName(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

async function extractProduct(url: URL) {
  const context: ExtractionContext = {};
  const providers: ProductProvider[] = [
    new MercadoLivreProvider(),
    new ShopifyProvider(),
    new StructuredDataProvider(),
    new OpenGraphProvider(),
    new GenericHtmlProvider(),
  ];

  for (const provider of providers) {
    if (!provider.canHandle(url, context)) continue;
    try {
      const result = await provider.extract(url, context);
      if (result && (result.title || result.imageUrl || result.currentPriceInCents != null)) {
        return result;
      }
    } catch {
      continue;
    }
  }

  return finalizeResult(buildEmptyResult(url.toString()));
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
    const parsedUrl = new URL(url);
    const result = await extractProduct(parsedUrl);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify(finalizeResult(buildEmptyResult(requestedUrl))), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
