import type { ExtractProductResult, IntegrationType } from "./contracts.ts";

type LegacyExtractionPayload = {
  provider?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  currentPriceInCents?: number | null;
  originalPriceInCents?: number | null;
  pricing?: ExtractProductResult["pricing"];
  currency?: string | null;
  sellerName?: string | null;
  availability?: ExtractProductResult["availability"] | null;
  selectedVariant?: Array<{ name: string; value: string }>;
  confidence?: Record<string, number>;
  warnings?: string[];
  rawPayload?: Record<string, unknown> | null;
};

const METHOD_BY_PROVIDER: Record<string, IntegrationType> = {
  mercado_livre: "api",
  shopify: "shopify",
  structured_data: "json_ld",
  open_graph: "metadata",
  generic: "html_parser",
  manual: "manual",
};

function centsToUnits(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : value / 100;
}

function averageConfidence(confidence: Record<string, number> | undefined) {
  const values = Object.values(confidence ?? {}).filter(
    (value) => Number.isFinite(value) && value >= 0 && value <= 1,
  );
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function adaptLegacyExtraction(payload: LegacyExtractionPayload): ExtractProductResult {
  const attributes = Object.fromEntries(
    (payload.selectedVariant ?? []).map(({ name, value }) => [name, value]),
  );

  return {
    externalProductId: payload.externalProductId?.trim() || null,
    externalVariantId: payload.externalVariantId?.trim() || null,
    title: payload.title?.trim() || null,
    description: payload.description?.trim() || null,
    imageUrl: payload.imageUrl?.trim() || null,
    brand: null,
    model: null,
    gtin: null,
    ean: null,
    sku: null,
    mpn: null,
    currentPrice: centsToUnits(payload.currentPriceInCents),
    originalPrice: centsToUnits(payload.originalPriceInCents),
    pricing: payload.pricing ?? null,
    shippingPrice: null,
    currency: payload.currency?.trim() || "BRL",
    sellerName: payload.sellerName?.trim() || null,
    sellerExternalId: null,
    availability: payload.availability ?? "unknown",
    condition: null,
    attributes,
    extractionMethod: METHOD_BY_PROVIDER[payload.provider ?? ""] ?? "manual",
    extractionConfidence: averageConfidence(payload.confidence),
    warnings: [...(payload.warnings ?? [])],
    rawData: payload.rawPayload ?? null,
  };
}
