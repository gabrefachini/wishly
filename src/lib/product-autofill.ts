export type AutofillLifecycleStatus =
  | "not_requested"
  | "pending"
  | "success"
  | "partial"
  | "failed"
  | "timeout";

export type ExtractionInsertStatus = "pending" | "success" | "partial" | "failed";

export type AutofillDraft = {
  requestedUrl: string;
  canonicalUrl?: string | null;
  provider?: string | null;
  storeName?: string | null;
  sellerName?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  availability?: string | null;
  selectedVariant?: Array<{ name: string; value: string }>;
  imageUrl?: string | null;
  imageUrls?: string[];
  currentPriceInCents?: number | null;
  originalPriceInCents?: number | null;
  extractedAt?: string | null;
  confidence?: Record<string, unknown> | null;
  warnings?: string[];
  status?: AutofillLifecycleStatus | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

export type ProductExtractionInsertInput = {
  giftId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  estimatedPriceInCents?: number | null;
  currency?: string | null;
  autofill: AutofillDraft;
};

export const PRODUCT_PLACEHOLDER_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
      <rect width="240" height="180" rx="24" fill="#f3efe8"/>
      <rect x="54" y="38" width="132" height="104" rx="18" fill="#e7dfd3" stroke="#d8cdbc"/>
      <circle cx="92" cy="78" r="12" fill="#c1b29d"/>
      <path d="M74 122l28-28 18 18 22-24 24 34H74z" fill="#c1b29d"/>
    </svg>`,
  );

export function mapAutofillStatusToExtractionStatus(
  status: AutofillLifecycleStatus | null | undefined,
): ExtractionInsertStatus | null {
  switch (status) {
    case "success":
      return "success";
    case "partial":
      return "partial";
    case "pending":
      return "pending";
    case "failed":
    case "timeout":
      return "failed";
    default:
      return null;
  }
}

export function sanitizeJsonRecord(value: Record<string, unknown> | null | undefined) {
  return value && typeof value === "object" ? value : {};
}

export function buildProductExtractionInsert(input: ProductExtractionInsertInput) {
  const requestedUrl = input.autofill.requestedUrl.trim();
  const extractionStatus = mapAutofillStatusToExtractionStatus(input.autofill.status);

  if (!requestedUrl || !extractionStatus) {
    return null;
  }

  const normalizedPayload = {
    title: input.name.trim(),
    description: input.description?.trim() || null,
    image_url: input.imageUrl?.trim() || null,
    image_urls: input.autofill.imageUrls ?? [],
    currency: input.currency?.trim() || "BRL",
    estimated_price_in_cents: input.estimatedPriceInCents ?? null,
    canonical_url: input.autofill.canonicalUrl ?? null,
    provider: input.autofill.provider ?? null,
    store_name: input.autofill.storeName ?? null,
    seller_name: input.autofill.sellerName ?? null,
    external_product_id: input.autofill.externalProductId ?? null,
    external_variant_id: input.autofill.externalVariantId ?? null,
    availability: input.autofill.availability ?? "unknown",
    selected_variant: input.autofill.selectedVariant ?? [],
    current_price_in_cents: input.autofill.currentPriceInCents ?? null,
    original_price_in_cents: input.autofill.originalPriceInCents ?? null,
  };

  return {
    gift_id: input.giftId,
    requested_url: requestedUrl,
    canonical_url: input.autofill.canonicalUrl ?? null,
    provider: input.autofill.provider ?? null,
    raw_payload: sanitizeJsonRecord(input.autofill.rawPayload),
    normalized_payload: normalizedPayload,
    field_confidence: sanitizeJsonRecord(input.autofill.confidence ?? {}),
    extraction_status: extractionStatus,
    error_code: input.autofill.errorCode ?? null,
    error_message: input.autofill.errorMessage ?? null,
    extracted_at: input.autofill.extractedAt ?? new Date().toISOString(),
  };
}

export function buildWishSubmissionFingerprint(input: {
  wishlistId: string;
  requestedUrl: string;
  title: string;
  canonicalUrl?: string | null;
}) {
  return JSON.stringify({
    wishlistId: input.wishlistId,
    requestedUrl: input.requestedUrl.trim(),
    title: input.title.trim(),
    canonicalUrl: input.canonicalUrl?.trim() || "",
  });
}

export type WishSubmissionReadiness = {
  canSubmit: boolean;
  reason: string | null;
  manualConfirmationRequired: boolean;
};

export function getWishSubmissionReadiness(input: {
  title: string;
  productUrl: string;
  extractionStatus: "idle" | "loading" | "success" | "partial" | "error";
  extractedUrl: string | null;
  syncing: boolean;
}) : WishSubmissionReadiness {
  const productUrl = input.productUrl.trim();
  const title = input.title.trim();
  const hasUrl = productUrl.length > 0;
  const extractionPending =
    hasUrl &&
    (input.extractionStatus === "loading" ||
      input.extractedUrl !== productUrl ||
      input.extractionStatus === "idle");

  if (input.syncing) {
    return { canSubmit: false, reason: "Salvamento em andamento.", manualConfirmationRequired: false };
  }

  if (extractionPending) {
    return { canSubmit: false, reason: "Aguarde o preenchimento automatico terminar.", manualConfirmationRequired: false };
  }

  if (!title) {
    if (hasUrl && input.extractionStatus === "error") {
      return {
        canSubmit: false,
        reason: "Não conseguimos preencher os dados. Complete o nome e confirme a inclusão manual.",
        manualConfirmationRequired: true,
      };
    }

    return {
      canSubmit: false,
      reason: "Preencha o nome do desejo antes de salvar.",
      manualConfirmationRequired: hasUrl,
    };
  }

  return {
    canSubmit: true,
    reason: null,
    manualConfirmationRequired: hasUrl && input.extractionStatus === "error",
  };
}

export class WishSubmissionLock {
  private inFlight = false;
  private lastFingerprint: string | null = null;
  private lastCompletedAt = 0;

  start(fingerprint: string, now = Date.now()) {
    if (this.inFlight) return false;
    if (this.lastFingerprint === fingerprint && now - this.lastCompletedAt < 5_000) return false;
    this.inFlight = true;
    this.lastFingerprint = fingerprint;
    return true;
  }

  finish(success: boolean, now = Date.now()) {
    this.inFlight = false;
    this.lastCompletedAt = success ? now : 0;
    if (!success) {
      this.lastFingerprint = null;
    }
  }
}

export function getProductImageSrc(primaryImage: string | null | undefined, extraImages?: string[] | null) {
  return primaryImage?.trim() || extraImages?.find((entry) => entry.trim()) || null;
}
