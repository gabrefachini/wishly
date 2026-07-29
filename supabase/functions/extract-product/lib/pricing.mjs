const MONEY_PATTERN = String.raw`R\$\s*([\d.]+(?:,\d{1,2})?)`;

function parseBrazilianMoney(value) {
  if (!value) return null;
  const amount = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function cleanLabel(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 160) || null;
}

export function emptyPricing(source = "html", capturedAt = new Date().toISOString()) {
  return {
    currency: "BRL",
    cashPrice: null,
    cashPriceLabel: null,
    installment: null,
    currentPrice: null,
    previousPrice: null,
    priceFrom: null,
    priceTo: null,
    capturedAt,
    source,
  };
}

/**
 * Extrai somente valores explicitamente publicados pela loja.
 * Percentuais isolados ("5% no Pix") viram contexto do rótulo, nunca preço calculado.
 */
export function extractPricingFromHtml(html, capturedAt = new Date().toISOString()) {
  const pricing = emptyPricing("html", capturedAt);
  if (!html) return pricing;

  const text = String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  const cashMatch = new RegExp(
    `(${MONEY_PATTERN}\\s*(?:à vista|no pix|via pix|no boleto|via boleto))`,
    "i",
  ).exec(text);
  if (cashMatch) {
    pricing.cashPrice = parseBrazilianMoney(cashMatch[2]);
    pricing.cashPriceLabel = cleanLabel(cashMatch[1]);
  }

  const installmentMatch = new RegExp(
    String.raw`(\d{1,3})\s*x\s*(?:de\s*)?${MONEY_PATTERN}([^.;|]{0,45})`,
    "i",
  ).exec(text);
  if (installmentMatch) {
    const tail = cleanLabel(installmentMatch[3]) ?? "";
    const interestFree = /sem\s+juros/i.test(tail)
      ? true
      : /com\s+juros/i.test(tail)
        ? false
        : null;
    pricing.installment = {
      quantity: Number(installmentMatch[1]),
      amount: parseBrazilianMoney(installmentMatch[2]),
      total: null,
      interestFree,
      label: cleanLabel(installmentMatch[0]),
    };
  }

  const previousMarkup = String(html).match(
    new RegExp(String.raw`<(?:del|s)\b[^>]*>[^<]*${MONEY_PATTERN}[^<]*<\/(?:del|s)>`, "i"),
  );
  const previousText = new RegExp(
    String.raw`(?:de|antes|preço\s+(?:anterior|original))\s*:?\s*${MONEY_PATTERN}`,
    "i",
  ).exec(text);
  pricing.previousPrice = parseBrazilianMoney(previousMarkup?.[1] ?? previousText?.[1]);

  const rangeMatch = new RegExp(
    String.raw`(?:a partir de\s+)?${MONEY_PATTERN}\s*(?:a|até|-)\s*${MONEY_PATTERN}`,
    "i",
  ).exec(text);
  if (rangeMatch) {
    pricing.priceFrom = parseBrazilianMoney(rangeMatch[1]);
    pricing.priceTo = parseBrazilianMoney(rangeMatch[2]);
  }

  const currentText = String(html)
    .replace(/<(?:del|s)\b[^>]*>[\s\S]*?<\/(?:del|s)>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ");
  const currentMatches = [...currentText.matchAll(new RegExp(MONEY_PATTERN, "gi"))];
  const currentCandidate = currentMatches
    .map((match) => parseBrazilianMoney(match[1]))
    .find((value) => value != null && value !== pricing.previousPrice) ?? null;
  pricing.currentPrice =
    pricing.cashPrice ??
    (rangeMatch ? pricing.priceFrom : currentCandidate);

  return pricing;
}

export function mergePricing(primary, fallback) {
  if (!primary) return fallback;
  if (!fallback) return primary;
  return {
    ...fallback,
    ...primary,
    cashPrice: primary.cashPrice ?? fallback.cashPrice,
    cashPriceLabel: primary.cashPriceLabel ?? fallback.cashPriceLabel,
    installment: primary.installment ?? fallback.installment,
    currentPrice: primary.currentPrice ?? fallback.currentPrice,
    previousPrice: primary.previousPrice ?? fallback.previousPrice,
    priceFrom: primary.priceFrom ?? fallback.priceFrom,
    priceTo: primary.priceTo ?? fallback.priceTo,
  };
}
