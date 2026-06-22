export function invariantSupabase() {
  throw new Error("supabase_not_configured");
}

export function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "unknown_error";
}
