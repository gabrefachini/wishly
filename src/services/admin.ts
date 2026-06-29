import { isDemoMode } from "../lib/env";
import { requireAdmin } from "../lib/admin";
import { supabase } from "../lib/supabase";
import { invariantSupabase } from "../lib/http";
import {
  deleteDemoAffiliateMerchant,
  listDemoAdminAuditLogs,
  listDemoAffiliateMerchants,
  listDemoSponsoredItems,
  saveDemoAffiliateMerchant,
  saveDemoSponsoredItem,
  updateDemoSponsoredItemStatus,
} from "../data/demoState";
import type {
  AdminAuditLogRecord,
  AffiliateMerchantRecord,
  SponsoredItemRecord,
  SponsoredItemStatus,
} from "../types/domain";

type MerchantInput = {
  name: string;
  domain: string;
  status: AffiliateMerchantRecord["status"];
  strategy: AffiliateMerchantRecord["strategy"];
  deeplink_template?: string;
  tracking_param_name?: string;
  tracking_param_value_env_key?: string;
  notes?: string;
};

type SponsoredItemInput = {
  title: string;
  description?: string;
  image_url?: string;
  destination_url: string;
  merchant_id?: string;
  category?: string;
  occasion?: string;
  price?: number;
  currency: string;
  locale: SponsoredItemRecord["locale"];
  status: SponsoredItemStatus;
  priority: number;
  starts_at?: string;
  ends_at?: string;
};

async function insertAuditLog(payload: Omit<AdminAuditLogRecord, "id" | "created_at">) {
  if (isDemoMode) {
    return;
  }

  if (!supabase) {
    invariantSupabase();
  }

  const { error } = await supabase!.from("admin_audit_logs").insert(payload);
  if (error) {
    throw error;
  }
}

export async function listAffiliateMerchants() {
  if (isDemoMode) {
    await requireAdmin();
    return listDemoAffiliateMerchants();
  }

  await requireAdmin();
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("affiliate_merchants")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AffiliateMerchantRecord[];
}

export async function saveAffiliateMerchant(
  input: MerchantInput,
  existing?: AffiliateMerchantRecord | null,
) {
  if (isDemoMode) {
    await requireAdmin();
    return saveDemoAffiliateMerchant(input, existing);
  }

  const adminUser = await requireAdmin();
  if (!supabase) {
    invariantSupabase();
  }

  const payload = {
    name: input.name.trim(),
    domain: input.domain.trim().toLowerCase(),
    status: input.status,
    strategy: input.strategy,
    deeplink_template: input.deeplink_template || null,
    tracking_param_name: input.tracking_param_name || null,
    tracking_param_value_env_key: input.tracking_param_value_env_key || null,
    notes: input.notes || null,
  };

  const query = existing
    ? supabase!.from("affiliate_merchants").update(payload).eq("id", existing.id)
    : supabase!.from("affiliate_merchants").insert(payload);

  const { data, error } = await query.select("*").single<AffiliateMerchantRecord>();
  if (error) {
    throw error;
  }

  await insertAuditLog({
    admin_user_id: adminUser.id,
    admin_email: adminUser.email || "",
    action: existing ? "merchant.updated" : "merchant.created",
    entity_type: "affiliate_merchant",
    entity_id: data.id,
    before_data: existing ?? null,
    after_data: data,
  });

  return data;
}

export async function deleteAffiliateMerchant(merchant: AffiliateMerchantRecord) {
  if (isDemoMode) {
    await requireAdmin();
    deleteDemoAffiliateMerchant(merchant);
    return;
  }

  const adminUser = await requireAdmin();
  if (!supabase) {
    invariantSupabase();
  }

  const { error } = await supabase!.from("affiliate_merchants").delete().eq("id", merchant.id);
  if (error) {
    throw error;
  }

  await insertAuditLog({
    admin_user_id: adminUser.id,
    admin_email: adminUser.email || "",
    action: "merchant.deleted",
    entity_type: "affiliate_merchant",
    entity_id: merchant.id,
    before_data: merchant,
    after_data: null,
  });
}

export async function listSponsoredItems() {
  if (isDemoMode) {
    await requireAdmin();
    return listDemoSponsoredItems();
  }

  await requireAdmin();
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("sponsored_items")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SponsoredItemRecord[];
}

export async function saveSponsoredItem(
  input: SponsoredItemInput,
  existing?: SponsoredItemRecord | null,
) {
  if (isDemoMode) {
    await requireAdmin();
    return saveDemoSponsoredItem(input, existing);
  }

  const adminUser = await requireAdmin();
  if (!supabase) {
    invariantSupabase();
  }

  const payload = {
    title: input.title.trim(),
    description: input.description || null,
    image_url: input.image_url || null,
    destination_url: input.destination_url,
    merchant_id: input.merchant_id || null,
    category: input.category || null,
    occasion: input.occasion || null,
    price: input.price ?? null,
    currency: input.currency.toUpperCase(),
    locale: input.locale,
    status: input.status,
    priority: input.priority,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
  };

  const query = existing
    ? supabase!.from("sponsored_items").update(payload).eq("id", existing.id)
    : supabase!.from("sponsored_items").insert(payload);

  const { data, error } = await query.select("*").single<SponsoredItemRecord>();
  if (error) {
    throw error;
  }

  await insertAuditLog({
    admin_user_id: adminUser.id,
    admin_email: adminUser.email || "",
    action: existing ? "sponsored_item.updated" : "sponsored_item.created",
    entity_type: "sponsored_item",
    entity_id: data.id,
    before_data: existing ?? null,
    after_data: data,
  });

  return data;
}

export async function updateSponsoredItemStatus(item: SponsoredItemRecord, status: SponsoredItemStatus) {
  if (isDemoMode) {
    await requireAdmin();
    return updateDemoSponsoredItemStatus(item, status);
  }

  return saveSponsoredItem(
    {
      title: item.title,
      description: item.description || undefined,
      image_url: item.image_url || undefined,
      destination_url: item.destination_url,
      merchant_id: item.merchant_id || undefined,
      category: item.category || undefined,
      occasion: item.occasion || undefined,
      price: item.price ?? undefined,
      currency: item.currency,
      locale: item.locale,
      status,
      priority: item.priority,
      starts_at: item.starts_at || undefined,
      ends_at: item.ends_at || undefined,
    },
    item,
  );
}

export async function listAdminAuditLogs() {
  if (isDemoMode) {
    await requireAdmin();
    return listDemoAdminAuditLogs();
  }

  await requireAdmin();
  if (!supabase) {
    invariantSupabase();
  }

  const { data, error } = await supabase!
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw error;
  }

  return (data ?? []) as AdminAuditLogRecord[];
}
