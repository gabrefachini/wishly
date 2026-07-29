export type ProductImageSource =
  | "user_upload"
  | "image_url"
  | "marketplace"
  | "store"
  | "html"
  | "ai";

export type ProductImage = {
  id: string;
  url: string;
  source: ProductImageSource;
  isPrimary: boolean;
  width?: number;
  height?: number;
  createdAt: string;
  thumbnailUrl?: string;
};

export type ProductImageDraft = ProductImage & {
  file?: File;
  thumbnailFile?: File;
};

const MANUAL_SOURCES = new Set<ProductImageSource>(["user_upload", "image_url"]);
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function createImageDraft(input: {
  url: string;
  source: ProductImageSource;
  isPrimary?: boolean;
  width?: number;
  height?: number;
  file?: File;
  thumbnailFile?: File;
}): ProductImageDraft {
  return {
    id: crypto.randomUUID(),
    url: input.url,
    source: input.source,
    isPrimary: Boolean(input.isPrimary),
    width: input.width,
    height: input.height,
    createdAt: new Date().toISOString(),
    file: input.file,
    thumbnailFile: input.thumbnailFile,
  };
}

export function getPrimaryProductImage(images: ProductImage[]) {
  return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

export function selectPrimaryProductImage(images: ProductImageDraft[], imageId: string) {
  return images.map((image) => ({ ...image, isPrimary: image.id === imageId }));
}

export function removeProductImage(images: ProductImageDraft[], imageId: string) {
  const removed = images.find((image) => image.id === imageId);
  const remaining = images.filter((image) => image.id !== imageId);
  if (!removed?.isPrimary || remaining.length === 0) return remaining;

  const nextPrimary =
    remaining.find((image) => image.source === "user_upload") ??
    remaining.find((image) => MANUAL_SOURCES.has(image.source)) ??
    remaining[0];
  return remaining.map((image) => ({ ...image, isPrimary: image.id === nextPrimary.id }));
}

export function moveProductImage(images: ProductImageDraft[], imageId: string, direction: -1 | 1) {
  const index = images.findIndex((image) => image.id === imageId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return images;
  const next = [...images];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

/**
 * Acrescenta resultados do Auto Fill sem apagar decisões manuais.
 * URLs removidas ficam bloqueadas e uploads/URLs informados pela pessoa mantêm
 * a primazia. O primeiro resultado automático só vira principal quando ainda
 * não há nenhuma imagem.
 */
export function mergeAutofillProductImages(input: {
  current: ProductImageDraft[];
  urls: string[];
  source: Exclude<ProductImageSource, "user_upload" | "image_url" | "ai">;
  removedUrls?: string[];
}) {
  const removed = new Set((input.removedUrls ?? []).map(normalizeUrl));
  const known = new Set(input.current.map((image) => normalizeUrl(image.url)));
  const additions = input.urls
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url) => !removed.has(normalizeUrl(url)) && !known.has(normalizeUrl(url)))
    .map((url, index) => createImageDraft({
      url,
      source: input.source,
      isPrimary: input.current.length === 0 && index === 0,
    }));

  return [...input.current, ...additions];
}

export function addManualImageUrl(images: ProductImageDraft[], rawUrl: string) {
  const url = rawUrl.trim();
  if (!url) return images;
  const existing = images.find((image) => normalizeUrl(image.url) === normalizeUrl(url));
  if (existing) return selectPrimaryProductImage(images, existing.id);

  const draft = createImageDraft({ url, source: "image_url", isPrimary: true });
  return [draft, ...images.map((image) => ({ ...image, isPrimary: false }))];
}

export async function prepareUploadedProductImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Use imagens JPG, PNG, WebP ou HEIC.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Cada imagem deve ter no máximo 15 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      file.type === "image/heic" || file.type === "image/heif"
        ? "Este navegador não consegue abrir HEIC. Converta a foto para JPG ou WebP."
        : "Não foi possível ler esta imagem.",
    );
  }

  const full = await rasterize(bitmap, 1920, 0.84);
  const thumbnail = await rasterize(bitmap, 480, 0.78);
  bitmap.close();

  const baseName = (file.name.replace(/\.[^.]+$/, "") || "produto").slice(0, 80);
  const optimized = new File([full.blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
  const thumbnailFile = new File([thumbnail.blob], `${baseName}-thumb.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });

  return createImageDraft({
    url: URL.createObjectURL(optimized),
    source: "user_upload",
    isPrimary: true,
    width: full.width,
    height: full.height,
    file: optimized,
    thumbnailFile,
  });
}

async function rasterize(bitmap: ImageBitmap, maxDimension: number, quality: number) {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Não foi possível processar esta imagem.");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Falha ao comprimir a imagem."))),
      "image/webp",
      quality,
    );
  });
  return { blob, width, height };
}

function normalizeUrl(value: string) {
  return value.trim().replace(/#.*$/, "");
}
