export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined,
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined,
  affiliateDisclosureEnabled:
    String(import.meta.env.VITE_AFFILIATE_DISCLOSURE_ENABLED ?? "true") !== "false",
  adminEmails: String(
    import.meta.env.VITE_ADMIN_EMAILS ||
      import.meta.env.NEXT_PUBLIC_ADMIN_EMAILS ||
      "gabriel.fachini@icloud.com",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey);
