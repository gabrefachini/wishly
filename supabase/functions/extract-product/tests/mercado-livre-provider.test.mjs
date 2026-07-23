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

test("resolveMercadoLivreSignals prefers listing item id from query params over catalog id", () => {
  const catalogWithListing = resolveMercadoLivreSignals({
    originalUrl:
      "https://www.mercadolivre.com.br/placa-de-video-nvidia-geforce-palit-rtx5060-8gb-infinity2-oc/p/MLB65407224?wid=MLB4577516683",
    resolvedUrl:
      "https://www.mercadolivre.com.br/placa-de-video-nvidia-geforce-palit-rtx5060-8gb-infinity2-oc/p/MLB65407224?wid=MLB4577516683",
    html: null,
  });

  assert.equal(catalogWithListing.resourceType, "catalog_product");
  assert.equal(catalogWithListing.catalogProductId, "MLB65407224");
  assert.equal(catalogWithListing.itemId, "MLB4577516683");
});

test("resolveMercadoLivreSignals reads listing item id from hash params on Mercado Livre catalog links", () => {
  const catalogWithHashListing = resolveMercadoLivreSignals({
    originalUrl:
      "https://www.mercadolivre.com.br/placa-de-video/p/MLB65407224#polycard_client=search-desktop&wid=MLB4577516683&sid=search",
    resolvedUrl:
      "https://www.mercadolivre.com.br/placa-de-video/p/MLB65407224#polycard_client=search-desktop&wid=MLB4577516683&sid=search",
    html: null,
  });

  assert.equal(catalogWithHashListing.resourceType, "catalog_product");
  assert.equal(catalogWithHashListing.catalogProductId, "MLB65407224");
  assert.equal(catalogWithHashListing.itemId, "MLB4577516683");
});

test("resolveMercadoLivreSignals keeps listing item id when structured data exposes only catalog product id", () => {
  const catalogWithStructuredOverride = resolveMercadoLivreSignals({
    originalUrl:
      "https://www.mercadolivre.com.br/placa-de-video/p/MLB65407224#polycard_client=search-desktop&wid=MLB4577516683&sid=search",
    resolvedUrl:
      "https://www.mercadolivre.com.br/placa-de-video/p/MLB65407224#polycard_client=search-desktop&wid=MLB4577516683&sid=search",
    html: `
      <html>
        <head>
          <link rel="canonical" href="https://www.mercadolivre.com.br/placa-de-video/p/MLB65407224">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Mercado Libre",
              "sku": "MLB65407224"
            }
          </script>
        </head>
      </html>
    `,
  });

  assert.equal(catalogWithStructuredOverride.catalogProductId, "MLB65407224");
  assert.equal(catalogWithStructuredOverride.itemId, "MLB4577516683");
});

test("resolveMercadoLivreSignals does not treat catalog product id as listing item id when no listing id exists", () => {
  const catalogOnly = resolveMercadoLivreSignals({
    originalUrl: "https://www.mercadolivre.com.br/p/MLB65407224",
    resolvedUrl: "https://www.mercadolivre.com.br/p/MLB65407224",
    html: null,
  });

  assert.equal(catalogOnly.resourceType, "catalog_product");
  assert.equal(catalogOnly.catalogProductId, "MLB65407224");
  assert.equal(catalogOnly.itemId, null);
});

