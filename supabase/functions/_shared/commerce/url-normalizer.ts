import type { NormalizeUrlResult } from "./contracts.ts";

type RetailerRule = {
  slug: string;
  hosts: RegExp[];
  normalize?(url: URL): {
    externalProductId?: string | null;
    externalVariantId?: string | null;
    confidence?: number;
  };
};

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "ref_",
]);

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

const RETAILER_RULES: RetailerRule[] = [
  {
    slug: "mercado_livre",
    hosts: [/(^|\.)mercadolivre\.com\.br$/, /(^|\.)mercadolibre\.com$/],
    normalize(url) {
      const fromPath = url.pathname.match(/(?:^|\/)(MLB-?\d{6,})(?:[/?_-]|$)/i)?.[1];
      const catalog = url.pathname.match(/^\/p\/(MLB\d{6,})/i)?.[1];
      const id = (fromPath ?? catalog ?? "").replace("-", "").toUpperCase() || null;
      return { externalProductId: id, confidence: id ? 0.98 : 0.8 };
    },
  },
  {
    slug: "amazon_br",
    hosts: [/(^|\.)amazon\.com\.br$/],
    normalize(url) {
      const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1];
      return { externalProductId: asin?.toUpperCase() ?? null, confidence: asin ? 0.98 : 0.78 };
    },
  },
  {
    slug: "shopee_br",
    hosts: [/(^|\.)shopee\.com\.br$/],
    normalize(url) {
      const match = url.pathname.match(/-i\.(\d+)\.(\d+)(?:[/?]|$)/);
      return {
        externalProductId: match?.[2] ?? null,
        externalVariantId: url.searchParams.get("modelId"),
        confidence: match ? 0.96 : 0.76,
      };
    },
  },
  {
    slug: "magalu",
    hosts: [/(^|\.)magazineluiza\.com\.br$/, /(^|\.)magalu\.com$/],
    normalize(url) {
      const id = url.pathname.match(/\/p\/([^/]+)/i)?.[1] ?? null;
      return { externalProductId: id, confidence: id ? 0.9 : 0.75 };
    },
  },
];

function normalizeHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return normalized.startsWith("www.") ? normalized.slice(4) : normalized;
}

function assertSafeHostname(hostname: string) {
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))
  ) {
    throw new Error("url_private_host");
  }
}

export function normalizeProductUrl(value: string): NormalizeUrlResult {
  const originalUrl = value.trim();
  let url: URL;

  try {
    url = new URL(originalUrl);
  } catch {
    throw new Error("url_invalid");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("url_protocol_not_allowed");
  }

  url.hostname = normalizeHostname(url.hostname);
  assertSafeHostname(url.hostname);
  url.username = "";
  url.password = "";
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  const trackingParamsRemoved: string[] = [];
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      trackingParamsRemoved.push(key);
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  const rule = RETAILER_RULES.find((candidate) =>
    candidate.hosts.some((pattern) => pattern.test(url.hostname))
  );
  const retailer = rule?.normalize?.(url);

  return {
    originalUrl,
    canonicalUrl: url.toString(),
    retailerSlug: rule?.slug ?? null,
    externalProductId: retailer?.externalProductId ?? null,
    externalVariantId: retailer?.externalVariantId ?? null,
    trackingParamsRemoved,
    confidence: retailer?.confidence ?? (rule ? 0.75 : 0.55),
  };
}
