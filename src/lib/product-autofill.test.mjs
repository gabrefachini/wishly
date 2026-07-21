import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUCT_PLACEHOLDER_DATA_URL,
  WishSubmissionLock,
  buildProductExtractionInsert,
  getProductImageSrc,
  getWishSubmissionReadiness,
  mapAutofillStatusToExtractionStatus,
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

test("missing image returns neutral placeholder instead of random product image", () => {
  assert.equal(getProductImageSrc(null, []), null);
  assert.match(PRODUCT_PLACEHOLDER_DATA_URL, /^data:image\/svg\+xml/);
});
