const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

type ProductPreviewResponse = {
  title: string | null;
  price: number | null;
  imageUrl: string | null;
  sourceUrl: string;
  storeName: string | null;
  currency: "BRL";
};

const STORE_NAMES: Array<{ match: RegExp; name: string }> = [
  { match: /mercadolivre\.com\.br$/i, name: "Mercado Livre" },
  { match: /amazon\.com\.br$/i, name: "Amazon Brasil" },
  { match: /magazineluiza\.com\.br$/i, name: "Magalu" },
  { match: /shopee\.com\.br$/i, name: "Shopee Brasil" },
  { match: /shein\.(?:com|com\.br)$/i, name: "Shein Brasil" },
];

function isPrivateIpv4(hostname: string) {
  const octets = hostname.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      isPrivateIpv4(hostname)
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractMetaTag(html: string, keys: string[]) {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegExp(key)}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

function extractTitle(html: string) {
  return (
    extractMetaTag(html, ["og:title", "twitter:title", "title"]) ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") : null) ||
    null
  );
}

function normalizePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function findStructuredProduct(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findStructuredProduct(item);
      if (found) return found;
    }
    return null;
  }

  const record = data as Record<string, unknown>;
  const typeValue = record["@type"];
  const typeValues = Array.isArray(typeValue) ? typeValue : [typeValue];
  if (typeValues.some((item) => typeof item === "string" && item.toLowerCase() === "product")) {
    return data;
  }

  if (record["@graph"]) {
    return findStructuredProduct(record["@graph"]);
  }

  if (record.mainEntity) {
    return findStructuredProduct(record.mainEntity);
  }

  if (record.offers || record.image || record.name) {
    return data;
  }

  return null;
}

function extractJsonLd(html: string) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];

  for (const script of scripts) {
    const content = script.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (!content) continue;

    const parsed = safeJsonParse(content.trim());
    const product = findStructuredProduct(parsed);
    if (product) {
      return product as Record<string, unknown>;
    }
  }

  return null;
}

function extractImageFromStructuredData(data: Record<string, unknown> | null) {
  if (!data) return null;

  const image = data.image;
  if (typeof image === "string") return image;
  if (Array.isArray(image) && typeof image[0] === "string") return image[0];
  if (image && typeof image === "object" && "url" in image && typeof (image as Record<string, unknown>).url === "string") {
    return (image as Record<string, string>).url;
  }

  return null;
}

function extractPriceFromStructuredData(data: Record<string, unknown> | null) {
  if (!data) return null;

  const offers = data.offers;
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      if (offer && typeof offer === "object") {
        const price = normalizePrice((offer as Record<string, unknown>).price);
        if (price !== null) return price;
      }
    }
  }

  if (offers && typeof offers === "object") {
    const price = normalizePrice((offers as Record<string, unknown>).price);
    if (price !== null) return price;
  }

  return normalizePrice(data.price);
}

function extractBestOfferPrice(html: string) {
  const candidates = [
    "product:price:amount",
    "og:price:amount",
    "twitter:data1",
    "price",
  ];

  for (const key of candidates) {
    const value = extractMetaTag(html, [key]);
    const price = normalizePrice(value);
    if (price !== null) {
      return price;
    }
  }

  const regexMatches = [
    /"price"\s*:\s*"?(?<price>\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)"?/i,
    /(?:R\$|BRL)\s*(?<price>\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
  ];

  for (const pattern of regexMatches) {
    const match = html.match(pattern);
    const price = normalizePrice(match?.groups?.price ?? null);
    if (price !== null) {
      return price;
    }
  }

  return null;
}

function extractStoreName(hostname: string, html: string) {
  const fromMeta = extractMetaTag(html, ["og:site_name", "application-name"]);
  if (fromMeta) {
    return fromMeta;
  }

  const matchedStore = STORE_NAMES.find((item) => item.match.test(hostname));
  if (matchedStore) {
    return matchedStore.name;
  }

  const base = hostname.replace(/^www\./, "").split(".")[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
}

function extractProductPreview(sourceUrl: string, html: string): ProductPreviewResponse {
  const url = new URL(sourceUrl);
  const structured = extractJsonLd(html);
  const title =
    (structured?.name && typeof structured.name === "string" ? structured.name : null) ||
    extractMetaTag(html, ["og:title", "twitter:title", "title"]) ||
    extractTitle(html);
  const price = extractPriceFromStructuredData(structured) ?? extractBestOfferPrice(html);
  const imageUrl =
    extractImageFromStructuredData(structured) ||
    extractMetaTag(html, ["og:image", "twitter:image", "twitter:image:src", "image_src"]);
  const storeName = extractStoreName(url.hostname, html);

  return {
    title: title ? stripTags(title) : null,
    price,
    imageUrl: imageUrl || null,
    sourceUrl,
    storeName,
    currency: "BRL",
  };
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`upstream_${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as { url?: string };
    const normalizedUrl = body?.url ? normalizeUrl(body.url) : null;
    if (!normalizedUrl) {
      return new Response(JSON.stringify({ error: "invalid_product_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await fetchHtml(normalizedUrl);
    const preview = extractProductPreview(normalizedUrl, html);

    return new Response(JSON.stringify(preview), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "product_preview_failed";
    const status = message === "invalid_product_url" ? 400 : 502;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
