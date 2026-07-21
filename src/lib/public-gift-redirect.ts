export type AffiliateLinkSnapshot = {
  affiliate_url: string | null;
  status: "generated" | "fallback" | "failed" | null;
};

export type PublicGiftSnapshot = {
  wishlist_id: string;
  store_url: string | null;
};

export function resolvePublicGiftDestination(input: {
  wishlistId: string | null;
  expectedWishlistId: string;
  gift: PublicGiftSnapshot | null;
  affiliateLink: AffiliateLinkSnapshot | null;
}) {
  if (!input.wishlistId || input.wishlistId !== input.expectedWishlistId) {
    return { ok: false as const, code: "wishlist_not_found" };
  }

  if (!input.gift || input.gift.wishlist_id !== input.expectedWishlistId) {
    return { ok: false as const, code: "gift_not_found" };
  }

  const affiliateUrl = input.affiliateLink?.affiliate_url?.trim();
  if (affiliateUrl) {
    return { ok: true as const, url: affiliateUrl, source: input.affiliateLink?.status ?? "generated" };
  }

  const storeUrl = input.gift.store_url?.trim();
  if (!storeUrl) {
    return { ok: false as const, code: "store_url_missing" };
  }

  return { ok: true as const, url: storeUrl, source: "store_url" };
}
