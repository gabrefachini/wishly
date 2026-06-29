import type { AuthChangeEvent, AuthResponse, Session } from "@supabase/supabase-js";
import { isDemoMode } from "../lib/env";
import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";
import type { Locale, Profile } from "../types/domain";
import { getDemoProfile, getDemoSession } from "../data/demoState";

export async function getSession() {
  if (isDemoMode) {
    return getDemoSession() as unknown as Session;
  }

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResponse> {
  if (isDemoMode) {
    const session = getDemoSession() as unknown as Session;
    return {
      data: {
        session,
        user: session.user,
      },
      error: null,
    } as AuthResponse;
  }

  if (!supabase) {
    invariantSupabase();
  }

  return supabase!.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(
  name: string,
  email: string,
  password: string,
  locale: Locale,
): Promise<AuthResponse> {
  if (isDemoMode) {
    const session = getDemoSession() as unknown as Session;
    return {
      data: {
        session,
        user: session.user,
      },
      error: null,
    } as AuthResponse;
  }

  if (!supabase) {
    invariantSupabase();
  }

  return supabase!.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        locale,
      },
    },
  });
}

export async function resendSignupConfirmation(email: string) {
  if (isDemoMode) {
    return { data: {}, error: null } as unknown as AuthResponse;
  }

  if (!supabase) {
    invariantSupabase();
  }

  return supabase!.auth.resend({
    type: "signup",
    email,
  });
}

export async function signOut() {
  if (isDemoMode) {
    return;
  }

  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  if (isDemoMode) {
    return { data: {}, error: null } as unknown as AuthResponse;
  }

  if (!supabase) {
    invariantSupabase();
  }

  return supabase!.auth.resetPasswordForEmail(email);
}

export async function getProfileBySession(session: Session | null): Promise<Profile | null> {
  if (isDemoMode) {
    return session?.user ? getDemoProfile() : null;
  }

  if (!supabase || !session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .maybeSingle<Profile>();

  if (error) {
    throw error;
  }

  return data;
}

export async function ensureProfile(
  session: Session | null,
  localeFallback: Locale = "en",
): Promise<Profile | null> {
  if (isDemoMode) {
    return session?.user ? getDemoProfile() : null;
  }

  if (!supabase || !session?.user) {
    return null;
  }

  const existingProfile = await getProfileBySession(session);
  if (existingProfile) {
    return existingProfile;
  }

  const nameFromMeta =
    typeof session.user.user_metadata?.name === "string"
      ? session.user.user_metadata.name
      : null;
  const localeFromMeta =
    session.user.user_metadata?.locale === "pt-BR" || session.user.user_metadata?.locale === "en"
      ? session.user.user_metadata.locale
      : localeFallback;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: session.user.id,
      name: nameFromMeta ?? session.user.email?.split("@")[0] ?? "Wishly",
      email: session.user.email ?? "",
      locale: localeFromMeta,
    })
    .select("*")
    .single<Profile>();

  if (error) {
    throw error;
  }

  return data;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => Promise<void>,
) {
  if (isDemoMode) {
    queueMicrotask(() => {
      void callback("INITIAL_SESSION", getDemoSession() as unknown as Session);
    });
    return { data: { subscription: { unsubscribe() {} } } };
  }

  if (!supabase) {
    return { data: { subscription: { unsubscribe() {} } } };
  }

  return supabase.auth.onAuthStateChange(callback);
}
