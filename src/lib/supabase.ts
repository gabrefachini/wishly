import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseEnv, isDemoMode } from "./env";

export const supabase = hasSupabaseEnv && !isDemoMode
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
