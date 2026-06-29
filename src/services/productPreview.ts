import { env, hasSupabaseEnv, isDemoMode } from "../lib/env";
import { normalizeProductUrl, type ProductPreviewResult } from "../lib/productPreview";
import { previewDemoProductUrl } from "../data/demoState";

export async function fetchProductPreview(sourceUrl: string, signal?: AbortSignal): Promise<ProductPreviewResult> {
  const normalizedUrl = normalizeProductUrl(sourceUrl);
  if (!normalizedUrl) {
    throw new Error("invalid_product_url");
  }

  if (isDemoMode) {
    return previewDemoProductUrl(normalizedUrl);
  }

  if (!hasSupabaseEnv) {
    throw new Error("product_preview_unavailable");
  }

  const endpoint = new URL("/functions/v1/product-preview", env.supabaseUrl!).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabaseAnonKey!,
      Authorization: `Bearer ${env.supabaseAnonKey!}`,
    },
    body: JSON.stringify({ url: normalizedUrl }),
  });

  if (!response.ok) {
    const fallbackMessage = response.status === 404 ? "product_preview_unavailable" : "product_preview_failed";
    let message = fallbackMessage;
    try {
      const payload = (await response.json()) as { error?: string; message?: string } | undefined;
      message = payload?.error || payload?.message || fallbackMessage;
    } catch {
      const text = await response.text().catch(() => "");
      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  const data = (await response.json()) as ProductPreviewResult;
  return data;
}
