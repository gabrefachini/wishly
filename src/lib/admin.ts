import type { User } from "@supabase/supabase-js";
import { env } from "./env";
import { supabase } from "./supabase";

export function normalizeAdminEmail(email: string | null | undefined) {
  return (email || "").trim().toLowerCase();
}

export function getConfiguredAdminEmails() {
  return env.adminEmails.map(normalizeAdminEmail).filter(Boolean);
}

export function isAdminUser(user: Pick<User, "email"> | null | undefined) {
  const email = normalizeAdminEmail(user?.email);
  return Boolean(email) && getConfiguredAdminEmails().includes(email);
}

export async function getCurrentAdminUser() {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return isAdminUser(data.user) ? data.user : null;
}

export async function requireAdmin() {
  if (!supabase) {
    throw new Error("supabase_not_configured");
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("auth_required");
  }

  if (!isAdminUser(data.user)) {
    throw new Error("admin_required");
  }

  return data.user;
}