test("resolveMercadoLivreSignals drops generic Mercado Livre title and brand image when no item id is found", () => {
  const genericSignals = resolveMercadoLivreSignals({
    originalUrl: "https://www.mercadolivre.com.br/oferta",
    resolvedUrl: "https://www.mercadolivre.com.br/oferta",
    html: `
      <html>
        <head>
          <meta property="og:title" content="Mercado Libre">
          <meta property="og:image" content="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png">
        </head>
      </html>
    `,
  });

  assert.equal(genericSignals.itemId, null);
  assert.equal(genericSignals.title, null);
  assert.deepEqual(genericSignals.imageUrls, []);
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

test("MercadoLivreProvider resolves catalog links from HTML before calling item API", async () => {
  const html = `
    <html>
      <head>
        <link rel="canonical" href="https://www.mercadolivre.com.br/p/MLB65407224">
        <meta property="og:title" content="Mercado Libre">
        <meta property="og:image" content="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__small@2x.png">
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Placa de video Palit RTX 5060 8GB","sku":"MLB4577516683","image":["https://http2.mlstatic.com/D_Q_NP_2X_98765-MLB4577516683-F.webp"],"offers":{"@type":"Offer","price":"2199.90","priceCurrency":"BRL","availability":"https://schema.org/InStock"}}
        </script>
      </head>
      <body></body>
    </html>
  `;

  const steps = {};
  const requestedUrls = [];
  const result = await extractMercadoLivreProduct({
    originalUrl:
      "https://www.mercadolivre.com.br/placa-de-video-nvidia-geforce-palit-rtx5060-8gb-infinity2-oc/p/MLB65407224#polycard_client=search-desktop&be_origin=backend&search_layout=grid&position=5&type=product&tracking_id=8e05bdf1-c596-4d7b-9995-4ff072524b03&wid=MLB4577516683&sid=search",
    resolvedUrl: new URL(
      "https://www.mercadolivre.com.br/placa-de-video-nvidia-geforce-palit-rtx5060-8gb-infinity2-oc/p/MLB65407224#polycard_client=search-desktop&be_origin=backend&search_layout=grid&position=5&type=product&tracking_id=8e05bdf1-c596-4d7b-9995-4ff072524b03&wid=MLB4577516683&sid=search",
    ),
    html: null,
    timeoutMs: 3000,
    steps,
    ensureHtml: async () => html,
    withStepTiming: async (localSteps, label, task) => {
      const startedAt = performance.now();
      try {
        return await task();
      } finally {
        localSteps[label] = Math.round(performance.now() - startedAt);
      }
    },
    fetchJson: async (url) => {
      requestedUrls.push(url);
      if (url.endsWith("/prices")) {
        return {
          prices: [
            {
              type: "promotion",
              amount: 2199.9,
              regular_amount: 2499.9,
              currency_id: "BRL",
              conditions: { context_restrictions: [] },
            },
          ],
        };
      }

      if (url.endsWith("/description")) {
        return { plain_text: "Descricao da placa." };
      }

      return {
        id: "MLB4577516683",
        title: "Placa de video Palit RTX 5060 8GB",
        permalink: "https://produto.mercadolivre.com.br/MLB-4577516683-placa-de-video-palit-rtx-5060-_JM",
        price: 2499.9,
        original_price: 2499.9,
        currency_id: "BRL",
        available_quantity: 3,
        pictures: [
          {
            id: "PIC-1",
            secure_url: "https://http2.mlstatic.com/D_Q_NP_2X_98765-MLB4577516683-F.webp",
            url: "https://http2.mlstatic.com/D_Q_NP_2X_98765-MLB4577516683-F.webp",
          },
        ],
        attributes: [],
        variations: [],
      };
    },
  });

  assert.equal(result.provider, "mercado_livre");
  assert.equal(result.externalProductId, "MLB4577516683");
  assert.equal(result.title, "Placa de video Palit RTX 5060 8GB");
  assert.equal(result.imageUrl, "https://http2.mlstatic.com/D_Q_NP_2X_98765-MLB4577516683-F.webp");
  assert.equal(result.currentPriceInCents, 219990);
  assert.equal(result.partial, false);
  assert.ok(requestedUrls.some((url) => url.includes("/items/MLB4577516683")));
});

test("MercadoLivreProvider falls back to item page HTML when item API fails after resolving wid", async () => {
  const catalogHtml = `
    <html>
      <head>
        <link rel="canonical" href="https://www.mercadolivre.com.br/p/MLB19320242">
      </head>
      <body></body>
    </html>
  `;

  const itemHtml = `
    <html>
      <head>
        <link rel="canonical" href="https://produto.mercadolivre.com.br/MLB-4992081638-_JM">
        <meta property="og:title" content="Forno A Gas Glp Ooni Koda 12 Preto Cinza Para Pizza Bancada Compacto">
        <meta property="og:image" content="https://http2.mlstatic.com/D_Q_NP_2X_ooni-item.webp">
        <meta property="product:price:amount" content="2499.90">
        <meta property="product:price:currency" content="BRL">
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Forno A Gas Glp Ooni Koda 12 Preto Cinza Para Pizza Bancada Compacto","sku":"MLB4992081638","image":["https://http2.mlstatic.com/D_Q_NP_2X_ooni-item.webp"],"offers":{"@type":"Offer","price":"2499.90","priceCurrency":"BRL","availability":"https://schema.org/InStock"}}
        </script>
      </head>
      <body></body>
    </html>
  `;

  const htmlRequests = [];
  const result = await extractMercadoLivreProduct({
    originalUrl:
      "https://www.mercadolivre.com.br/forno-a-gas-glp-ooni-koda-12-preto-cinza-para-pizza-bancada-compacto/p/MLB19320242#polycard_client=search-desktop&wid=MLB4992081638&sid=search",
    resolvedUrl: new URL(
      "https://www.mercadolivre.com.br/forno-a-gas-glp-ooni-koda-12-preto-cinza-para-pizza-bancada-compacto/p/MLB19320242#polycard_client=search-desktop&wid=MLB4992081638&sid=search",
    ),
    html: null,
    timeoutMs: 3000,
    steps: {},
    ensureHtml: async (targetUrl) => {
      htmlRequests.push(targetUrl.toString());
      return targetUrl.hostname === "produto.mercadolivre.com.br" ? itemHtml : catalogHtml;
    },
    withStepTiming: async (_localSteps, _label, task) => await task(),
    fetchJson: async (url) => {
      if (url.endsWith("/prices")) {
        throw new Error("price-api-failed");
      }
      throw new Error("item-api-failed");
    },
  });

  assert.equal(result.externalProductId, "MLB4992081638");
  assert.equal(result.title, "Forno A Gas Glp Ooni Koda 12 Preto Cinza Para Pizza Bancada Compacto");
  assert.equal(result.imageUrl, "https://http2.mlstatic.com/D_Q_NP_2X_ooni-item.webp");
  assert.equal(result.currentPriceInCents, 249990);
  assert.equal(result.currency, "BRL");
  assert.ok(htmlRequests.some((url) => url.includes("produto.mercadolivre.com.br/MLB-4992081638-_JM")));
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
