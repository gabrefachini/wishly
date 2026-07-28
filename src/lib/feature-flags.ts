export type WishlyFeatureFlag =
  | "commerce_ingestion_v2"
  | "product_offer_model"
  | "price_observation_capture"
  | "affiliate_url_resolution";

function parseFeatureFlags(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isFeatureEnabled(flag: WishlyFeatureFlag) {
  return parseFeatureFlags(import.meta.env.VITE_WISHLY_FEATURE_FLAGS).has(flag);
}
