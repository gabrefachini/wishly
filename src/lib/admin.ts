import type { User } from "@supabase/supabase-js";
import { isDemoMode } from "./env";
import { supabase } from "./supabase";
import { getDemoUser } from "../data/demoState";

export function normalizeAdminEmail(email: string | null | undefined) {
  return (email || "").trim().toLowerCase();
}

export async function isCurrentUserAdmin() {
  if (isDemoMode) {
    return true;
  }

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("is_admin_user");
  if (error) {
    throw error;
  }

  return data === true;
}

export async function getCurrentAdminUser() {
  if (isDemoMode) {
    return getDemoUser() as User;
  }

  if (!supabase) {
    return null;
  }

  const [{ data }, isAdmin] = await Promise.all([supabase.auth.getUser(), isCurrentUserAdmin()]);
  return isAdmin ? data.user : null;
}

export async function requireAdmin() {
  if (isDemoMode) {
    return getDemoUser() as User;
  }

  if (!supabase) {
    throw new Error("supabase_not_configured");
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("auth_required");
  }

  if (!(await isCurrentUserAdmin())) {
    throw new Error("admin_required");
  }

  return data.user;
}
