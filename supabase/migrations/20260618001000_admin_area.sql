create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where active = true
      and lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

alter table public.affiliate_merchants
  add column if not exists tracking_param_value text,
  add column if not exists notes text;

create table if not exists public.sponsored_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  destination_url text not null,
  merchant_id uuid references public.affiliate_merchants(id) on delete set null,
  category text,
  occasion text,
  price numeric(10, 2),
  currency text not null default 'USD',
  locale text not null default 'all' check (locale in ('en', 'pt-BR', 'all')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid,
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists sponsored_items_set_updated_at on public.sponsored_items;
create trigger sponsored_items_set_updated_at
before update on public.sponsored_items
for each row execute procedure public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.sponsored_items enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin_users_select_admin_only" on public.admin_users;
create policy "admin_users_select_admin_only"
  on public.admin_users for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "affiliate_merchants_admin_all" on public.affiliate_merchants;
create policy "affiliate_merchants_admin_all"
  on public.affiliate_merchants for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "sponsored_items_admin_all" on public.sponsored_items;
create policy "sponsored_items_admin_all"
  on public.sponsored_items for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "admin_audit_logs_admin_select" on public.admin_audit_logs;
create policy "admin_audit_logs_admin_select"
  on public.admin_audit_logs for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "admin_audit_logs_admin_insert" on public.admin_audit_logs;
create policy "admin_audit_logs_admin_insert"
  on public.admin_audit_logs for insert
  to authenticated
  with check (public.is_admin_user());

create or replace function public.upsert_affiliate_link_for_gift(p_gift_id uuid)
returns public.affiliate_links
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_gift public.gifts%rowtype;
  v_domain text;
  v_merchant public.affiliate_merchants%rowtype;
  v_tracking_value text;
  v_affiliate_url text;
  v_status text;
  v_result public.affiliate_links%rowtype;
begin
  select *
  into v_gift
  from public.gifts
  where id = p_gift_id;

  if not found then
    raise exception 'gift_not_found';
  end if;

  if v_gift.store_url is null or btrim(v_gift.store_url) = '' then
    delete from public.affiliate_links where gift_id = p_gift_id;
    return null;
  end if;

  v_domain := public.normalize_hostname(v_gift.store_url);

  select *
  into v_merchant
  from public.affiliate_merchants
  where v_domain = domain or v_domain like '%.' || domain
  order by length(domain) desc
  limit 1;

  v_affiliate_url := v_gift.store_url;
  v_status := 'fallback';

  if found then
    v_tracking_value := coalesce(v_merchant.tracking_param_value, public.get_secret_value(v_merchant.tracking_param_value_env_key));

    if v_merchant.status = 'active' and v_merchant.strategy = 'query_param' then
      if v_merchant.tracking_param_name is not null and v_tracking_value is not null then
        v_affiliate_url := v_gift.store_url ||
          case when position('?' in v_gift.store_url) > 0 then '&' else '?' end ||
          v_merchant.tracking_param_name || '=' || public.url_encode(v_tracking_value);
        v_status := 'generated';
      end if;
    elsif v_merchant.status = 'active' and v_merchant.strategy = 'deeplink_template' then
      if v_merchant.deeplink_template is not null and v_tracking_value is not null then
        v_affiliate_url := replace(
          replace(v_merchant.deeplink_template, '{url}', public.url_encode(v_gift.store_url)),
          '{tag}',
          public.url_encode(v_tracking_value)
        );
        v_status := 'generated';
      end if;
    elsif v_merchant.status = 'unsupported' or v_merchant.status = 'inactive' then
      v_status := 'failed';
    end if;
  end if;

  insert into public.affiliate_links (
    gift_id,
    original_url,
    merchant_id,
    affiliate_url,
    status
  )
  values (
    v_gift.id,
    v_gift.store_url,
    v_merchant.id,
    coalesce(v_affiliate_url, v_gift.store_url),
    case when v_status = 'failed' then 'fallback' else v_status end
  )
  on conflict (gift_id) do update
    set original_url = excluded.original_url,
        merchant_id = excluded.merchant_id,
        affiliate_url = excluded.affiliate_url,
        status = excluded.status,
        updated_at = now()
  returning *
  into v_result;

  return v_result;
end;
$$;

insert into public.admin_users (email, active)
values ('gabriel.fachini@icloud.com', true)
on conflict (email) do update
  set active = excluded.active;
