export type IntegrationType =
  | "api"
  | "shopify"
  | "json_ld"
  | "metadata"
  | "html_parser"
  | "manual";

export type Availability = "in_stock" | "out_of_stock" | "preorder" | "unknown";

export type ProductPricing = {
  currency: "BRL";
  cashPrice: number | null;
  cashPriceLabel: string | null;
  installment: {
    quantity: number;
    amount: number;
    total: number | null;
    interestFree: boolean | null;
    label: string | null;
  } | null;
  currentPrice: number | null;
  previousPrice: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  capturedAt: string;
  source: "api" | "structured_data" | "html" | "ai" | "user";
};

export type NormalizeUrlResult = {
  originalUrl: string;
  canonicalUrl: string;
  retailerSlug: string | null;
  externalProductId: string | null;
  externalVariantId: string | null;
  trackingParamsRemoved: string[];
  confidence: number;
};

export type ExtractProductInput = {
  originalUrl: string;
  canonicalUrl: string;
  retailerSlug: string | null;
  operationId: string;
};

export type ExtractProductResult = {
  externalProductId: string | null;
  externalVariantId: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  ean: string | null;
  sku: string | null;
  mpn: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  pricing: ProductPricing | null;
  shippingPrice: number | null;
  currency: string;
  sellerName: string | null;
  sellerExternalId: string | null;
  availability: Availability;
  condition: string | null;
  attributes: Record<string, unknown>;
  extractionMethod: IntegrationType;
  extractionConfidence: number;
  warnings: string[];
  rawData?: Record<string, unknown> | null;
};

export interface RetailerAdapter {
  slug: string;
  canHandle(url: URL): boolean;
  normalizeUrl(url: URL): Promise<NormalizeUrlResult>;
  extractProduct(input: ExtractProductInput): Promise<ExtractProductResult>;
}

export type ProductMatchInput = {
  gtin?: string | null;
  ean?: string | null;
  mpn?: string | null;
  brand?: string | null;
  model?: string | null;
};

export type ProductMatchDecision =
  | { method: "gtin" | "ean" | "brand_mpn_model"; confidence: number }
  | { method: "create_new"; confidence: 1 };

export type OfferMatchInput = {
  retailerSlug?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  canonicalUrl?: string | null;
};

export type OfferMatchDecision =
  | { method: "retailer_external_id" | "canonical_url"; confidence: number }
  | { method: "create_new"; confidence: 1 };
