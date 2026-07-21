function buildLdJson({ title, url, imageUrl, price, originalPrice, currency = "BRL", availability = "https://schema.org/InStock", sku }) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: `${title} description`,
    sku,
    url,
    image: [imageUrl],
    offers: {
      "@type": "Offer",
      price,
      highPrice: originalPrice,
      priceCurrency: currency,
      availability,
      url,
    },
  });
}

function buildHtml({
  title,
  canonicalUrl,
  imageUrl,
  price,
  originalPrice,
  currency = "BRL",
  availability = "in_stock",
  itemId = null,
  userProductId = null,
  variationId = null,
  includeLdJson = true,
}) {
  const scriptBits = [];
  if (itemId) scriptBits.push(`"item_id":"${itemId}"`);
  if (userProductId) scriptBits.push(`"user_product_id":"${userProductId}"`);
  if (variationId) scriptBits.push(`"variation_id":"${variationId}"`);

  return `
    <html>
      <head>
        <title>${title}</title>
        <link rel="canonical" href="${canonicalUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:url" content="${canonicalUrl}">
        <meta property="product:price:amount" content="${price ?? ""}">
        <meta property="product:price:currency" content="${currency}">
        <meta property="product:availability" content="${availability}">
        ${includeLdJson ? `<script type="application/ld+json">${buildLdJson({
          title,
          url: canonicalUrl,
          imageUrl,
          price,
          originalPrice,
          currency,
          availability,
          sku: itemId,
        })}</script>` : ""}
        <script>window.__INITIAL_STATE__ = {${scriptBits.join(",")}}</script>
      </head>
      <body>
        <img src="${imageUrl}">
      </body>
    </html>
  `;
}

function buildItemResponse({
  itemId,
  title,
  permalink,
  price,
  originalPrice,
  currency = "BRL",
  availableQuantity = 10,
  pictures,
  attributes = [],
  variations = [],
}) {
  return {
    id: itemId,
    title,
    permalink,
    price,
    original_price: originalPrice,
    currency_id: currency,
    available_quantity: availableQuantity,
    thumbnail_secure_url: pictures[0],
    pictures: pictures.map((pictureUrl, index) => ({
      id: `PIC-${index + 1}`,
      secure_url: pictureUrl,
      url: pictureUrl,
    })),
    attributes,
    variations,
  };
}

function buildPricesResponse({ itemId, currentPrice, originalPrice, currency = "BRL" }) {
  return {
    id: itemId,
    prices: [
      {
        id: "standard",
        type: "standard",
        amount: originalPrice ?? currentPrice,
        regular_amount: null,
        currency_id: currency,
        conditions: {
          context_restrictions: [],
        },
      },
      {
        id: "promotion",
        type: "promotion",
        amount: currentPrice,
        regular_amount: originalPrice ?? null,
        currency_id: currency,
        conditions: {
          context_restrictions: [],
        },
      },
    ],
  };
}

function createEntry(id, config) {
  return {
    id,
    delays: {
      html: config.delays?.html ?? 80,
      item: config.delays?.item ?? 120,
      price: config.delays?.price ?? 110,
      description: config.delays?.description ?? 180,
    },
    expectations: config.expectations,
    fixture: config.fixture,
  };
}

const baseImage = "https://http2.mlstatic.com/D_Q_NP_2X_12345-MLB00000000001-F.webp";

