import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { extractMercadoLivreProduct, normalizeMercadoLivreItemId, resolveMercadoLivreSignals } from "../lib/mercado-livre.mjs";
import { mercadoLivreCorpus } from "./corpus.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createHarness(entry) {
  const steps = {};
  const fixture = entry.fixture;
  let htmlCache = null;

  async function withStepTiming(localSteps, label, task) {
    const startedAt = performance.now();
    try {
      return await task();
    } finally {
      localSteps[label] = Math.round(performance.now() - startedAt);
    }
  }

  async function ensureHtml() {
    if (!htmlCache) {
      await sleep(entry.delays.html);
      htmlCache = fixture.html;
    }
    return htmlCache;
  }

  async function fetchJson(url) {
    if (url.endsWith("/description")) {
      await sleep(entry.delays.description);
      if (fixture.descriptionResponse instanceof Error) {
        throw fixture.descriptionResponse;
      }
      return fixture.descriptionResponse ?? {};
    }

    if (url.endsWith("/prices")) {
      await sleep(entry.delays.price);
      if (!fixture.pricesResponse) {
        throw new Error("price_api_failed");
      }
      return fixture.pricesResponse;
    }

    await sleep(entry.delays.item);
    if (!fixture.itemResponse) {
      throw new Error("item_api_failed");
    }
    return fixture.itemResponse;
  }

  return {
    steps,
    withStepTiming,
    ensureHtml,
    fetchJson,
  };
}

async function runNewExtractor(entry) {
  const harness = createHarness(entry);
  const startedAt = performance.now();
  const result = await extractMercadoLivreProduct({
    originalUrl: entry.fixture.originalUrl,
    resolvedUrl: new URL(entry.fixture.resolvedUrl),
    html: null,
    timeoutMs: 3000,
    steps: harness.steps,
    fetchJson: harness.fetchJson,
    ensureHtml: async () => await harness.ensureHtml(),
    withStepTiming: harness.withStepTiming,
  });

  return {
    durationMs: performance.now() - startedAt,
    result,
  };
}

async function runLegacyExtractor(entry) {
  const startedAt = performance.now();
  const itemId = normalizeMercadoLivreItemId(entry.fixture.resolvedUrl);

  if (!itemId || !entry.fixture.itemResponse) {
    await sleep(entry.delays.html);
    return {
      durationMs: performance.now() - startedAt,
      result: {
        provider: "generic",
        title: entry.fixture.html.includes("<title>") ? true : false,
        image: entry.fixture.html.includes("<img src=") ? true : false,
        price: false,
      },
    };
  }

  await sleep(entry.delays.item);
  return {
    durationMs: performance.now() - startedAt,
    result: {
      provider: "mercado_livre",
      title: Boolean(entry.fixture.itemResponse.title),
      image: Boolean(entry.fixture.itemResponse.pictures?.[0]?.secure_url),
      price: entry.fixture.itemResponse.price != null,
    },
  };
}

function percentile(values, target) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * target) - 1));
  return sorted[index];
}

test("resolveMercadoLivreSignals detects item, catalog, user product and variation formats", async () => {
  const catalog = resolveMercadoLivreSignals({
    originalUrl: "https://www.mercadolivre.com.br/p/MLB200000001",
    resolvedUrl: "https://www.mercadolivre.com.br/p/MLB200000001",
    html: null,
  });
  const userProduct = resolveMercadoLivreSignals({
    originalUrl: "https://www.mercadolivre.com.br/up/MLBU300000001",
    resolvedUrl: "https://www.mercadolivre.com.br/up/MLBU300000001",
    html: null,
  });
  const variation = resolveMercadoLivreSignals({
    originalUrl: "https://produto.mercadolivre.com.br/MLB-100000008-cadeira-_JM?variation=2001",
    resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000008-cadeira-_JM?variation=2001",
    html: null,
  });

  assert.equal(catalog.resourceType, "catalog_product");
  assert.equal(userProduct.resourceType, "user_product");
  assert.equal(variation.itemId, "MLB100000008");
  assert.equal(variation.variationId, "2001");
});

test("MercadoLivreProvider preserves provider mercado_livre on catalog and user product partials", async () => {
  const catalogEntry = mercadoLivreCorpus.find((entry) => entry.id === "catalog-structured-only");
  const userProductEntry = mercadoLivreCorpus.find((entry) => entry.id === "user-product-structured-only");
  assert.ok(catalogEntry);
  assert.ok(userProductEntry);

  const catalogResult = await runNewExtractor(catalogEntry);
  const userProductResult = await runNewExtractor(userProductEntry);

  assert.equal(catalogResult.result.provider, "mercado_livre");
  assert.equal(userProductResult.result.provider, "mercado_livre");
  assert.ok(catalogResult.result.warnings.includes("meli_catalog_product_detected"));
  assert.ok(userProductResult.result.warnings.includes("meli_user_product_detected"));
});

test("MercadoLivreProvider corpus meets recognition and extraction targets", async () => {
  const before = [];
  const after = [];

  for (const entry of mercadoLivreCorpus) {
    before.push(await runLegacyExtractor(entry));
    after.push(await runNewExtractor(entry));
  }

  const beforeMetrics = {
    recognized: before.filter((run) => run.result.provider === "mercado_livre").length / before.length,
    title: before.filter((run) => run.result.title).length / before.length,
    image: before.filter((run) => run.result.image).length / before.length,
    price: before.filter((run) => run.result.price).length / before.length,
    p50: percentile(before.map((run) => run.durationMs), 0.5),
    p95: percentile(before.map((run) => run.durationMs), 0.95),
  };

  const afterMetrics = {
    recognized: after.filter((run) => run.result.provider === "mercado_livre").length / after.length,
    title: after.filter((run) => Boolean(run.result.title)).length / after.length,
    image: after.filter((run) => Boolean(run.result.imageUrl)).length / after.length,
    price: after.filter((run) => run.result.currentPriceInCents != null).length / after.length,
    genericFallback: after.filter((run) => run.result.provider === "generic").length / after.length,
    p50: percentile(after.map((run) => run.durationMs), 0.5),
    p95: percentile(after.map((run) => run.durationMs), 0.95),
  };

  console.log(JSON.stringify({
    corpusSize: mercadoLivreCorpus.length,
    beforeMetrics,
    afterMetrics,
  }, null, 2));

  assert.ok(afterMetrics.recognized >= 0.95);
  assert.ok(afterMetrics.title >= 0.98);
  assert.ok(afterMetrics.image >= 0.98);
  assert.ok(afterMetrics.price >= 0.9);
  assert.ok(afterMetrics.genericFallback < 0.02);
  assert.ok(afterMetrics.p50 < 1500);
  assert.ok(afterMetrics.p95 < 4000);
  assert.ok(afterMetrics.recognized > beforeMetrics.recognized);
  assert.ok(afterMetrics.price > beforeMetrics.price);
});

