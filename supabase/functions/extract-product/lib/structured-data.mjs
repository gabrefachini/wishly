/**
 * Extração de dado estruturado compartilhada por todas as lojas.
 *
 * Fica em .mjs para os testes de Node importarem direto, como já é feito com
 * mercado-livre.mjs. O provider genérico em index.ts consome estas funções.
 */

const HTML_ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(value) {
  if (!value) return value;
  return String(value)
    .replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (match) => HTML_ENTITIES[match] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Nome da loja derivado do host, para reconhecer o sufixo no título.
 * "www.tokstok.com.br" → "tokstok"
 */
function getStoreToken(hostname) {
  if (!hostname) return null;
  const parts = String(hostname).toLowerCase().replace(/^www\./, "").split(".");
  return parts[0] || null;
}

/**
 * Remove o nome da loja colado no fim do título.
 *
 * Lojas publicam "Produto X | Americanas" ou "Produto X - Kabum" no JSON-LD e no
 * OpenGraph. Guardar isso deixa o título da lista poluído e atrapalha a busca.
 * Só remove quando o trecho final realmente corresponde ao domínio, para não
 * cortar parte do nome do produto.
 */
export function cleanProductTitle(title, hostname) {
  if (!title) return null;

  let cleaned = decodeHtmlEntities(String(title)).replace(/\s+/g, " ").trim();
  const storeToken = getStoreToken(hostname);
  if (!storeToken) return cleaned || null;

  // Compara ignorando acento, caixa e não-alfanuméricos ("Tok&Stok" vs "tokstok").
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const normalizedStore = normalize(storeToken);
  if (!normalizedStore) return cleaned || null;

  // Corta separadores comuns repetidamente: "X | Loja - Loja" → "X".
  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/^(.*\S)\s*[|:\u2013\u2014-]\s*([^|:\u2013\u2014-]+)$/);
    if (!match) break;
    const tail = normalize(match[2]);
    if (!tail) break;
    // Só corta se a cauda for a loja (ou contiver o nome dela, tipo "Loja Online").
    if (tail === normalizedStore || (tail.length <= normalizedStore.length + 8 && tail.includes(normalizedStore))) {
      cleaned = match[1].trim();
      continue;
    }
    break;
  }

  return cleaned || null;
}

function typeList(node) {
  const raw = node?.["@type"];
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((value) => String(value).toLowerCase());
}

export function isProductNode(node) {
  return typeList(node).some((type) => type.includes("product"));
}

/**
 * Escolhe o nó Product certo quando a página traz vários.
 *
 * Páginas de produto costumam listar relacionados, então pegar o primeiro nó
 * pode trazer o item errado. Preferimos o que aponta para a URL pedida.
 */
export function pickProductNode(nodes, requestedUrl) {
  const products = (nodes ?? []).filter((node) => isProductNode(node));
  if (products.length === 0) return null;
  if (products.length === 1 || !requestedUrl) return products[0];

  const target = String(requestedUrl).toLowerCase();
  const lastSegment = target.split("?")[0].replace(/\/+$/, "").split("/").pop() ?? "";

  const scored = products.map((node) => {
    const candidates = [node.url, node["@id"], node.sku, node.mpn, node.productID]
      .filter((value) => typeof value === "string")
      .map((value) => value.toLowerCase());

    let score = 0;
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (target.includes(candidate) || candidate.includes(target)) score += 3;
      else if (lastSegment && (candidate.includes(lastSegment) || lastSegment.includes(candidate))) score += 2;
    }
    // Nó mais completo desempata.
    if (node.offers) score += 1;
    if (node.image) score += 1;
    return { node, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0].node;
}

function firstOffer(offers) {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  return list.find((offer) => offer && typeof offer === "object") ?? null;
}

/**
 * Preço a partir de `offers`, cobrindo as formas que as lojas usam.
 *
 * Devolve os valores crus; a conversão para centavos fica com quem chama, que já
 * tem o parser de moeda pt-BR.
 */
export function extractOfferPrices(offers) {
  const offer = firstOffer(offers);
  if (!offer) return { price: null, originalPrice: null, currency: null, availability: null };

  const spec = offer.priceSpecification && typeof offer.priceSpecification === "object"
    ? (Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification)
    : null;

  const price =
    firstDefined(offer.price, offer.lowPrice, spec?.price, spec?.minPrice) ?? null;
  const originalPrice = firstDefined(offer.highPrice, spec?.maxPrice) ?? null;

  return {
    price,
    originalPrice,
    currency: typeof offer.priceCurrency === "string"
      ? offer.priceCurrency
      : (typeof spec?.priceCurrency === "string" ? spec.priceCurrency : null),
    availability: typeof offer.availability === "string" ? offer.availability : null,
  };
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}
