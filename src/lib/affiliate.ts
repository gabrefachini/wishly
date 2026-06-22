export function extractMerchantDomain(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname || null;
  } catch {
    return null;
  }
}

export function buildGiftRedirectPath(giftId: string, shareId: string) {
  return `/go/gift/${giftId}?shareId=${encodeURIComponent(shareId)}`;
}

export function applyDeeplinkTemplate(template: string, originalUrl: string, tag: string) {
  return template
    .replaceAll("{url}", encodeURIComponent(originalUrl))
    .replaceAll("{tag}", encodeURIComponent(tag));
}

export function calculateFundingProgress(goal: number | null, received: number | null) {
  if (!goal || goal <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(((received ?? 0) / goal) * 100)));
}
