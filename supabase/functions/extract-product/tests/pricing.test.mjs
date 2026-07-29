import assert from "node:assert/strict";
import test from "node:test";
import { extractPricingFromHtml } from "../lib/pricing.mjs";

test("extrai preço à vista e parcelamento sem inventar total", () => {
  const pricing = extractPricingFromHtml(`
    <main><strong>R$ 270,00 à vista</strong>
    <span>ou 10x de R$ 30,00 sem juros</span></main>
  `, "2026-07-29T12:00:00.000Z");
  assert.equal(pricing.cashPrice, 270);
  assert.equal(pricing.currentPrice, 270);
  assert.deepEqual(pricing.installment, {
    quantity: 10,
    amount: 30,
    total: null,
    interestFree: true,
    label: "10x de R$ 30,00 sem juros",
  });
});

test("extrai promoção e faixa de preço", () => {
  const promotion = extractPricingFromHtml("<del>R$ 999,00</del><b>R$ 899,00</b>");
  assert.equal(promotion.previousPrice, 999);
  assert.equal(promotion.currentPrice, 899);

  const textualPromotion = extractPricingFromHtml("<span>De R$ 999,00 por R$ 899,00</span>");
  assert.equal(textualPromotion.previousPrice, 999);
  assert.equal(textualPromotion.currentPrice, 899);

  const range = extractPricingFromHtml("<p>R$ 129,90 a R$ 189,90</p>");
  assert.equal(range.priceFrom, 129.9);
  assert.equal(range.priceTo, 189.9);
});

test("não calcula desconto Pix quando só existe percentual", () => {
  const pricing = extractPricingFromHtml("<p>R$ 300,00</p><span>5% no Pix</span>");
  assert.equal(pricing.currentPrice, 300);
  assert.equal(pricing.cashPrice, null);
});
