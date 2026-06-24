export function getFriendlyAuthErrorMessage(
  error: unknown,
  translate: (key: string) => string,
) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return translate("auth.emailNotConfirmed");
  }

  if (normalized.includes("rate limit")) {
    return translate("auth.rateLimit");
  }

  if (normalized.includes("invalid") && normalized.includes("email")) {
    return translate("auth.invalidEmail");
  }

  return message;
}
