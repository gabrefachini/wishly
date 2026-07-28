type PurchaseOffer = {
  affiliateUrl?: string | null;
  originalUrl?: string | null;
};

function validHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function resolvePurchaseUrl(offer: PurchaseOffer) {
  return validHttpUrl(offer.affiliateUrl) ?? validHttpUrl(offer.originalUrl);
}
