import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createServiceRoleClient,
  getRequiredEnv,
  refreshMercadoLivreAccessToken,
} from "../_shared/meli.ts";
import {
  extractMercadoLivreProduct,
  isMercadoLivreHost,
  isMercadoLivreShortHost,
} from "./lib/mercado-livre.mjs";

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
  priceSource?: string;
  resolvedUrl?: string;
  resourceType?: string;
  observability?: Record<string, unknown>;
};

type ExtractionContext = {
  html?: string;
  htmlUrl?: string;
  steps: Record<string, number>;
  meliAccessToken?: string | null;
  meliAuthState?: "connected" | "public_fallback" | "refresh_failed" | "not_connected";
};

type MercadoLivreConnection = {
  auth_user_id: string;
  meli_user_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string | null;
  expires_at: string | null;
  connected_at: string;
  last_refreshed_at: string | null;
  revoked_at: string | null;
};

interface ProductProvider {
  name: string;
  canHandle(url: URL, context: ExtractionContext): boolean;
  extract(url: URL, context: ExtractionContext, timeoutMs: number): Promise<ProductExtractionResult | null>;
}

const ALLOWED_ORIGINS = new Set([
  "https://www.wishlyapp.com.br",
  "https://wishlyapp.com.br",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5177",
  "http://127.0.0.1:5178",
  "http://127.0.0.1:5179",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
]);

function getAllowedOrigin(origin: string | null) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }
  return "https://www.wishlyapp.com.br";
}

function buildCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function buildJsonResponse(
  request: Request,
  body: Record<string, unknown> | ProductExtractionResult,
  status: number,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(request.headers.get("Origin")),
      "Content-Type": "application/json",
    },
  });
}

function getSupabaseAnonKey() {
  const directKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (directKey) return directKey;

  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!publishableKeys) return "";

  try {
    const parsed = JSON.parse(publishableKeys) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0] ?? "";
  } catch {
    return "";
  }
}

async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "missing_session",
        message: "Sessao ausente. Entre novamente para continuar.",
      }, 401),
    };
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "invalid_session",
        message: "Sessao invalida. Entre novamente para continuar.",
      }, 401),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "auth_config_unavailable",
        message: "Configuracao de autenticacao indisponivel.",
      }, 500),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      response: buildJsonResponse(request, {
        error: "invalid_session",
        message: "Sessao invalida ou expirada. Entre novamente para continuar.",
      }, 401),
    };
  }

  return {
    user,
    response: null,
  };
}

