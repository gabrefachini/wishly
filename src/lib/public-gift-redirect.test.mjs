import test from "node:test";
import assert from "node:assert/strict";

import { resolvePublicGiftDestination } from "./public-gift-redirect.ts";

test("public redirect uses store_url when affiliate link does not exist", () => {
  const result = resolvePublicGiftDestination({
    wishlistId: "w1",
    expectedWishlistId: "w1",
    gift: { wishlist_id: "w1", store_url: "https://loja.com/produto" },
    affiliateLink: null,
  });
  assert.deepEqual(result, { ok: true, url: "https://loja.com/produto", source: "store_url" });
});

test("public redirect prefers generated affiliate link when present", () => {
  const result = resolvePublicGiftDestination({
    wishlistId: "w1",
    expectedWishlistId: "w1",
    gift: { wishlist_id: "w1", store_url: "https://loja.com/produto" },
    affiliateLink: { affiliate_url: "https://afiliado.com/p", status: "generated" },
  });
  assert.deepEqual(result, { ok: true, url: "https://afiliado.com/p", source: "generated" });
});

test("public redirect also accepts fallback affiliate link", () => {
  const result = resolvePublicGiftDestination({
    wishlistId: "w1",
    expectedWishlistId: "w1",
    gift: { wishlist_id: "w1", store_url: "https://loja.com/produto" },
    affiliateLink: { affiliate_url: "https://loja.com/produto", status: "fallback" },
  });
  assert.deepEqual(result, { ok: true, url: "https://loja.com/produto", source: "fallback" });
});

test("public redirect fails when store_url is missing", () => {
  const result = resolvePublicGiftDestination({
    wishlistId: "w1",
    expectedWishlistId: "w1",
    gift: { wishlist_id: "w1", store_url: null },
    affiliateLink: null,
  });
  assert.deepEqual(result, { ok: false, code: "store_url_missing" });
});

test("public redirect blocks gifts from another list", () => {
  const result = resolvePublicGiftDestination({
    wishlistId: "w1",
    expectedWishlistId: "w1",
    gift: { wishlist_id: "w2", store_url: "https://loja.com/produto" },
    affiliateLink: null,
  });
  assert.deepEqual(result, { ok: false, code: "gift_not_found" });
});

test("public redirect blocks invalid public wishlist", () => {
  const result = resolvePublicGiftDestination({
    wishlistId: null,
    expectedWishlistId: "w1",
    gift: { wishlist_id: "w1", store_url: "https://loja.com/produto" },
    affiliateLink: null,
  });
  assert.deepEqual(result, { ok: false, code: "wishlist_not_found" });
});
