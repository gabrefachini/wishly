import assert from "node:assert/strict";
import test from "node:test";
import {
  addManualImageUrl,
  mergeAutofillProductImages,
  moveProductImage,
  removeProductImage,
  selectPrimaryProductImage,
} from "./product-images.ts";

const now = "2026-07-29T00:00:00.000Z";
const image = (id, url, source, isPrimary = false) => ({ id, url, source, isPrimary, createdAt: now });

test("upload manual continua principal quando Auto Fill adiciona imagens", () => {
  const current = [image("u", "blob:upload", "user_upload", true)];
  const result = mergeAutofillProductImages({
    current,
    urls: ["https://loja/1.webp", "https://loja/2.webp"],
    source: "marketplace",
  });
  assert.equal(result.length, 3);
  assert.equal(result.find((entry) => entry.isPrimary)?.id, "u");
});

test("primeira imagem automática vira principal somente numa galeria vazia", () => {
  const result = mergeAutofillProductImages({
    current: [],
    urls: ["https://loja/1.webp", "https://loja/2.webp"],
    source: "store",
  });
  assert.equal(result[0].isPrimary, true);
  assert.equal(result[1].isPrimary, false);
});

test("imagem removida pelo usuário não reaparece numa sincronização", () => {
  const result = mergeAutofillProductImages({
    current: [],
    urls: ["https://loja/removida.webp", "https://loja/nova.webp"],
    source: "html",
    removedUrls: ["https://loja/removida.webp"],
  });
  assert.deepEqual(result.map((entry) => entry.url), ["https://loja/nova.webp"]);
});

test("URL manual assume a principal sem apagar imagens extraídas", () => {
  const result = addManualImageUrl(
    [image("a", "https://loja/1.webp", "marketplace", true)],
    "https://cdn/minha.webp",
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].source, "image_url");
  assert.equal(result[0].isPrimary, true);
  assert.equal(result[1].isPrimary, false);
});

test("selecionar, remover e reordenar preserva uma única principal", () => {
  let result = [
    image("a", "https://loja/a.webp", "store", true),
    image("b", "https://loja/b.webp", "store"),
  ];
  result = selectPrimaryProductImage(result, "b");
  result = moveProductImage(result, "b", -1);
  assert.equal(result[0].id, "b");
  result = removeProductImage(result, "b");
  assert.equal(result[0].id, "a");
  assert.equal(result[0].isPrimary, true);
});
