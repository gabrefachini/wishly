import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanProductTitle,
  decodeHtmlEntities,
  extractOfferPrices,
  isProductNode,
  pickProductNode,
} from "../lib/structured-data.mjs";

test("decodeHtmlEntities resolve entidades nomeadas e numéricas", () => {
  assert.equal(decodeHtmlEntities("Tok&amp;Stok"), "Tok&Stok");
  assert.equal(decodeHtmlEntities("Caf&#233;"), "Café");
  assert.equal(decodeHtmlEntities("a &lt; b &gt; c"), "a < b > c");
});

test("cleanProductTitle remove o nome da loja do fim do título", () => {
  // Títulos reais coletados das PDPs em 28/07/2026.
  assert.equal(
    cleanProductTitle("Brinquedo Educativo Super Toys Baby Patrulha | Americanas", "www.americanas.com.br"),
    "Brinquedo Educativo Super Toys Baby Patrulha",
  );
  assert.equal(
    cleanProductTitle("LIXEIRA COM PEDAL 12 L BOULEVARD KONKRET | Tok&amp;Stok", "www.tokstok.com.br"),
    "LIXEIRA COM PEDAL 12 L BOULEVARD KONKRET",
  );
  assert.equal(
    cleanProductTitle("Daily T-shirt Masculino Preto G | Amazon", "www.amazon.com.br"),
    "Daily T-shirt Masculino Preto G",
  );
});

test("cleanProductTitle preserva título que não termina com a loja", () => {
  // Kabum publica título limpo: não pode perder o sufixo do modelo.
  assert.equal(
    cleanProductTitle("Ventoinha Corsair QL Series, 120mm, RGB, Preto - CO-9050097", "www.kabum.com.br"),
    "Ventoinha Corsair QL Series, 120mm, RGB, Preto - CO-9050097",
  );
  // Nome de produto com hífen no fim não deve ser cortado.
  assert.equal(
    cleanProductTitle("Cristaleira Echad - Natural", "www.westwing.com.br"),
    "Cristaleira Echad - Natural",
  );
});

test("cleanProductTitle lida com ausência de host e título vazio", () => {
  assert.equal(cleanProductTitle("Produto X | Loja", null), "Produto X | Loja");
  assert.equal(cleanProductTitle("", "www.loja.com.br"), null);
  assert.equal(cleanProductTitle(null, "www.loja.com.br"), null);
});

test("isProductNode aceita @type string e array", () => {
  assert.equal(isProductNode({ "@type": "Product" }), true);
  assert.equal(isProductNode({ "@type": ["Thing", "Product"] }), true);
  assert.equal(isProductNode({ "@type": "ProductGroup" }), true);
  assert.equal(isProductNode({ "@type": "WebSite" }), false);
  assert.equal(isProductNode({ "@type": "ItemList" }), false);
  assert.equal(isProductNode({}), false);
});

test("pickProductNode escolhe o nó que aponta para a URL pedida", () => {
  const alvo = { "@type": "Product", name: "Alvo", url: "https://loja.com/p/abc-123", offers: { price: 10 } };
  const relacionado = { "@type": "Product", name: "Relacionado", url: "https://loja.com/p/xyz-999" };
  const escolhido = pickProductNode([relacionado, alvo], "https://loja.com/p/abc-123");
  assert.equal(escolhido.name, "Alvo");
});

test("pickProductNode devolve o primeiro quando não há como desempatar", () => {
  const nodes = [{ "@type": "Product", name: "A" }, { "@type": "Product", name: "B" }];
  assert.equal(pickProductNode(nodes, undefined).name, "A");
  assert.equal(pickProductNode([], "https://x"), null);
  assert.equal(pickProductNode(undefined, "https://x"), null);
});

test("extractOfferPrices cobre price, lowPrice e priceSpecification", () => {
  assert.equal(extractOfferPrices({ price: 69.99, priceCurrency: "BRL" }).price, 69.99);
  assert.equal(extractOfferPrices([{ lowPrice: 12, highPrice: 20 }]).price, 12);
  assert.equal(extractOfferPrices([{ lowPrice: 12, highPrice: 20 }]).originalPrice, 20);

  const comSpec = extractOfferPrices({ priceSpecification: { price: 199.9, priceCurrency: "BRL" } });
  assert.equal(comSpec.price, 199.9);
  assert.equal(comSpec.currency, "BRL");
});

test("extractOfferPrices não inventa preço quando offers vem sem valor", () => {
  // Caso real da Amazon: offers existe, price é null.
  const semPreco = extractOfferPrices({ "@type": "Offer", availability: "https://schema.org/InStock" });
  assert.equal(semPreco.price, null);
  assert.equal(semPreco.availability, "https://schema.org/InStock");
  assert.equal(extractOfferPrices(null).price, null);
  assert.equal(extractOfferPrices({ price: "" }).price, null);
});
