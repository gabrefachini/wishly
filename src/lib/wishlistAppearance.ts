export const WISHLIST_THEME_OPTIONS = [
  { value: "coral", color: "#E07A5F", soft: "#F7DDD5" },
  { value: "blush", color: "#D98695", soft: "#F8E2E7" },
  { value: "terracotta", color: "#C96B4A", soft: "#F3D8CF" },
  { value: "lavender", color: "#9C8ACF", soft: "#ECE7F9" },
  { value: "sky", color: "#6FA7D6", soft: "#E1EEF8" },
  { value: "sage", color: "#7BA38A", soft: "#E4EFE8" },
] as const;

export const RESERVED_WISHLIST_SLUGS = new Set([
  "admin",
  "login",
  "signup",
  "api",
  "create",
  "lists",
  "gift",
  "gifts",
  "w",
  "go",
  "settings",
  "profile",
]);

export type WishlistThemeValue = (typeof WISHLIST_THEME_OPTIONS)[number]["value"];

export function getThemeOption(value: string | null | undefined) {
  return WISHLIST_THEME_OPTIONS.find((option) => option.value === value) ?? WISHLIST_THEME_OPTIONS[0];
}

export function normalizeWishlistSlug(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized;
}

export function buildWishlistSlugCandidate(value: string, fallback = "wishlist") {
  return normalizeWishlistSlug(value) || fallback;
}

export function isWishlistSlugReserved(slug: string) {
  return RESERVED_WISHLIST_SLUGS.has(slug);
}

export function isWishlistSlugFormatValid(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 80;
}

export function buildPublicWishlistPath(input: { slug?: string | null; shareId: string }) {
  if (input.slug) {
    return `/wish/${input.slug}`;
  }

  return `/w/${input.shareId}`;
}