async function loadMercadoLivreConnection(authUserId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("meli_connections")
    .select("auth_user_id, meli_user_id, access_token, refresh_token, token_type, scope, expires_at, connected_at, last_refreshed_at, revoked_at")
    .eq("auth_user_id", authUserId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("meli_connection_load_failed", {
      authUserId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return (data ?? null) as MercadoLivreConnection | null;
}

function isExpiredConnection(connection: MercadoLivreConnection) {
  if (!connection.expires_at) return false;
  const expiresAt = Date.parse(connection.expires_at);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt <= Date.now() + 60_000;
}

async function refreshMercadoLivreConnection(connection: MercadoLivreConnection) {
  const appId = getRequiredEnv("MELI_APP_ID");
  const clientSecret = getRequiredEnv("MELI_SECRET_KEY");
  const tokenPayload = await refreshMercadoLivreAccessToken({
    refreshToken: connection.refresh_token,
    appId,
    clientSecret,
  });

  const supabase = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + Number(tokenPayload.expires_in ?? 0) * 1000).toISOString();
  const nextConnection = {
    ...connection,
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token ?? connection.refresh_token,
    token_type: tokenPayload.token_type ?? connection.token_type,
    scope: tokenPayload.scope ?? connection.scope,
    expires_at: expiresAt,
    last_refreshed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("meli_connections")
    .update({
      access_token: nextConnection.access_token,
      refresh_token: nextConnection.refresh_token,
      token_type: nextConnection.token_type,
      scope: nextConnection.scope,
      expires_at: nextConnection.expires_at,
      last_refreshed_at: nextConnection.last_refreshed_at,
      revoked_at: null,
    })
    .eq("auth_user_id", connection.auth_user_id);

  if (error) {
    console.error("meli_connection_refresh_persist_failed", {
      authUserId: connection.auth_user_id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return nextConnection;
}

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
    provider:
      base.provider === "mercado_livre" || candidate.provider === "mercado_livre"
        ? "mercado_livre"
        : candidate.provider,
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
    priceSource: candidate.priceSource ?? base.priceSource,
    resolvedUrl: candidate.resolvedUrl ?? base.resolvedUrl,
    resourceType: candidate.resourceType ?? base.resourceType,
    observability: candidate.observability ?? base.observability,
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
  const targetUrl = url.toString();
  if (!context.html || context.htmlUrl !== targetUrl) {
    context.html = await withStepTiming(context.steps, "fetch_html", () => fetchText(url.toString(), timeoutMs));
    context.htmlUrl = targetUrl;
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

class MercadoLivreProvider implements ProductProvider {
  name = "mercado_livre";

  canHandle(url: URL) {
    return isMercadoLivreHost(url.hostname);
  }

  async extract(url: URL, context: ExtractionContext, timeoutMs: number) {
    const authHeaders = context.meliAccessToken
      ? {
          Authorization: `Bearer ${context.meliAccessToken}`,
        }
      : undefined;

    return await extractMercadoLivreProduct({
      originalUrl: url.toString(),
      resolvedUrl: url,
      html: context.html,
      timeoutMs,
      steps: context.steps,
      fetchJson: async (targetUrl: string, innerTimeoutMs: number) => await fetchJson(targetUrl, innerTimeoutMs, authHeaders ? { headers: authHeaders } : {}),
      ensureHtml: async (targetUrl: URL, innerTimeoutMs: number) => await ensureHtml(targetUrl, context, innerTimeoutMs),
      withStepTiming,
      meliAuthState: context.meliAuthState ?? "not_connected",
    }) as ProductExtractionResult;
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

async function extractProduct(originalUrl: string, options?: { authUserId?: string | null }) {
  const startedAt = Date.now();
  const parsedOriginalUrl = new URL(originalUrl);
  assertSafeUrl(parsedOriginalUrl);

  const context: ExtractionContext = {
    steps: {},
    meliAccessToken: null,
    meliAuthState: "not_connected",
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
  const isMercadoLivreUrl = isMercadoLivreHost(workingUrl.hostname);
  if (isMercadoLivreUrl) {
    if (options?.authUserId) {
      try {
        const connection = await loadMercadoLivreConnection(options.authUserId);
        if (connection?.access_token) {
          if (isExpiredConnection(connection)) {
            try {
              const activeConnection = await refreshMercadoLivreConnection(connection);
              context.meliAuthState = "connected";
              context.meliAccessToken = activeConnection.access_token;
            } catch (error) {
              context.meliAuthState = "refresh_failed";
              console.error("meli_connection_refresh_failed", {
                authUserId: options.authUserId,
                message: error instanceof Error ? error.message : String(error),
              });
            }
          } else {
            context.meliAuthState = "connected";
            context.meliAccessToken = connection.access_token;
          }
        } else {
          context.meliAuthState = "not_connected";
        }
      } catch (error) {
        context.meliAuthState = "public_fallback";
        console.error("meli_connection_prepare_failed", {
          authUserId: options.authUserId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      context.meliAuthState = "public_fallback";
    }

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
  if (isMercadoLivreUrl) {
    fallback.provider = "mercado_livre";
    fallback.storeName = fallback.storeName ?? "Mercado Livre";
  }
  if (!hasEssentialFields(fallback)) {
    fallback.partial = true;
    fallback.warnings.push("essential_fields_incomplete");
  }

  const finalResult = finalizeResult(fallback, context.steps, startedAt);
  if (finalResult.provider === "mercado_livre") {
    console.log(JSON.stringify(finalResult.observability ?? {
      originalUrl,
      resolvedUrl: workingUrl.toString(),
      providerMatched: "mercado_livre",
      status: finalResult.partial ? "partial" : "success",
      warnings: finalResult.warnings,
      steps: finalResult.timings?.steps ?? context.steps,
    }));
  }

  return finalResult;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: buildCorsHeaders(request.headers.get("Origin")),
    });
  }

  let requestedUrl = "";

  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) {
      return auth.response;
    }

    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return buildJsonResponse(request, { error: "invalid_url" }, 400);
    }

    requestedUrl = url;
    const result = await extractProduct(url, { authUserId: auth.user?.id ?? null });
    return buildJsonResponse(request, result, 200);
  } catch {
    const fallback = buildEmptyResult(requestedUrl);
    fallback.partial = true;
    fallback.warnings.push("unexpected_error");
    return buildJsonResponse(request, finalizeResult(fallback, {}, Date.now()), 200);
  }
});
