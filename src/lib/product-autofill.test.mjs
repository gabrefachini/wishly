import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUCT_PLACEHOLDER_DATA_URL,
  WishSubmissionLock,
  buildProductExtractionInsert,
  getExtractionFeedback,
  getProductImageSrc,
  getWishSubmissionReadiness,
  isAutofillResultCurrent,
  isGenericProductTitle,
  isGenericMercadoLivreTitle,
  isMercadoLivreItemId,
  isMercadoLivreBrandImage,
  mapAutofillStatusToExtractionStatus,
  sanitizeMercadoLivrePreview,
} from "./product-autofill.ts";

test("maps extraction statuses for success, partial and failed paths", () => {
  assert.equal(mapAutofillStatusToExtractionStatus("success"), "success");
  assert.equal(mapAutofillStatusToExtractionStatus("partial"), "partial");
  assert.equal(mapAutofillStatusToExtractionStatus("failed"), "failed");
  assert.equal(mapAutofillStatusToExtractionStatus("timeout"), "failed");
});

test("builds exact product_extractions insert payload", () => {
  const payload = buildProductExtractionInsert({
    giftId: "gift-1",
    name: "Abajur",
    description: "Luz quente",
    imageUrl: "https://img/1.png",
    estimatedPriceInCents: 18900,
    currency: "BRL",
    autofill: {
      requestedUrl: "https://produto.mercadolivre.com.br/MLB-1",
      canonicalUrl: "https://produto.mercadolivre.com.br/MLB-1",
      provider: "mercado_livre",
      imageUrls: ["https://img/1.png"],
      confidence: { title: 0.9 },
      rawPayload: { provider: "mercado_livre" },
      status: "success",
      errorCode: null,
      errorMessage: null,
      currentPriceInCents: 18900,
      originalPriceInCents: 22900,
    },
  });

  assert.deepEqual(Object.keys(payload ?? {}).sort(), [
    "canonical_url",
    "error_code",
    "error_message",
    "extracted_at",
    "extraction_status",
    "field_confidence",
    "gift_id",
    "normalized_payload",
    "provider",
    "raw_payload",
    "requested_url",
  ]);
  assert.equal(payload?.extraction_status, "success");
});

test("skips product_extractions insert when status is not requested or url is empty", () => {
  assert.equal(
    buildProductExtractionInsert({
      giftId: "gift-1",
      name: "Abajur",
      autofill: { requestedUrl: "", status: "success" },
    }),
    null,
  );
  assert.equal(
    buildProductExtractionInsert({
      giftId: "gift-1",
      name: "Abajur",
      autofill: { requestedUrl: "https://produto", status: "not_requested" },
    }),
    null,
  );
});

test("manual creation is allowed only after explicit title confirmation", () => {
  const blocked = getWishSubmissionReadiness({
    title: "",
    productUrl: "https://produto.mercadolivre.com.br/MLB-1",
    extractionStatus: "error",
    extractedUrl: "https://produto.mercadolivre.com.br/MLB-1",
    syncing: false,
  });
  assert.equal(blocked.canSubmit, false);
  assert.match(blocked.reason ?? "", /Complete o nome/);

  const allowed = getWishSubmissionReadiness({
    title: "Abajur para leitura",
    productUrl: "https://produto.mercadolivre.com.br/MLB-1",
    extractionStatus: "error",
    extractedUrl: "https://produto.mercadolivre.com.br/MLB-1",
    syncing: false,
  });
  assert.equal(allowed.canSubmit, true);
  assert.equal(allowed.manualConfirmationRequired, true);
});

test("generic marketplace title is rejected as wish name", () => {
  assert.equal(isGenericProductTitle("Mercado Livre"), true);
  assert.equal(isGenericProductTitle("Amazon"), true);
  assert.equal(isGenericProductTitle("Fone bluetooth"), false);

  const blocked = getWishSubmissionReadiness({
    title: "Mercado Livre",
    productUrl: "https://produto.mercadolivre.com.br/MLB-1",
    extractionStatus: "partial",
    extractedUrl: "https://produto.mercadolivre.com.br/MLB-1",
    syncing: false,
  });

  assert.equal(blocked.canSubmit, false);
  assert.match(blocked.reason ?? "", /nome do produto/i);
});

test("blocks save while extraction is pending or URL is still resolving", () => {
  const pending = getWishSubmissionReadiness({
    title: "Abajur",
    productUrl: "https://produto.mercadolivre.com.br/MLB-1",
    extractionStatus: "loading",
    extractedUrl: "https://produto.mercadolivre.com.br/MLB-1",
    syncing: false,
  });
  assert.equal(pending.canSubmit, false);

  const resolving = getWishSubmissionReadiness({
    title: "Abajur",
    productUrl: "https://produto.mercadolivre.com.br/MLB-1",
    extractionStatus: "idle",
    extractedUrl: null,
    syncing: false,
  });
  assert.equal(resolving.canSubmit, false);
});

