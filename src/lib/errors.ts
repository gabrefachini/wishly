import { normalizeErrorMessage } from "./http";

function includesOneOf(value: string, fragments: string[]) {
  return fragments.some((fragment) => value.includes(fragment));
}

export function getCreateWishlistErrorMessage(error: unknown, t: (key: string) => string) {
  const message = normalizeErrorMessage(error).toLowerCase();

  if (includesOneOf(message, ["duplicate key value", "wishlists_share_id_key", "share_id"])) {
    return t("create.errors.retry");
  }

  if (includesOneOf(message, ["row-level security", "permission denied", "violates row-level security policy"])) {
    return t("create.errors.permission");
  }

  if (includesOneOf(message, ["foreign key", "owner_id", "profiles"])) {
    return t("create.errors.profile");
  }

  if (includesOneOf(message, ["invalid input syntax for type date", "date/time field value out of range"])) {
    return t("create.errors.eventDate");
  }

  if (includesOneOf(message, ["violates check constraint", "visibility"])) {
    return t("create.errors.visibility");
  }

  if (includesOneOf(message, ["not authenticated", "jwt", "auth session missing"])) {
    return t("create.errors.auth");
  }

  return t("create.errors.generic");
}