export const mercadoLivreCorpus = [
  createEntry("traditional-standard", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000001-smart-tv-55-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000001-smart-tv-55-_JM",
      html: buildHtml({
        title: "Smart TV 55",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000001-smart-tv-55-_JM",
        imageUrl: baseImage,
        price: "3999.90",
        originalPrice: "4499.90",
        itemId: "MLB100000001",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000001",
        title: "Smart TV 55",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000001-smart-tv-55-_JM",
        price: 4499.9,
        originalPrice: 4499.9,
        pictures: [baseImage],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000001",
        currentPrice: 3999.9,
        originalPrice: 4499.9,
      }),
      descriptionResponse: { plain_text: "Descricao da smart TV." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("traditional-tracking", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB100000002-camera-ip-_JM?matt_tool=18956390&matt_word=MLB100000002",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB100000002-camera-ip-_JM?matt_tool=18956390&matt_word=MLB100000002",
      html: buildHtml({
        title: "Camera IP",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB100000002-camera-ip-_JM",
        imageUrl: `${baseImage}?2`,
        price: "299.90",
        originalPrice: "349.90",
        itemId: "MLB100000002",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000002",
        title: "Camera IP",
        permalink: "https://produto.mercadolivre.com.br/MLB100000002-camera-ip-_JM",
        price: 349.9,
        originalPrice: 349.9,
        pictures: [`${baseImage}?2`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000002",
        currentPrice: 299.9,
        originalPrice: 349.9,
      }),
      descriptionResponse: { plain_text: "Descricao da camera." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("short-url-item", {
    fixture: {
      originalUrl: "https://meli.la/abc123",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000003-notebook-ultra-_JM",
      html: buildHtml({
        title: "Notebook Ultra",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000003-notebook-ultra-_JM",
        imageUrl: `${baseImage}?3`,
        price: "5200.00",
        originalPrice: "5700.00",
        itemId: "MLB100000003",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000003",
        title: "Notebook Ultra",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000003-notebook-ultra-_JM",
        price: 5700,
        originalPrice: 5700,
        pictures: [`${baseImage}?3`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000003",
        currentPrice: 5200,
        originalPrice: 5700,
      }),
      descriptionResponse: { plain_text: "Descricao do notebook." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("catalog-script-item", {
    fixture: {
      originalUrl: "https://www.mercadolivre.com.br/p/MLB200000001?pdp_filters=item_id:MLB100000004",
      resolvedUrl: "https://www.mercadolivre.com.br/p/MLB200000001?pdp_filters=item_id:MLB100000004",
      html: buildHtml({
        title: "Geladeira Frost Free",
        canonicalUrl: "https://www.mercadolivre.com.br/p/MLB200000001",
        imageUrl: `${baseImage}?4`,
        price: "2899.00",
        originalPrice: "3199.00",
        itemId: "MLB100000004",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000004",
        title: "Geladeira Frost Free",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000004-geladeira-frost-free-_JM",
        price: 3199,
        originalPrice: 3199,
        pictures: [`${baseImage}?4`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000004",
        currentPrice: 2899,
        originalPrice: 3199,
      }),
      descriptionResponse: { plain_text: "Descricao da geladeira." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_catalog_product_detected" },
  }),
  createEntry("catalog-structured-only", {
    fixture: {
      originalUrl: "https://www.mercadolivre.com.br/p/MLB200000002",
      resolvedUrl: "https://www.mercadolivre.com.br/p/MLB200000002",
      html: buildHtml({
        title: "Cafeteira Premium",
        canonicalUrl: "https://www.mercadolivre.com.br/p/MLB200000002",
        imageUrl: `${baseImage}?5`,
        price: "499.00",
        originalPrice: "529.00",
        itemId: null,
        includeLdJson: true,
      }),
      itemResponse: null,
      pricesResponse: null,
      descriptionResponse: null,
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_item_id_not_found" },
  }),
  createEntry("user-product-script-item", {
    fixture: {
      originalUrl: "https://www.mercadolivre.com.br/up/MLBU300000001",
      resolvedUrl: "https://www.mercadolivre.com.br/up/MLBU300000001",
      html: buildHtml({
        title: "Mesa Gamer",
        canonicalUrl: "https://www.mercadolivre.com.br/up/MLBU300000001",
        imageUrl: `${baseImage}?6`,
        price: "799.00",
        originalPrice: "899.00",
        itemId: "MLB100000006",
        userProductId: "MLBU300000001",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000006",
        title: "Mesa Gamer",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000006-mesa-gamer-_JM",
        price: 899,
        originalPrice: 899,
        pictures: [`${baseImage}?6`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000006",
        currentPrice: 799,
        originalPrice: 899,
      }),
      descriptionResponse: { plain_text: "Descricao da mesa gamer." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_user_product_detected" },
  }),
  createEntry("user-product-structured-only", {
    fixture: {
      originalUrl: "https://www.mercadolivre.com.br/up/MLBU300000002?tracking_id=1",
      resolvedUrl: "https://www.mercadolivre.com.br/up/MLBU300000002?tracking_id=1",
      html: buildHtml({
        title: "Headset sem fio",
        canonicalUrl: "https://www.mercadolivre.com.br/up/MLBU300000002",
        imageUrl: `${baseImage}?7`,
        price: "650.00",
        originalPrice: "699.00",
        itemId: null,
        userProductId: "MLBU300000002",
      }),
      itemResponse: null,
      pricesResponse: null,
      descriptionResponse: null,
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_item_id_not_found" },
  }),
  createEntry("variation-query-price-api", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000008-cadeira-escritorio-_JM?variation=2001",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000008-cadeira-escritorio-_JM?variation=2001",
      html: buildHtml({
        title: "Cadeira Escritorio",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000008-cadeira-escritorio-_JM",
        imageUrl: `${baseImage}?8`,
        price: "1199.00",
        originalPrice: "1399.00",
        itemId: "MLB100000008",
        variationId: "2001",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000008",
        title: "Cadeira Escritorio",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000008-cadeira-escritorio-_JM",
        price: 1399,
        originalPrice: 1399,
        pictures: [`${baseImage}?8`],
        variations: [
          {
            id: 2001,
            price: 1299,
            original_price: 1399,
            available_quantity: 7,
            picture_ids: ["PIC-1"],
            attribute_combinations: [{ name: "Cor", value_name: "Preta" }],
          },
        ],
      }),
      pricesResponse: {
        id: "MLB100000008",
        prices: [
          {
            id: "promo-var",
            type: "promotion",
            amount: 1199,
            regular_amount: 1399,
            currency_id: "BRL",
            conditions: {
              context_restrictions: ["variation:2001"],
            },
          },
        ],
      },
      descriptionResponse: { plain_text: "Descricao da cadeira." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("variation-script-only", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000009-camiseta-esportiva-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000009-camiseta-esportiva-_JM",
      html: buildHtml({
        title: "Camiseta Esportiva",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000009-camiseta-esportiva-_JM",
        imageUrl: `${baseImage}?9`,
        price: "99.00",
        originalPrice: "129.00",
        itemId: "MLB100000009",
        variationId: "3001",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000009",
        title: "Camiseta Esportiva",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000009-camiseta-esportiva-_JM",
        price: 129,
        originalPrice: 129,
        pictures: [`${baseImage}?9`],
        variations: [
          {
            id: 3001,
            price: 109,
            original_price: 129,
            available_quantity: 4,
            picture_ids: ["PIC-1"],
            attribute_combinations: [{ name: "Tamanho", value_name: "M" }],
          },
        ],
      }),
      pricesResponse: null,
      descriptionResponse: { plain_text: "Descricao da camiseta." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("variation-not-found", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000010-tenis-corrida-_JM?variation=9999",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000010-tenis-corrida-_JM?variation=9999",
      html: buildHtml({
        title: "Tenis Corrida",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000010-tenis-corrida-_JM",
        imageUrl: `${baseImage}?10`,
        price: "359.00",
        originalPrice: "399.00",
        itemId: "MLB100000010",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000010",
        title: "Tenis Corrida",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000010-tenis-corrida-_JM",
        price: 399,
        originalPrice: 399,
        pictures: [`${baseImage}?10`],
        variations: [],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000010",
        currentPrice: 359,
        originalPrice: 399,
      }),
      descriptionResponse: { plain_text: "Descricao do tenis." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_variation_not_found" },
  }),
  createEntry("unavailable-item", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000011-aspirador-robô-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000011-aspirador-robô-_JM",
      html: buildHtml({
        title: "Aspirador Robo",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000011-aspirador-robo-_JM",
        imageUrl: `${baseImage}?11`,
        price: "899.00",
        originalPrice: "999.00",
        itemId: "MLB100000011",
        availability: "out_of_stock",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000011",
        title: "Aspirador Robo",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000011-aspirador-robo-_JM",
        price: 999,
        originalPrice: 999,
        availableQuantity: 0,
        pictures: [`${baseImage}?11`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000011",
        currentPrice: 899,
        originalPrice: 999,
      }),
      descriptionResponse: { plain_text: "Descricao do aspirador." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("promotion-price-api", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000012-frigobar-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000012-frigobar-_JM",
      html: buildHtml({
        title: "Frigobar",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000012-frigobar-_JM",
        imageUrl: `${baseImage}?12`,
        price: "1099.00",
        originalPrice: "1399.00",
        itemId: "MLB100000012",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000012",
        title: "Frigobar",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000012-frigobar-_JM",
        price: 1399,
        originalPrice: 1399,
        pictures: [`${baseImage}?12`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000012",
        currentPrice: 1099,
        originalPrice: 1399,
      }),
      descriptionResponse: { plain_text: "Descricao do frigobar." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("legacy-price-fallback", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000013-monitor-27-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000013-monitor-27-_JM",
      html: buildHtml({
        title: "Monitor 27",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000013-monitor-27-_JM",
        imageUrl: `${baseImage}?13`,
        price: null,
        originalPrice: null,
        itemId: "MLB100000013",
        includeLdJson: false,
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000013",
        title: "Monitor 27",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000013-monitor-27-_JM",
        price: 1799,
        originalPrice: 1999,
        pictures: [`${baseImage}?13`],
      }),
      pricesResponse: null,
      descriptionResponse: { plain_text: "Descricao do monitor." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_price_api_failed" },
  }),
  createEntry("structured-price-fallback", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000014-fone-bluetooth-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000014-fone-bluetooth-_JM",
      html: buildHtml({
        title: "Fone Bluetooth",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000014-fone-bluetooth-_JM",
        imageUrl: `${baseImage}?14`,
        price: "249.90",
        originalPrice: "279.90",
        itemId: "MLB100000014",
      }),
      itemResponse: null,
      pricesResponse: null,
      descriptionResponse: null,
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_item_api_failed" },
  }),
  createEntry("missing-price", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000015-bookbox-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000015-bookbox-_JM",
      html: buildHtml({
        title: "Book Box",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000015-bookbox-_JM",
        imageUrl: `${baseImage}?15`,
        price: null,
        originalPrice: null,
        itemId: "MLB100000015",
        includeLdJson: false,
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000015",
        title: "Book Box",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000015-bookbox-_JM",
        price: null,
        originalPrice: null,
        pictures: [`${baseImage}?15`],
      }),
      pricesResponse: null,
      descriptionResponse: { plain_text: "Descricao do box." },
    },
    expectations: { recognized: true, title: true, image: true, price: false, provider: "mercado_livre", warning: "meli_price_not_found" },
  }),
  createEntry("description-failed", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000016-luminaria-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000016-luminaria-_JM",
      html: buildHtml({
        title: "Luminaria",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000016-luminaria-_JM",
        imageUrl: `${baseImage}?16`,
        price: "189.90",
        originalPrice: "229.90",
        itemId: "MLB100000016",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000016",
        title: "Luminaria",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000016-luminaria-_JM",
        price: 229.9,
        originalPrice: 229.9,
        pictures: [`${baseImage}?16`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000016",
        currentPrice: 189.9,
        originalPrice: 229.9,
      }),
      descriptionResponse: new Error("description unavailable"),
      delays: { description: 450 },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_description_failed" },
  }),
  createEntry("canonical-item-id", {
    fixture: {
      originalUrl: "https://mercadolivre.com.br/oferta-especial",
      resolvedUrl: "https://mercadolivre.com.br/oferta-especial",
      html: buildHtml({
        title: "Oferta Especial",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000017-oferta-especial-_JM",
        imageUrl: `${baseImage}?17`,
        price: "79.90",
        originalPrice: "99.90",
        itemId: null,
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000017",
        title: "Oferta Especial",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000017-oferta-especial-_JM",
        price: 99.9,
        originalPrice: 99.9,
        pictures: [`${baseImage}?17`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000017",
        currentPrice: 79.9,
        originalPrice: 99.9,
      }),
      descriptionResponse: { plain_text: "Descricao da oferta." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("query-item-id", {
    fixture: {
      originalUrl: "https://lista.mercadolivre.com.br/teclado-mecanico?item_id=MLB100000018",
      resolvedUrl: "https://lista.mercadolivre.com.br/teclado-mecanico?item_id=MLB100000018",
      html: buildHtml({
        title: "Teclado Mecanico",
        canonicalUrl: "https://lista.mercadolivre.com.br/teclado-mecanico?item_id=MLB100000018",
        imageUrl: `${baseImage}?18`,
        price: "420.00",
        originalPrice: "450.00",
        itemId: "MLB100000018",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000018",
        title: "Teclado Mecanico",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000018-teclado-mecanico-_JM",
        price: 450,
        originalPrice: 450,
        pictures: [`${baseImage}?18`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000018",
        currentPrice: 420,
        originalPrice: 450,
      }),
      descriptionResponse: { plain_text: "Descricao do teclado." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("catalog-tracking-params", {
    fixture: {
      originalUrl: "https://www.mercadolivre.com.br/p/MLB200000019?searchVariation=red&utm_source=app",
      resolvedUrl: "https://www.mercadolivre.com.br/p/MLB200000019?searchVariation=red&utm_source=app",
      html: buildHtml({
        title: "Mochila Urbana",
        canonicalUrl: "https://www.mercadolivre.com.br/p/MLB200000019",
        imageUrl: `${baseImage}?19`,
        price: "219.00",
        originalPrice: "259.00",
        itemId: "MLB100000019",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000019",
        title: "Mochila Urbana",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000019-mochila-urbana-_JM",
        price: 259,
        originalPrice: 259,
        pictures: [`${baseImage}?19`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000019",
        currentPrice: 219,
        originalPrice: 259,
      }),
      descriptionResponse: { plain_text: "Descricao da mochila." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_catalog_product_detected" },
  }),
  createEntry("short-url-catalog", {
    fixture: {
      originalUrl: "https://meli.la/abc999",
      resolvedUrl: "https://www.mercadolivre.com.br/p/MLB200000020",
      html: buildHtml({
        title: "Air Fryer",
        canonicalUrl: "https://www.mercadolivre.com.br/p/MLB200000020",
        imageUrl: `${baseImage}?20`,
        price: "499.00",
        originalPrice: "579.00",
        itemId: "MLB100000020",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000020",
        title: "Air Fryer",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000020-air-fryer-_JM",
        price: 579,
        originalPrice: 579,
        pictures: [`${baseImage}?20`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000020",
        currentPrice: 499,
        originalPrice: 579,
      }),
      descriptionResponse: { plain_text: "Descricao da air fryer." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre", warning: "meli_catalog_product_detected" },
  }),
  createEntry("variation-from-attribute-combination", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000021-copo-termico-_JM?variation=azul",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000021-copo-termico-_JM?variation=azul",
      html: buildHtml({
        title: "Copo Termico",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000021-copo-termico-_JM",
        imageUrl: `${baseImage}?21`,
        price: "89.90",
        originalPrice: "99.90",
        itemId: "MLB100000021",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000021",
        title: "Copo Termico",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000021-copo-termico-_JM",
        price: 99.9,
        originalPrice: 99.9,
        pictures: [`${baseImage}?21`],
        variations: [
          {
            id: 4100,
            price: 89.9,
            original_price: 99.9,
            available_quantity: 12,
            picture_ids: ["PIC-1"],
            attribute_combinations: [{ id: "cor", value_id: "azul", name: "Cor", value_name: "Azul" }],
          },
        ],
      }),
      pricesResponse: null,
      descriptionResponse: { plain_text: "Descricao do copo." },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
  createEntry("no-description", {
    fixture: {
      originalUrl: "https://produto.mercadolivre.com.br/MLB-100000022-chaleira-_JM",
      resolvedUrl: "https://produto.mercadolivre.com.br/MLB-100000022-chaleira-_JM",
      html: buildHtml({
        title: "Chaleira",
        canonicalUrl: "https://produto.mercadolivre.com.br/MLB-100000022-chaleira-_JM",
        imageUrl: `${baseImage}?22`,
        price: "159.90",
        originalPrice: "189.90",
        itemId: "MLB100000022",
      }),
      itemResponse: buildItemResponse({
        itemId: "MLB100000022",
        title: "Chaleira",
        permalink: "https://produto.mercadolivre.com.br/MLB-100000022-chaleira-_JM",
        price: 189.9,
        originalPrice: 189.9,
        pictures: [`${baseImage}?22`],
      }),
      pricesResponse: buildPricesResponse({
        itemId: "MLB100000022",
        currentPrice: 159.9,
        originalPrice: 189.9,
      }),
      descriptionResponse: { plain_text: "" },
    },
    expectations: { recognized: true, title: true, image: true, price: true, provider: "mercado_livre" },
  }),
];

