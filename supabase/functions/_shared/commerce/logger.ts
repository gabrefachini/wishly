type LogLevel = "info" | "warn" | "error";

export function logCommerceEvent(
  level: LogLevel,
  input: {
    operationId: string;
    stage: string;
    status: string;
    startedAt?: number;
    retailerSlug?: string | null;
    warning?: string | null;
    errorCode?: string | null;
    ids?: Record<string, string | null | undefined>;
  },
) {
  const payload = {
    event: "commerce_ingestion",
    operation_id: input.operationId,
    stage: input.stage,
    status: input.status,
    duration_ms: input.startedAt == null ? undefined : Date.now() - input.startedAt,
    retailer: input.retailerSlug ?? undefined,
    warning: input.warning ?? undefined,
    error_code: input.errorCode ?? undefined,
    ids: input.ids ?? undefined,
  };
  const message = JSON.stringify(payload);
  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.log(message);
}
