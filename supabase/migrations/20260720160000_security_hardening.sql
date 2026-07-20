-- Phase 1: security hardening
-- Source of truth: production audit from 2026-07-20
-- This migration is intentionally additive and idempotent.

-- Internal and trigger-only functions must never be callable as public RPCs.
revoke all on function public.get_secret_value(text) from public;
revoke all on function public.get_secret_value(text) from anon;
revoke all on function public.get_secret_value(text) from authenticated;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

revoke all on function public.sync_gift_affiliate_link() from public;
revoke all on function public.sync_gift_affiliate_link() from anon;
revoke all on function public.sync_gift_affiliate_link() from authenticated;

revoke all on function public.upsert_affiliate_link_for_gift(uuid) from public;
revoke all on function public.upsert_affiliate_link_for_gift(uuid) from anon;
revoke all on function public.upsert_affiliate_link_for_gift(uuid) from authenticated;

revoke all on function public.enforce_price_radar_limits() from public;
revoke all on function public.enforce_price_radar_limits() from anon;
revoke all on function public.enforce_price_radar_limits() from authenticated;

revoke all on function public.confirm_mock_contribution(uuid) from public;
revoke all on function public.confirm_mock_contribution(uuid) from anon;
revoke all on function public.confirm_mock_contribution(uuid) from authenticated;

-- Admin RPCs should not be anonymous and should remain authenticated only.
revoke all on function public.admin_update_affiliate_link(uuid, text, text) from anon;
revoke all on function public.list_admin_affiliate_queue() from anon;
revoke all on function public.list_admin_account_deletion_requests() from anon;
revoke all on function public.admin_process_account_deletion_request(uuid, text, text) from anon;

grant execute on function public.admin_update_affiliate_link(uuid, text, text) to authenticated;
grant execute on function public.list_admin_affiliate_queue() to authenticated;
grant execute on function public.list_admin_account_deletion_requests() to authenticated;
grant execute on function public.admin_process_account_deletion_request(uuid, text, text) to authenticated;

-- Keep public RPCs public, but do not broaden access beyond current behavior.
grant execute on function public.get_public_wishlist(text) to anon, authenticated;
grant execute on function public.reserve_public_gift(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.resolve_public_gift_redirect(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.create_public_contribution(text, uuid, text, text, text, numeric, text, text) to anon, authenticated;
grant execute on function public.get_public_contribution_checkout(uuid) to anon, authenticated;

-- Explicit search_path on mutable utility functions.
create or replace function public.generate_share_id()
returns text
language sql
set search_path = public, pg_temp
as $$
  select lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 14));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_hostname(p_url text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  host text;
begin
  if p_url is null or btrim(p_url) = '' then
    return null;
  end if;

  host := lower(split_part(split_part(regexp_replace(p_url, '^https?://', '', 'i'), '/', 1), '?', 1));
  host := split_part(host, ':', 1);

  if host like 'www.%' then
    host := substring(host from 5);
  end if;

  return nullif(host, '');
end;
$$;

create or replace function public.url_encode(p_value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(coalesce(p_value, ''), '%', '%25'),
            ' ', '%20'),
          ':', '%3A'),
        '/', '%2F'),
      '?', '%3F'),
    '=', '%3D'),
  '&', '%26');
$$;

create or replace function public.sync_collective_gift_defaults()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.purchase_type = 'individual' then
    new.funding_goal_amount := null;
    new.funding_currency := coalesce(new.currency, new.funding_currency, 'USD');
    new.funding_received_amount := 0;
    new.funding_status := 'not_started';
  else
    new.funding_currency := coalesce(new.funding_currency, new.currency, 'USD');
    if coalesce(new.funding_received_amount, 0) >= coalesce(new.funding_goal_amount, 0)
      and coalesce(new.funding_goal_amount, 0) > 0 then
      new.funding_status := 'funded';
    elsif coalesce(new.funding_received_amount, 0) > 0 then
      new.funding_status := 'active';
    elsif new.funding_status not in ('cancelled', 'funded') then
      new.funding_status := 'active';
    end if;
  end if;

  return new;
end;
$$;

-- payment_events must remain backend-only.
alter table if exists public.payment_events enable row level security;

revoke all on table public.payment_events from public;
revoke all on table public.payment_events from anon;
revoke all on table public.payment_events from authenticated;

-- Validation queries to run manually after applying:
-- 1. Which SECURITY DEFINER functions are still executable by anon/authenticated?
-- 2. Which functions still lack fixed search_path?
-- 3. Does payment_events still expose any grants to anon/authenticated?
