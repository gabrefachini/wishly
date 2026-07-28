import assert from "node:assert/strict";
import test from "node:test";
import { decideOfferMatch, decideProductMatch } from "../../supabase/functions/_shared/commerce/matching.ts";
import { resolvePurchaseUrl } from "../../supabase/functions/_shared/commerce/purchase-url.ts";
import { normalizeProductUrl } from "../../supabase/functions/_shared/commerce/url-normalizer.ts";
import { adaptLegacyExtraction } from "../../supabase/functions/_shared/commerce/legacy-extraction-adapter.ts";

test("normaliza Mercado Livre e remove somente tracking conhecido", () => {
  const result = normalizeProductUrl(
    "https://www.mercadolivre.com.br/produto/MLB-123456789?utm_source=x&seller_id=42#details",
  );
  assert.equal(result.retailerSlug, "mercado_livre");
  assert.equal(result.externalProductId, "MLB123456789");
  assert.deepEqual(result.trackingParamsRemoved, ["utm_source"]);
  assert.match(result.canonicalUrl, /seller_id=42/);
  assert.doesNotMatch(result.canonicalUrl, /utm_source|#details/);
});

test("preserva variante da Shopee e ordena parâmetros", () => {
  const result = normalizeProductUrl(
    "https://shopee.com.br/nome-i.100.200?utm_campaign=x&modelId=300&sp_atk=keep",
  );
  assert.equal(result.externalProductId, "200");
  assert.equal(result.externalVariantId, "300");
  assert.match(result.canonicalUrl, /modelId=300/);
  assert.match(result.canonicalUrl, /sp_atk=keep/);
});

test("extrai ASIN da Amazon sem remover parâmetros funcionais", () => {
  const result = normalizeProductUrl(
    "https://amazon.com.br/dp/B0ABC12345?th=1&utm_medium=email",
  );
  assert.equal(result.externalProductId, "B0ABC12345");
  assert.match(result.canonicalUrl, /th=1/);
  assert.doesNotMatch(result.canonicalUrl, /utm_medium/);
});

test("rejeita protocolos e hosts locais", () => {
  assert.throws(() => normalizeProductUrl("file:///tmp/item"), /url_protocol_not_allowed/);
  assert.throws(() => normalizeProductUrl("http://127.0.0.1/item"), /url_private_host/);
  assert.throws(() => normalizeProductUrl("não é url"), /url_invalid/);
});

test("matching de produto nunca usa apenas título", () => {
  assert.deepEqual(decideProductMatch({}), { method: "create_new", confidence: 1 });
  assert.deepEqual(decideProductMatch({ gtin: "789123" }), { method: "gtin", confidence: 1 });
  assert.deepEqual(
    decideProductMatch({ brand: "Acme", mpn: "X1", model: "Pro" }),
    { method: "brand_mpn_model", confidence: 0.95 },
  );
});

test("matching de oferta prioriza varejista e ID externo", () => {
  assert.deepEqual(
    decideOfferMatch({
      retailerSlug: "mercado_livre",
      externalProductId: "MLB123",
      canonicalUrl: "https://example.com/item",
    }),
    { method: "retailer_external_id", confidence: 1 },
  );
  assert.deepEqual(
    decideOfferMatch({ canonicalUrl: "https://example.com/item" }),
    { method: "canonical_url", confidence: 0.98 },
  );
});

test("resolve URL afiliada válida e faz fallback para original", () => {
  assert.equal(
    resolvePurchaseUrl({
      affiliateUrl: "https://partner.example/item?tag=wishly",
      originalUrl: "https://shop.example/item",
    }),
    "https://partner.example/item?tag=wishly",
  );
  assert.equal(
    resolvePurchaseUrl({ affiliateUrl: "javascript:alert(1)", originalUrl: "https://shop.example/item" }),
    "https://shop.example/item",
  );
});

test("adapter legado converte centavos, método e confiança", () => {
  const result = adaptLegacyExtraction({
    provider: "structured_data",
    title: "Produto",
    currentPriceInCents: 18990,
    currency: "BRL",
    confidence: { title: 1, price: 0.8 },
    selectedVariant: [{ name: "Cor", value: "Azul" }],
  });
  assert.equal(result.currentPrice, 189.9);
  assert.equal(result.extractionMethod, "json_ld");
  assert.equal(result.extractionConfidence, 0.9);
  assert.deepEqual(result.attributes, { Cor: "Azul" });
});
