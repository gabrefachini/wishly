import type {
  OfferMatchDecision,
  OfferMatchInput,
  ProductMatchDecision,
  ProductMatchInput,
} from "./contracts.ts";

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function decideProductMatch(input: ProductMatchInput): ProductMatchDecision {
  if (present(input.gtin)) return { method: "gtin", confidence: 1 };
  if (present(input.ean)) return { method: "ean", confidence: 1 };
  if (present(input.brand) && present(input.mpn) && present(input.model)) {
    return { method: "brand_mpn_model", confidence: 0.95 };
  }
  return { method: "create_new", confidence: 1 };
}

export function decideOfferMatch(input: OfferMatchInput): OfferMatchDecision {
  if (present(input.retailerSlug) && present(input.externalProductId)) {
    return { method: "retailer_external_id", confidence: 1 };
  }
  if (present(input.canonicalUrl)) {
    return { method: "canonical_url", confidence: 0.98 };
  }
  return { method: "create_new", confidence: 1 };
}
