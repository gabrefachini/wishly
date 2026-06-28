import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";

const WISHLIST_MEDIA_BUCKET = "wishlist-media";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

function normalizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateImageFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const hasAllowedMime = file.type ? ALLOWED_IMAGE_TYPES.includes(file.type) : false;
  const hasAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);

  if (!hasAllowedMime && !hasAllowedExtension) {
    throw new Error("invalid_image_type");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("image_too_large");
  }
}

export async function uploadWishlistCover(file: File, authUserId: string) {
  if (!supabase) {
    invariantSupabase();
  }

  const client = supabase!;

  validateImageFile(file);

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = normalizeFileName(file.name.replace(/\.[^.]+$/, "")) || "cover";
  const path = `${authUserId}/wishlist-covers/${Date.now()}-${baseName}.${extension}`;

  const { error } = await client.storage.from(WISHLIST_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    if (
      normalizedMessage.includes("bucket not found") ||
      normalizedMessage.includes("not found")
    ) {
      throw new Error("storage_bucket_not_found");
    }

    if (
      normalizedMessage.includes("row-level security") ||
      normalizedMessage.includes("permission") ||
      normalizedMessage.includes("unauthorized")
    ) {
      throw new Error("storage_permission_denied");
    }

    throw error;
  }

  const { data } = client.storage.from(WISHLIST_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
