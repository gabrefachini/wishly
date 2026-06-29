export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined,
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined,
  affiliateDisclosureEnabled:
    String(import.meta.env.VITE_AFFILIATE_DISCLOSURE_ENABLED ?? "true") !== "false",
  demoMode:
    String(import.meta.env.VITE_DEMO_MODE ?? import.meta.env.DEMO_MODE ?? "false") === "true",
};

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isDemoMode = env.demoMode;
