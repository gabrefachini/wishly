import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseEnv } from "./env";

export const supabase = hasSupabaseEnv
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