test("submission lock blocks duplicate clicks for the same action", () => {
  const lock = new WishSubmissionLock();
  assert.equal(lock.start("same", 1000), true);
  assert.equal(lock.start("same", 1001), false);
  lock.finish(true, 1500);
  assert.equal(lock.start("same", 2000), false);
  assert.equal(lock.start("other", 2000), true);
});

test("accepts only the latest autofill response for the active add view and url", () => {
  assert.equal(
    isAutofillResultCurrent({
      requestId: 3,
      latestRequestId: 3,
      view: "add",
      productUrl: "https://www.mercadolivre.com.br/up/MLBU3543355871",
      requestedUrl: "https://www.mercadolivre.com.br/up/MLBU3543355871",
    }),
    true,
  );

  assert.equal(
    isAutofillResultCurrent({
      requestId: 2,
      latestRequestId: 3,
      view: "add",
      productUrl: "https://www.mercadolivre.com.br/up/MLBU3543355871",
      requestedUrl: "https://www.mercadolivre.com.br/up/MLBU3543355871",
    }),
    false,
  );

  assert.equal(
    isAutofillResultCurrent({
      requestId: 3,
      latestRequestId: 3,
      view: "home",
      productUrl: "https://www.mercadolivre.com.br/up/MLBU3543355871",
      requestedUrl: "https://www.mercadolivre.com.br/up/MLBU3543355871",
    }),
    false,
  );
});

test("detects MLB item identifiers", () => {
  assert.equal(isMercadoLivreItemId("MLB123456789"), true);
  assert.equal(isMercadoLivreItemId("mlb123456789"), true);
  assert.equal(isMercadoLivreItemId("MLBU123456789"), false);
  assert.equal(isMercadoLivreItemId(null), false);
});

test("detects Mercado Livre generic brand title and image", () => {
  assert.equal(isGenericMercadoLivreTitle("Mercado Libre"), true);
  assert.equal(isGenericMercadoLivreTitle("Mercado Livre"), true);
  assert.equal(isGenericMercadoLivreTitle("Forno de pizza"), false);
  assert.equal(
    isMercadoLivreBrandImage("https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png"),
    true,
  );
  assert.equal(isMercadoLivreBrandImage("https://http2.mlstatic.com/D_Q_NP_2X_12345-MLB00000000001-F.webp"), false);
});

test("sanitizes Mercado Livre preview when only brand metadata is available", () => {
  const sanitized = sanitizeMercadoLivrePreview({
    provider: "mercado_livre",
    title: "Mercado Libre",
    imageUrl: "https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png",
    imageUrls: [
      "https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png",
    ],
    externalProductId: null,
  });

  assert.equal(sanitized.title, null);
  assert.equal(sanitized.imageUrl, null);
  assert.deepEqual(sanitized.imageUrls, []);
});

test("sanitizes Mercado Livre catalog partials even when the catalog id looks like MLB", () => {
  const sanitized = sanitizeMercadoLivrePreview({
    provider: "mercado_livre",
    resourceType: "catalog_product",
    canonicalUrl: "https://www.mercadolivre.com.br/p/MLB65407224",
    title: "Mercado Libre",
    imageUrl: "https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__small@2x.png",
    imageUrls: [
      "https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__small@2x.png",
    ],
    externalProductId: "MLB65407224",
    currentPriceInCents: null,
  });

  assert.equal(sanitized.title, null);
  assert.equal(sanitized.imageUrl, null);
  assert.equal(sanitized.externalProductId, null);
  assert.deepEqual(sanitized.imageUrls, []);
});

test("shows explicit MLB guidance when Mercado Livre returns only MLBU partial data", () => {
  const feedback = getExtractionFeedback({
    provider: "mercado_livre",
    warnings: ["meli_user_product_detected", "meli_item_id_not_found"],
    partial: true,
    externalProductId: "MLBU3543355871",
    hasEssentialFields: false,
  });

  assert.equal(feedback.status, "error");
  assert.match(feedback.message, /MLBU/);
  assert.match(feedback.message, /MLB/);
});

test("shows catalog guidance when Mercado Livre returns only catalog partial data", () => {
  const feedback = getExtractionFeedback({
    provider: "mercado_livre",
    warnings: ["meli_catalog_product_detected", "price_missing"],
    partial: true,
    externalProductId: "MLB65407224",
    hasEssentialFields: false,
  });

  assert.equal(feedback.status, "partial");
  assert.match(feedback.message, /catálogo/i);
  assert.match(feedback.message, /MLB/i);
});

test("missing image returns neutral placeholder instead of random product image", () => {
  assert.equal(getProductImageSrc(null, []), null);
  assert.match(PRODUCT_PLACEHOLDER_DATA_URL, /^data:image\/svg\+xml/);
});
