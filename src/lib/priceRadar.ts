import type {
  GiftPriceHistoryEntry,
  Locale,
  PriceRecommendationSeverity,
  PriceRecommendationStatus,
  PriceTrend,
} from "../types/domain";

type PriceRecommendationInput = {
  currentPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  lastPrice: number | null;
  priceHistory: GiftPriceHistoryEntry[] | null | undefined;
  targetPrice: number | null;
  currency?: string;
};

type PriceRecommendationResult = {
  status: PriceRecommendationStatus;
  score: number;
  title: string;
  message: string;
  severity: PriceRecommendationSeverity;
};

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatLocalizedPrice(value: number, locale: Locale, currency?: string) {
  return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency ?? (locale === "pt-BR" ? "BRL" : "USD"),
  }).format(value);
}

export function getPriceTrend(
  currentPrice: number | null,
  lastPrice: number | null,
  averagePrice: number | null,
  priceHistory: GiftPriceHistoryEntry[] | null | undefined,
): PriceTrend {
  if (currentPrice === null || !Number.isFinite(currentPrice)) {
    return "unknown";
  }

  if (lastPrice !== null && lastPrice > 0) {
    const delta = (currentPrice - lastPrice) / lastPrice;
    if (delta <= -0.03) return "down";
    if (delta >= 0.03) return "up";
  }

  if (averagePrice !== null && averagePrice > 0) {
    const delta = (currentPrice - averagePrice) / averagePrice;
    if (delta <= -0.03) return "down";
    if (delta >= 0.03) return "up";
  }

  if ((priceHistory?.length ?? 0) < 2) {
    return "unknown";
  }

  return "stable";
}

export function getPriceRecommendation(
  input: PriceRecommendationInput,
  locale: Locale = "en",
): PriceRecommendationResult {
  const {
    currentPrice,
    averagePrice,
    lowestPrice,
    highestPrice,
    lastPrice,
    priceHistory,
    targetPrice,
    currency,
  } = input;

  const historyPoints = priceHistory?.filter((entry) => Number.isFinite(entry.price)) ?? [];
  const hasHistory = historyPoints.length >= 2;

  if (currentPrice === null || !Number.isFinite(currentPrice)) {
    return {
      status: "no_data",
      score: 0,
      title: locale === "pt-BR" ? "Ainda estamos aprendendo o histórico" : "We are still learning the price history",
      message:
        locale === "pt-BR"
          ? "Adicione um preço atual para começar a acompanhar este desejo."
          : "Add a current price to start tracking this wish.",
      severity: "neutral",
    };
  }

  if (targetPrice !== null && currentPrice <= targetPrice) {
    return {
      status: "buy_now",
      score: roundScore(96 + Math.max(0, (targetPrice - currentPrice) / Math.max(targetPrice, 1) * 4)),
      title: locale === "pt-BR" ? "Boa hora para comprar" : "Good time to buy",
      message:
          locale === "pt-BR"
          ? `O preço atual está em ${formatLocalizedPrice(currentPrice, locale, currency)}, abaixo do seu alvo de ${formatLocalizedPrice(targetPrice, locale, currency)}.`
          : `The current price is ${formatLocalizedPrice(currentPrice, locale, currency)}, below your target of ${formatLocalizedPrice(targetPrice, locale, currency)}.`,
      severity: "positive",
    };
  }

  if (lowestPrice !== null && currentPrice <= lowestPrice * 1.03) {
    return {
      status: "buy_now",
      score: roundScore(94),
      title: locale === "pt-BR" ? "Boa hora para comprar" : "Good time to buy",
      message:
          locale === "pt-BR"
          ? `Este item está muito perto do menor preço recente de ${formatLocalizedPrice(lowestPrice, locale, currency)}.`
          : `This item is very close to the recent low of ${formatLocalizedPrice(lowestPrice, locale, currency)}.`,
      severity: "positive",
    };
  }

  if (averagePrice !== null && currentPrice < averagePrice * 0.9) {
    return {
      status: "good_price",
      score: roundScore(82),
      title: locale === "pt-BR" ? "Está abaixo da média recente" : "Below the recent average",
      message:
          locale === "pt-BR"
          ? `O preço atual está cerca de ${Math.abs(Math.round((1 - currentPrice / averagePrice) * 100))}% abaixo da média.`
          : `The current price is about ${Math.abs(Math.round((1 - currentPrice / averagePrice) * 100))}% below the average.`,
      severity: "positive",
    };
  }

  if (averagePrice !== null && currentPrice > averagePrice * 1.1) {
    return {
      status: "wait",
      score: roundScore(35),
      title: locale === "pt-BR" ? "Talvez valha esperar" : "It may be worth waiting",
      message:
          locale === "pt-BR"
          ? `O preço está acima da média recente de ${formatLocalizedPrice(averagePrice, locale, currency)}.`
          : `The price is above the recent average of ${formatLocalizedPrice(averagePrice, locale, currency)}.`,
      severity: "warning",
    };
  }

  if (highestPrice !== null && currentPrice >= highestPrice * 0.97) {
    return {
      status: "high_price",
      score: roundScore(22),
      title: locale === "pt-BR" ? "Preço acima do normal" : "Price is running high",
      message:
          locale === "pt-BR"
          ? `O item está muito perto do pico recente de ${formatLocalizedPrice(highestPrice, locale, currency)}.`
          : `The item is very close to the recent peak of ${formatLocalizedPrice(highestPrice, locale, currency)}.`,
      severity: "warning",
    };
  }

  if (hasHistory && lastPrice !== null && lastPrice > 0) {
    const delta = (currentPrice - lastPrice) / lastPrice;
    if (delta >= 0.08) {
      return {
        status: "wait",
        score: roundScore(30),
        title: locale === "pt-BR" ? "O preço subiu recentemente" : "The price recently went up",
      message:
        locale === "pt-BR"
          ? `Nos últimos registros, o preço subiu ${Math.round(delta * 100)}%.`
          : `Across the latest checks, the price increased by ${Math.round(delta * 100)}%.`,
        severity: "warning",
      };
    }
  }

  const baseline =
    averagePrice && averagePrice > 0
      ? 1 - Math.min(Math.max((currentPrice - averagePrice) / averagePrice, -0.5), 0.5)
      : 0.5;
  const derivedScore = roundScore(50 + baseline * 20);

  return {
    status: hasHistory ? "normal_price" : "no_data",
    score: derivedScore,
    title: locale === "pt-BR" ? "Preço normal" : "Normal price",
    message:
      locale === "pt-BR"
        ? `O preço atual é ${formatLocalizedPrice(currentPrice, locale, currency)} e está dentro do esperado.`
        : `The current price is ${formatLocalizedPrice(currentPrice, locale, currency)} and looks within range.`,
    severity: "neutral",
  };
}

export function getPriceRadarHistoryPoints(priceHistory: GiftPriceHistoryEntry[] | null | undefined) {
  return (priceHistory ?? [])
    .filter((entry) => Number.isFinite(entry.price))
    .slice()
    .sort((left, right) => left.checked_at.localeCompare(right.checked_at))
    .map((entry) => entry.price);
}
